/**
 * Student portal + admin invite routes.
 */

import {
  createSubscriptionCheckoutSession,
  createProrationPaymentSession,
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
  refreshEnrollmentDue,
  sha256Hex,
  upcomingLessons,
  periodKeyFromDate,
  nextMonthStartIso,
} from "./students.js";

function newId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function siteBase(env) {
  return (env.WEBSITE_DOMAIN || "https://batterystringstudio.com").replace(
    /\/$/,
    ""
  );
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
          billingMode: "unset",
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

    const magicUrl = `${siteBase(env)}/account?token=${issued.token}`;
    try {
      await sendStudentInviteEmail(env, { name, email, magicUrl });
    } catch (err) {
      return json(
        {
          error: err instanceof Error ? err.message : "Invite email failed",
          enrollment: publicEnrollment(enrollment),
          magicUrl,
        },
        502,
        origin
      );
    }

    return json(
      {
        enrollment: publicEnrollment(enrollment),
        magicUrl,
        summary: `Invite sent to ${email}. Amount due now: $${(
          (enrollment.amountDueCents || 0) / 100
        ).toFixed((enrollment.amountDueCents || 0) % 100 === 0 ? 0 : 2)}.`,
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

    const magicUrl = `${siteBase(env)}/account?token=${issued.token}`;
    try {
      await sendStudentInviteEmail(env, {
        name: enrollment.name,
        email: enrollment.email,
        magicUrl,
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

    const schedule = upcomingLessons(enrollment, payload.holidays, 8);
    return json(
      {
        sessionToken: issued.token,
        enrollment: publicEnrollment(enrollment),
        schedule,
        payments: (payload.payments || [])
          .filter((p) => p.enrollmentId === enrollment.id)
          .slice(0, 20),
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
    const magicUrl = `${siteBase(env)}/account?token=${issued.token}`;
    try {
      await sendStudentInviteEmail(env, {
        name: enrollment.name,
        email: enrollment.email,
        magicUrl,
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
    return json(
      {
        enrollment: publicEnrollment(enrollment),
        schedule: upcomingLessons(enrollment, payload.holidays, 8),
        payments: (payload.payments || [])
          .filter((p) => p.enrollmentId === enrollment.id)
          .slice(0, 20),
      },
      200,
      origin
    );
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

    enrollment = refreshEnrollmentDue(
      enrollment,
      payload.availability?.weeklyHours
    );
    const prorationHint = enrollment._proration;
    delete enrollment._proration;

    const base = siteBase(env);
    const successUrl = `${base}/account?paid=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}/account?canceled=1`;
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
            startDate: new Date(),
            weeklyHours: payload.availability?.weeklyHours,
            includeToday: true,
          });

        const session = await createSubscriptionCheckoutSession(env, {
          email: enrollment.email,
          name: enrollment.name,
          durationMinutes: mins,
          monthlyRateCents: proration.monthlyRateCents,
          prorateCents: proration.prorateCents,
          priceId: priceId || undefined,
          successUrl,
          cancelUrl,
          billingCycleAnchor: proration.billingCycleAnchor,
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
