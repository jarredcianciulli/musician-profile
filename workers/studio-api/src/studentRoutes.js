/**
 * Student portal + admin invite routes.
 */

import {
  createSubscriptionCheckoutSession,
  createProrationPaymentSession,
  expireCheckoutSession,
  retrieveCheckoutSession,
} from "./stripe.js";
import { computeProration, weekdayFromDate } from "./proration.js";
import { sendStudentInviteEmail, sendSubscriptionBookedEmails } from "./mailers.js";
import {
  findEnrollmentByEmail,
  findEnrollmentByMagicHash,
  findEnrollmentBySessionHash,
  issueMagicLink,
  issueSession,
  publicEnrollment,
  publicProrationSummary,
  refreshEnrollmentDue,
  sha256Hex,
  buildSchedule,
  buildBillingItems,
  periodKeyFromDate,
  nextMonthStartIso,
  publicPayments,
} from "./students.js";
import { appendReturnQuery, sanitizeReturnQuery } from "./returnQuery.js";

function newId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

/** Marketing site (emails / admin links). */
function siteBase(env) {
  return (env.WEBSITE_DOMAIN || "https://batterystringstudio.com").replace(
    /\/$/,
    ""
  );
}

/** Student portal URLs for magic links + Stripe return. */
function accountPath(env, query = "") {
  const q = !query ? "" : query.startsWith("?") ? query : `?${query}`;
  const dedicated = (env.ACCOUNT_DOMAIN || "").replace(/\/$/, "");
  if (dedicated) return `${dedicated}/account${q}`;
  return `${siteBase(env)}/account${q}`;
}

function portalPayload(enrollment, payload) {
  const months = enrollment.scheduleMonths || 12;
  const schedule = buildSchedule(enrollment, payload.holidays, months);
  const payments = (payload.payments || [])
    .filter(
      (p) =>
        p.enrollmentId === enrollment.id &&
        p.status !== "cancelled" &&
        p.status !== "canceled"
    )
    .slice(0, 40);
  return {
    enrollment: publicEnrollment(enrollment),
    schedule,
    billingItems: buildBillingItems(enrollment, payments, months),
    payments: publicPayments(payments),
    proration: publicProrationSummary(
      enrollment,
      payload.availability?.weeklyHours
    ),
  };
}

async function requireStudentSession(request, payload) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : "";
  if (!token) return null;
  const hash = await sha256Hex(token);
  return findEnrollmentBySessionHash(payload.enrollments, hash) || null;
}

function updateEnrollment(payload, enrollment) {
  const enrollments = (payload.enrollments || []).map((e) =>
    e.id === enrollment.id ? enrollment : e
  );
  return {
    ...payload,
    enrollments,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Expire any open Stripe Checkout for this enrollment and void pending payment rows
 * so a new session can be created with the current amount due.
 */
async function invalidatePendingCheckout(env, payload, enrollment) {
  const sid = enrollment.pendingCheckoutSessionId || "";
  if (sid) {
    await expireCheckoutSession(env, sid);
  }
  const payments = (payload.payments || []).map((p) => {
    if (
      p.enrollmentId === enrollment.id &&
      p.status === "pending" &&
      (!sid || p.stripeSessionId === sid || !p.stripeSessionId)
    ) {
      return {
        ...p,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      };
    }
    return p;
  });
  return {
    enrollment: {
      ...enrollment,
      pendingCheckoutSessionId: "",
      pendingCheckoutMode: "",
      updatedAt: new Date().toISOString(),
    },
    payments,
  };
}

/**
 * @returns {Response|null} null if route not handled
 */
export async function handleStudentRoutes({
  request,
  env,
  origin,
  route,
  url,
  json,
  getBearer,
  readPayload,
  writePayload,
}) {
  const adminOk = () => {
    const token = getBearer(request);
    return Boolean(env.ADMIN_TOKEN && token === env.ADMIN_TOKEN);
  };

  // ——— Admin invite ———
  if (request.method === "POST" && route === "/studio/students/invite") {
    if (!adminOk()) return json({ error: "Unauthorized" }, 401, origin);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, origin);
    }
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const mins = Number(body?.durationMinutes);
    const start = String(body?.start || "").trim();
    const end = String(body?.end || "").trim();
    const format = body?.format || "in_person";
    const billingMode =
      body?.billingMode === "auto" ? "auto" : "manual";
    let scheduleMonths = Number(body?.scheduleMonths);
    if (!Number.isFinite(scheduleMonths) || scheduleMonths < 1) {
      scheduleMonths = 12;
    }
    scheduleMonths = Math.min(24, Math.round(scheduleMonths));
    const amountDollarsRaw = body?.amountDollars;
    const hasCustomAmount =
      amountDollarsRaw !== undefined &&
      amountDollarsRaw !== null &&
      String(amountDollarsRaw).trim() !== "";
    const amountDollars = hasCustomAmount ? Number(amountDollarsRaw) : NaN;
    if (
      hasCustomAmount &&
      (!Number.isFinite(amountDollars) || amountDollars < 0 || amountDollars > 5000)
    ) {
      return json(
        { error: "amountDollars must be between 0 and 5000 when set." },
        400,
        origin
      );
    }
    if (!name || !email || !start || !end) {
      return json(
        { error: "name, email, start, and end are required." },
        400,
        origin
      );
    }
    if (![30, 45, 60].includes(mins)) {
      return json({ error: "durationMinutes must be 30, 45, or 60." }, 400, origin);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return json({ error: "Invalid start or end datetime." }, 400, origin);
    }

    let payload = await readPayload(env);
    const existing = findEnrollmentByEmail(payload.enrollments, email);
    const weekday = weekdayFromDate(startDate);
    if (weekday == null) {
      return json({ error: "Could not determine weekly day." }, 400, origin);
    }

    let enrollment = existing
      ? {
          ...existing,
          name,
          slotStart: start,
          slotEnd: end,
          durationMinutes: mins,
          format,
          weekday,
          scheduleMonths,
          // Don't demote an active Stripe subscription to manual via re-invite
          billingMode:
            existing.billingMode === "auto" && existing.stripeSubscriptionId
              ? "auto"
              : billingMode,
          status: existing.status === "active" ? "active" : "invited",
          updatedAt: new Date().toISOString(),
        }
      : {
          id: newId("enr"),
          email,
          name,
          slotStart: start,
          slotEnd: end,
          durationMinutes: mins,
          format,
          weekday,
          status: "invited",
          billingMode,
          scheduleMonths,
          amountDueCents: 0,
          periodKey: null,
          paidThroughPeriodKey: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    enrollment = refreshEnrollmentDue(
      enrollment,
      payload.availability?.weeklyHours
    );
    delete enrollment._proration;

    if (hasCustomAmount) {
      enrollment = {
        ...enrollment,
        amountDueCents: Math.round(amountDollars * 100),
        amountDueLocked: true,
        updatedAt: new Date().toISOString(),
      };
    }

    // Re-invite / amount change: drop any open Checkout at the old price
    {
      const cleared = await invalidatePendingCheckout(env, payload, enrollment);
      enrollment = cleared.enrollment;
      payload = { ...payload, payments: cleared.payments };
    }

    const issued = await issueMagicLink(enrollment);
    enrollment = issued.enrollment;

    const enrollments = existing
      ? (payload.enrollments || []).map((e) =>
          e.id === enrollment.id ? enrollment : e
        )
      : [...(payload.enrollments || []), enrollment];

    payload = {
      ...payload,
      enrollments,
      updatedAt: new Date().toISOString(),
    };
    await writePayload(env, payload);

    const magicUrl = accountPath(env, `?token=${issued.token}`);
    let emailWarning = "";
    try {
      await sendStudentInviteEmail(env, {
        name,
        email,
        magicUrl,
        billingMode: enrollment.billingMode,
      });
    } catch (err) {
      // Enrollment + link are already saved — return them so Admin can copy.
      emailWarning =
        err instanceof Error ? err.message : "Invite email failed";
      console.error("Invite email failed:", emailWarning);
    }

    const dueLabel = `$${(
      (enrollment.amountDueCents || 0) / 100
    ).toFixed((enrollment.amountDueCents || 0) % 100 === 0 ? 0 : 2)}`;
    return json(
      {
        enrollment: publicEnrollment(enrollment),
        magicUrl,
        emailWarning: emailWarning || undefined,
        summary: emailWarning
          ? `Enrollment saved for ${email}, but email failed (${emailWarning}). Copy the magic link below.`
          : `Invite sent to ${email} (${enrollment.billingMode}). Amount due now: ${dueLabel}.`,
      },
      200,
      origin
    );
  }

  if (request.method === "POST" && route === "/studio/students/set-amount-due") {
    if (!adminOk()) return json({ error: "Unauthorized" }, 401, origin);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, origin);
    }
    const enrollmentId = String(body?.enrollmentId || "").trim();
    const dollars = Number(body?.amountDollars);
    const clear = body?.clear === true;
    if (!enrollmentId) {
      return json({ error: "enrollmentId required." }, 400, origin);
    }
    let payload = await readPayload(env);
    let enrollment = (payload.enrollments || []).find(
      (e) => e.id === enrollmentId
    );
    if (!enrollment) return json({ error: "Enrollment not found" }, 404, origin);

    if (clear) {
      enrollment = {
        ...enrollment,
        amountDueLocked: false,
        updatedAt: new Date().toISOString(),
      };
      enrollment = refreshEnrollmentDue(
        enrollment,
        payload.availability?.weeklyHours
      );
      delete enrollment._proration;
    } else {
      if (!Number.isFinite(dollars) || dollars < 0 || dollars > 5000) {
        return json(
          { error: "amountDollars must be between 0 and 5000." },
          400,
          origin
        );
      }
      const cents = Math.round(dollars * 100);
      enrollment = {
        ...enrollment,
        amountDueCents: cents,
        amountDueLocked: true,
        updatedAt: new Date().toISOString(),
      };
      enrollment = refreshEnrollmentDue(
        enrollment,
        payload.availability?.weeklyHours
      );
      // refresh keeps locked amount; drop internal proration blob
      delete enrollment._proration;
    }

    // Old Stripe Checkout / pending payment rows used the previous amount
    {
      const cleared = await invalidatePendingCheckout(env, payload, enrollment);
      enrollment = cleared.enrollment;
      payload = { ...payload, payments: cleared.payments };
    }

    payload = updateEnrollment(payload, enrollment);
    await writePayload(env, payload);
    return json(
      {
        ok: true,
        enrollment: publicEnrollment(enrollment),
        proration: publicProrationSummary(
          enrollment,
          payload.availability?.weeklyHours
        ),
        pendingCheckoutCleared: true,
      },
      200,
      origin
    );
  }

  if (request.method === "POST" && route === "/studio/students/resend-link") {
    if (!adminOk()) return json({ error: "Unauthorized" }, 401, origin);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, origin);
    }
    const enrollmentId = String(body?.enrollmentId || "").trim();
    let payload = await readPayload(env);
    let enrollment = (payload.enrollments || []).find((e) => e.id === enrollmentId);
    if (!enrollment) return json({ error: "Enrollment not found" }, 404, origin);

    const issued = await issueMagicLink(enrollment);
    enrollment = issued.enrollment;
    payload = updateEnrollment(payload, enrollment);
    await writePayload(env, payload);

    const magicUrl = accountPath(env, `?token=${issued.token}`);
    try {
      await sendStudentInviteEmail(env, {
        name: enrollment.name,
        email: enrollment.email,
        magicUrl,
        billingMode: enrollment.billingMode || "manual",
      });
    } catch (err) {
      return json(
        {
          error: err instanceof Error ? err.message : "Resend failed",
          magicUrl,
        },
        502,
        origin
      );
    }
    return json({ ok: true, magicUrl }, 200, origin);
  }

  // ——— Magic link exchange ———
  if (request.method === "GET" && route === "/studio/account/session") {
    const token = url.searchParams.get("token") || "";
    if (!token) return json({ error: "token required" }, 400, origin);
    let payload = await readPayload(env);
    const hash = await sha256Hex(token);
    let enrollment = findEnrollmentByMagicHash(payload.enrollments, hash);
    if (!enrollment) {
      return json({ error: "Invalid or expired link." }, 401, origin);
    }
    const issued = await issueSession(enrollment);
    enrollment = refreshEnrollmentDue(
      issued.enrollment,
      payload.availability?.weeklyHours
    );
    delete enrollment._proration;
    payload = updateEnrollment(payload, enrollment);
    await writePayload(env, payload);

    return json(
      {
        sessionToken: issued.token,
        ...portalPayload(enrollment, payload),
      },
      200,
      origin
    );
  }

  if (request.method === "POST" && route === "/studio/account/request-link") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, origin);
    }
    const email = String(body?.email || "").trim().toLowerCase();
    // Always same response (no enumeration)
    const okResponse = json(
      {
        ok: true,
        message:
          "If that email is on file, a sign-in link is on its way.",
      },
      200,
      origin
    );
    if (!email) return okResponse;

    let payload = await readPayload(env);
    let enrollment = findEnrollmentByEmail(payload.enrollments, email);
    if (!enrollment) return okResponse;

    const issued = await issueMagicLink(enrollment);
    enrollment = issued.enrollment;
    payload = updateEnrollment(payload, enrollment);
    await writePayload(env, payload);
    const magicUrl = accountPath(env, `?token=${issued.token}`);
    try {
      await sendStudentInviteEmail(env, {
        name: enrollment.name,
        email: enrollment.email,
        magicUrl,
        billingMode: enrollment.billingMode || "manual",
      });
    } catch (err) {
      console.error("request-link email failed:", err);
    }
    return okResponse;
  }

  if (request.method === "GET" && route === "/studio/account/me") {
    let payload = await readPayload(env);
    let enrollment = await requireStudentSession(request, payload);
    if (!enrollment) return json({ error: "Unauthorized" }, 401, origin);
    enrollment = refreshEnrollmentDue(
      enrollment,
      payload.availability?.weeklyHours
    );
    delete enrollment._proration;
    payload = updateEnrollment(payload, enrollment);
    await writePayload(env, payload);
    return json(portalPayload(enrollment, payload), 200, origin);
  }

  // Confirm Checkout on return (webhook may lag) so portal hides Pay immediately.
  if (
    request.method === "GET" &&
    route === "/studio/account/checkout-session"
  ) {
    const sessionId = url.searchParams.get("session_id") || "";
    if (!sessionId) {
      return json({ error: "session_id required" }, 400, origin);
    }
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: "Stripe is not configured." }, 503, origin);
    }
    let payload = await readPayload(env);
    let enrollment = await requireStudentSession(request, payload);
    if (!enrollment) return json({ error: "Unauthorized" }, 401, origin);

    try {
      const session = await retrieveCheckoutSession(env, sessionId);
      const meta = session?.metadata || {};
      if (meta.enrollmentId && meta.enrollmentId !== enrollment.id) {
        return json({ error: "Session does not match this account." }, 403, origin);
      }
      const complete =
        session.status === "complete" ||
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required";
      if (
        complete &&
        (meta.type === "enrollment_subscription" || meta.type === "manual_due")
      ) {
        const result = await confirmEnrollmentFromSession(
          env,
          payload,
          session
        );
        if (result.enrollment) {
          payload = result.payload;
          enrollment = result.enrollment;
          await writePayload(env, payload);
        }
      }
    } catch (err) {
      console.error("Account checkout-session confirm failed:", err);
    }

    enrollment = refreshEnrollmentDue(
      enrollment,
      payload.availability?.weeklyHours
    );
    delete enrollment._proration;
    payload = updateEnrollment(payload, enrollment);
    await writePayload(env, payload);
    return json(portalPayload(enrollment, payload), 200, origin);
  }

  if (request.method === "POST" && route === "/studio/account/checkout") {
    let payload = await readPayload(env);
    let enrollment = await requireStudentSession(request, payload);
    if (!enrollment) return json({ error: "Unauthorized" }, 401, origin);
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: "Stripe is not configured." }, 503, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, origin);
    }
    const mode = body?.mode === "auto" ? "auto" : "manual";
    const returnQuery = sanitizeReturnQuery(body?.returnQuery);

    if (!enrollment.policyAcceptedAt) {
      if (!body?.policyAccepted) {
        return json(
          { error: "Please agree to the studio policy before continuing." },
          400,
          origin
        );
      }
      enrollment = {
        ...enrollment,
        policyAcceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      payload = updateEnrollment(payload, enrollment);
    }

    enrollment = refreshEnrollmentDue(
      enrollment,
      payload.availability?.weeklyHours
    );
    const prorationHint = enrollment._proration;
    delete enrollment._proration;

    // Always mint a fresh Checkout at the current amount due
    {
      const cleared = await invalidatePendingCheckout(env, payload, enrollment);
      enrollment = cleared.enrollment;
      payload = { ...payload, payments: cleared.payments };
      payload = updateEnrollment(payload, enrollment);
    }

    const successUrl = appendReturnQuery(
      accountPath(env, "?paid=1&session_id={CHECKOUT_SESSION_ID}"),
      returnQuery
    );
    const cancelUrl = appendReturnQuery(
      accountPath(env, "?canceled=1"),
      returnQuery
    );
    const mins = enrollment.durationMinutes;
    const priceId = env[`STRIPE_PRICE_${mins}`] || "";

    try {
      if (mode === "auto") {
        if (enrollment.billingMode === "auto" && enrollment.stripeSubscriptionId) {
          return json(
            { error: "Auto-charge is already set up for this account." },
            400,
            origin
          );
        }
        const weekday =
          typeof enrollment.weekday === "number"
            ? enrollment.weekday
            : weekdayFromDate(enrollment.slotStart);
        const proration =
          prorationHint ||
          computeProration({
            durationMinutes: mins,
            preferredWeekday: weekday,
            startDate: enrollment.slotStart
              ? new Date(enrollment.slotStart)
              : new Date(),
            weeklyHours: payload.availability?.weeklyHours,
            includeToday: true,
          });
        const prorateCents =
          enrollment.amountDueLocked &&
          typeof enrollment.amountDueCents === "number"
            ? enrollment.amountDueCents
            : proration.prorateCents;

        const session = await createSubscriptionCheckoutSession(env, {
          email: enrollment.email,
          name: enrollment.name,
          durationMinutes: mins,
          monthlyRateCents: proration.monthlyRateCents,
          prorateCents,
          priceId: priceId || undefined,
          successUrl,
          cancelUrl,
          billingCycleAnchor: proration.billingCycleAnchor,
          remainingLessons: proration.remainingLessons,
          nextCycleStartIso: proration.nextCycleStartIso,
          metadata: {
            type: "enrollment_subscription",
            enrollmentId: enrollment.id,
            slotStart: enrollment.slotStart,
            slotEnd: enrollment.slotEnd,
            weekday: String(weekday),
            format: enrollment.format || "in_person",
            billingMode: "auto",
            periodKey: periodKeyFromDate(),
            remainingLessons: String(proration.remainingLessons),
            policyAcceptedAt: enrollment.policyAcceptedAt || "",
          },
        });

        enrollment = {
          ...enrollment,
          pendingCheckoutSessionId: session.id,
          pendingCheckoutMode: "auto",
          updatedAt: new Date().toISOString(),
        };
        payload = updateEnrollment(payload, enrollment);
        await writePayload(env, payload);
        return json({ url: session.url, mode: "auto" }, 200, origin);
      }

      // manual — pay current amount due
      const amountDue = enrollment.amountDueCents || 0;
      if (amountDue <= 0) {
        return json(
          { error: "Nothing is due right now." },
          400,
          origin
        );
      }
      const periodKey = enrollment.periodKey || periodKeyFromDate();
      const session = await createProrationPaymentSession(env, {
        email: enrollment.email,
        name: enrollment.name,
        durationMinutes: mins,
        prorateCents: amountDue,
        successUrl,
        cancelUrl,
        metadata: {
          type: "manual_due",
          enrollmentId: enrollment.id,
          periodKey,
          billingMode: "manual",
          slotStart: enrollment.slotStart,
          slotEnd: enrollment.slotEnd,
        },
      });

      const payment = {
        id: newId("pay"),
        enrollmentId: enrollment.id,
        kind: enrollment.paidThroughPeriodKey ? "monthly" : "proration",
        amountCents: amountDue,
        status: "pending",
        stripeSessionId: session.id,
        periodKey,
        createdAt: new Date().toISOString(),
      };

      enrollment = {
        ...enrollment,
        billingMode: enrollment.billingMode === "auto" ? "auto" : "manual",
        pendingCheckoutSessionId: session.id,
        pendingCheckoutMode: "manual",
        updatedAt: new Date().toISOString(),
      };
      payload = {
        ...updateEnrollment(payload, enrollment),
        payments: [payment, ...(payload.payments || [])].slice(0, 500),
      };
      await writePayload(env, payload);
      return json({ url: session.url, mode: "manual", amountDueCents: amountDue }, 200, origin);
    } catch (err) {
      return json(
        {
          error: err instanceof Error ? err.message : "Checkout failed",
        },
        502,
        origin
      );
    }
  }

  return null;
}

/** Apply enrollment payment / subscription from completed Checkout. */
export async function confirmEnrollmentFromSession(env, payload, session) {
  const meta = session?.metadata || {};
  const type = meta.type;
  if (
    type !== "enrollment_subscription" &&
    type !== "manual_due"
  ) {
    return { payload, enrollment: null };
  }
  const enrollmentId = meta.enrollmentId || "";
  let enrollment = (payload.enrollments || []).find((e) => e.id === enrollmentId);
  if (!enrollment) return { payload, enrollment: null };

  const periodKey = meta.periodKey || periodKeyFromDate();
  const nowIso = new Date().toISOString();
  const hadPriorPaidPeriod = Boolean(enrollment.paidThroughPeriodKey);
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id || "";
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || "";

  const paymentKind =
    type === "enrollment_subscription"
      ? "subscription_setup"
      : hadPriorPaidPeriod
        ? "monthly"
        : "proration";

  if (type === "enrollment_subscription") {
    enrollment = {
      ...enrollment,
      status: "active",
      billingMode: "auto",
      stripeSubscriptionId: subId || enrollment.stripeSubscriptionId || "",
      stripeCustomerId: customerId || enrollment.stripeCustomerId || "",
      stripeSessionId: session.id,
      amountDueCents: 0,
      paidThroughPeriodKey: periodKey,
      periodKey,
      nextDueAt: nextMonthStartIso(),
      pendingCheckoutSessionId: "",
      pendingCheckoutMode: "",
      updatedAt: nowIso,
    };
  } else {
    enrollment = {
      ...enrollment,
      status: "active",
      billingMode: "manual",
      stripeCustomerId: customerId || enrollment.stripeCustomerId || "",
      stripeSessionId: session.id,
      amountDueCents: 0,
      paidThroughPeriodKey: periodKey,
      periodKey,
      nextDueAt: nextMonthStartIso(),
      pendingCheckoutSessionId: "",
      pendingCheckoutMode: "",
      updatedAt: nowIso,
    };
  }

  const payments = (payload.payments || []).map((p) =>
    p.stripeSessionId === session.id
      ? { ...p, status: "paid", paidAt: nowIso }
      : p
  );
  const hasPayment = payments.some((p) => p.stripeSessionId === session.id);
  const nextPayments = hasPayment
    ? payments
    : [
        {
          id: newId("pay"),
          enrollmentId: enrollment.id,
          kind: paymentKind,
          amountCents:
            typeof session.amount_total === "number"
              ? session.amount_total
              : 0,
          status: "paid",
          stripeSessionId: session.id,
          periodKey,
          paidAt: nowIso,
          createdAt: nowIso,
        },
        ...payments,
      ].slice(0, 500);

  let next = {
    ...payload,
    enrollments: (payload.enrollments || []).map((e) =>
      e.id === enrollment.id ? enrollment : e
    ),
    payments: nextPayments,
    updatedAt: nowIso,
  };

  // Mirror into subscriptions list for admin visibility
  const alreadySub = (next.subscriptions || []).some(
    (s) => s.enrollmentId === enrollment.id || s.email === enrollment.email
  );
  if (!alreadySub) {
    next = {
      ...next,
      subscriptions: [
        ...(next.subscriptions || []),
        {
          id: newId("sub"),
          enrollmentId: enrollment.id,
          stripeSubscriptionId: enrollment.stripeSubscriptionId || "",
          stripeCustomerId: enrollment.stripeCustomerId || "",
          stripeSessionId: session.id,
          email: enrollment.email,
          name: enrollment.name,
          durationMinutes: enrollment.durationMinutes,
          status: "active",
          billingMode: enrollment.billingMode,
          createdAt: nowIso,
          slotStart: enrollment.slotStart,
          slotEnd: enrollment.slotEnd,
          weekday: enrollment.weekday,
          format: enrollment.format,
          paidAt: nowIso,
        },
      ],
    };
  }

  try {
    await sendSubscriptionBookedEmails(env, {
      ...enrollment,
      stripeSubscriptionId: enrollment.stripeSubscriptionId || "portal",
    }, null);
  } catch (err) {
    console.error("Enrollment confirmation emails failed:", err);
  }

  return { payload: next, enrollment };
}
