import { generateAvailableSlots } from "./slots.js";
import {
  fetchGoogleBusyIntervals,
  googleCalendarConfigured,
} from "./googleCalendar.js";
import {
  createTrialCheckoutSession,
  createSubscriptionCheckoutSession,
  retrieveCheckoutSession,
  verifyStripeWebhook,
} from "./stripe.js";
import { computeProration } from "./proration.js";

const STORE_KEY = "studio_payload_v2";

const PUBLIC_TRIAL_MINUTES = 30;
const PUBLIC_TRIAL_PRICE_CENTS = 3500;
const PUBLIC_LESSON_TYPE = "trial";
const PUBLIC_FORMATS = new Set(["in_person", "online"]);

const defaultAvailability = {
  timezone: "America/New_York",
  slotIntervalMinutes: 15,
  durationsMinutes: [30, 45, 60],
  defaultDurationMinutes: 30,
  weeklyHours: [
    { day: 0, start: "10:00", end: "14:00", enabled: false },
    { day: 1, start: "18:00", end: "20:00", enabled: true },
    { day: 2, start: "15:00", end: "20:00", enabled: false },
    { day: 3, start: "15:00", end: "20:00", enabled: false },
    { day: 4, start: "15:00", end: "20:00", enabled: false },
    { day: 5, start: "15:00", end: "20:00", enabled: false },
    { day: 6, start: "08:00", end: "11:00", enabled: true },
  ],
};

const seed = {
  updatedAt: new Date().toISOString(),
  availability: defaultAvailability,
  bookings: [],
  subscriptions: [],
  holidays: [
    {
      id: "holiday-thanksgiving-2026",
      title: "Thanksgiving Week",
      startDate: "2026-11-23",
      endDate: "2026-11-29",
      publicNote: "Skipped for holiday — no lessons this week.",
      syncToGoogle: true,
    },
    {
      id: "holiday-christmas-2026",
      title: "Christmas Week",
      startDate: "2026-12-21",
      endDate: "2026-12-27",
      publicNote: "Skipped for holiday — no lessons this week.",
      syncToGoogle: true,
    },
    {
      id: "holiday-summer-2027",
      title: "Summer Studio Break",
      startDate: "2027-06-15",
      endDate: "2027-06-21",
      publicNote:
        "Skipped for holiday — week after the end-of-year performance.",
      syncToGoogle: true,
    },
  ],
  events: [
    {
      id: "event-end-of-year-2027",
      title: "End-of-Year Studio Performance",
      startsAt: "2027-06-12T18:00:00",
      venue: "TBD — Charleston, SC",
      description:
        "Students share the stage for our year-end recital. Details and call times will be shared with families.",
      visibility: "public",
      syncToGoogle: true,
    },
  ],
};

function resolveCorsOrigin(request, env) {
  const reqOrigin = request.headers.get("Origin") || "";
  const allowed = String(env.CORS_ORIGINS || env.WEBSITE_DOMAIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (reqOrigin && allowed.includes(reqOrigin)) return reqOrigin;
  if (allowed.length) return allowed[0];
  return env.WEBSITE_DOMAIN || "*";
}

const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Stripe-Signature",
  "Access-Control-Allow-Credentials": "true",
  Vary: "Origin",
});

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function getBearer(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function normalizePayload(raw) {
  const base = structuredClone(seed);
  if (!raw) return base;
  return {
    holidays: Array.isArray(raw.holidays) ? raw.holidays : base.holidays,
    events: Array.isArray(raw.events) ? raw.events : base.events,
    availability: {
      ...base.availability,
      ...(raw.availability || {}),
      weeklyHours:
        raw.availability?.weeklyHours?.length
          ? raw.availability.weeklyHours
          : base.availability.weeklyHours,
    },
    bookings: Array.isArray(raw.bookings) ? raw.bookings : [],
    subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [],
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

async function readPayload(env) {
  if (!env.STUDIO_KV) return structuredClone(seed);
  const stored = await env.STUDIO_KV.get(STORE_KEY, "json");
  if (stored) return normalizePayload(stored);
  const legacy = await env.STUDIO_KV.get("studio_payload_v1", "json");
  return normalizePayload(legacy);
}

async function writePayload(env, payload) {
  if (!env.STUDIO_KV) {
    throw new Error("STUDIO_KV binding is not configured.");
  }
  await env.STUDIO_KV.put(STORE_KEY, JSON.stringify(payload));
}

function isValidPayload(payload) {
  return (
    payload &&
    Array.isArray(payload.holidays) &&
    Array.isArray(payload.events) &&
    payload.availability &&
    Array.isArray(payload.availability.weeklyHours)
  );
}

function newId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function publicStudio(payload) {
  return {
    holidays: payload.holidays,
    events: (payload.events || []).filter(
      (e) => e.visibility !== "students_only"
    ),
    availability: {
      timezone: payload.availability.timezone,
      slotIntervalMinutes: payload.availability.slotIntervalMinutes,
      durationsMinutes: payload.availability.durationsMinutes,
      defaultDurationMinutes: payload.availability.defaultDurationMinutes,
      weeklyHours: payload.availability.weeklyHours,
    },
    updatedAt: payload.updatedAt,
  };
}

function confirmationDetails(env, format) {
  if (format === "online") {
    return {
      format: "online",
      instructions: "You'll get a video link by email before the lesson.",
    };
  }
  const street = (env.STUDIO_STREET_ADDRESS || "").trim();
  return {
    format: "in_person",
    area: "Bowan Village area",
    address: street || null,
    instructions: street
      ? `Lessons are at the home studio in the Bowan Village area. Address: ${street}`
      : "Lessons are at the home studio in the Bowan Village area. The full address will arrive in your confirmation email.",
  };
}

/** Mark trial booking paid from a completed Checkout session (webhook or return URL). */
async function confirmTrialFromSession(env, payload, session) {
  const meta = session?.metadata || {};
  const bookingId = meta.bookingId || session.client_reference_id || "";
  if (!bookingId) return { payload, booking: null };

  let booking = null;
  const bookings = (payload.bookings || []).map((b) => {
    if (b.id !== bookingId) return b;
    booking = {
      ...b,
      status: "scheduled",
      stripeSessionId: session.id,
      stripePaymentIntent:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || b.stripePaymentIntent,
      paidAt: b.paidAt || new Date().toISOString(),
    };
    return booking;
  });

  if (!booking) return { payload, booking: null };

  const next = {
    ...payload,
    bookings,
    updatedAt: new Date().toISOString(),
  };
  await writePayload(env, next);
  return { payload: next, booking };
}

async function confirmSubscriptionFromSession(env, payload, session) {
  const meta = session?.metadata || {};
  if (meta.type !== "subscription") return payload;

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  const existing = (payload.subscriptions || []).find(
    (s) => s.stripeSubscriptionId && s.stripeSubscriptionId === subId
  );
  if (existing) return payload;

  const record = {
    id: newId("sub"),
    stripeSubscriptionId: subId || "",
    stripeCustomerId: customerId || "",
    email: (session.customer_email || "").toLowerCase(),
    name: meta.name || "",
    durationMinutes: Number(meta.durationMinutes || 45),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  const next = {
    ...payload,
    subscriptions: [...(payload.subscriptions || []), record],
    updatedAt: new Date().toISOString(),
  };
  await writePayload(env, next);
  return next;
}

function siteBase(env) {
  return (env.WEBSITE_DOMAIN || "https://batterystringstudio.com").replace(
    /\/$/,
    ""
  );
}

function activeTrialExists(bookings, emailNorm) {
  return (bookings || []).some(
    (b) =>
      b.email === emailNorm &&
      b.lessonType === PUBLIC_LESSON_TYPE &&
      b.status !== "cancelled"
  );
}

async function assertSlotOpen(env, payload, start, end) {
  const busyIntervals = await fetchGoogleBusyIntervals(
    env,
    start,
    new Date(new Date(end).getTime() + 1000).toISOString()
  );
  const open = generateAvailableSlots({
    from: start,
    to: new Date(new Date(end).getTime() + 1000).toISOString(),
    durationMinutes: PUBLIC_TRIAL_MINUTES,
    availability: payload.availability,
    holidays: payload.holidays,
    bookings: payload.bookings,
    busyIntervals,
  });
  return open.some((s) => s.start === start);
}

export default {
  async fetch(request, env) {
    const origin = resolveCorsOrigin(request, env);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const route = path.startsWith("/studio") ? path : `/studio${path}`;

    // Stripe webhook — no CORS origin required
    if (request.method === "POST" && route === "/studio/booking/webhook") {
      const rawBody = await request.text();
      const sig = request.headers.get("Stripe-Signature") || "";
      const ok = await verifyStripeWebhook(
        rawBody,
        sig,
        env.STRIPE_WEBHOOK_SECRET
      );
      if (!ok) {
        return json({ error: "Invalid webhook signature" }, 400, origin);
      }

      let event;
      try {
        event = JSON.parse(rawBody);
      } catch {
        return json({ error: "Invalid JSON" }, 400, origin);
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data?.object;
        const meta = session?.metadata || {};
        let payload = await readPayload(env);

        if (meta.type === "trial" || session?.client_reference_id) {
          const result = await confirmTrialFromSession(env, payload, session);
          payload = result.payload;
        }

        if (meta.type === "subscription") {
          await confirmSubscriptionFromSession(env, payload, session);
        }
      }

      return json({ received: true }, 200, origin);
    }

    if (request.method === "POST" && route === "/studio/auth") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400, origin);
      }
      const ok = Boolean(env.ADMIN_TOKEN) && body?.token === env.ADMIN_TOKEN;
      return json({ ok }, ok ? 200 : 401, origin);
    }

    if (request.method === "GET" && (route === "/studio" || route === "/studio/")) {
      const payload = await readPayload(env);
      return json(publicStudio(payload), 200, origin);
    }

    if (request.method === "GET" && route === "/studio/admin") {
      const token = getBearer(request);
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      const payload = await readPayload(env);
      return json(payload, 200, origin);
    }

    if (request.method === "PUT" && (route === "/studio" || route === "/studio/")) {
      const token = getBearer(request);
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400, origin);
      }
      const current = await readPayload(env);
      const next = normalizePayload({
        holidays: body.holidays,
        events: body.events,
        availability: body.availability || current.availability,
        bookings: Array.isArray(body.bookings) ? body.bookings : current.bookings,
        subscriptions: Array.isArray(body.subscriptions)
          ? body.subscriptions
          : current.subscriptions,
        updatedAt: new Date().toISOString(),
      });
      if (!isValidPayload(next)) {
        return json({ error: "Invalid studio payload" }, 400, origin);
      }
      try {
        await writePayload(env, next);
      } catch (error) {
        return json(
          { error: error.message || "Failed to persist studio data" },
          500,
          origin
        );
      }
      return json(next, 200, origin);
    }

    if (request.method === "GET" && route === "/studio/booking/slots") {
      const payload = await readPayload(env);
      const durationMinutes = PUBLIC_TRIAL_MINUTES;
      const from = url.searchParams.get("from") || new Date().toISOString();
      const toDefault = new Date();
      toDefault.setDate(toDefault.getDate() + 14);
      const to = url.searchParams.get("to") || toDefault.toISOString();
      const busyIntervals = await fetchGoogleBusyIntervals(env, from, to);
      const slots = generateAvailableSlots({
        from,
        to,
        durationMinutes,
        availability: payload.availability,
        holidays: payload.holidays,
        bookings: payload.bookings,
        busyIntervals,
      });
      return json(
        {
          slots,
          availability: {
            ...publicStudio(payload).availability,
            defaultDurationMinutes: PUBLIC_TRIAL_MINUTES,
            durationsMinutes: [PUBLIC_TRIAL_MINUTES],
          },
          calendarSync: googleCalendarConfigured(env),
        },
        200,
        origin
      );
    }

    // Start Stripe Checkout for $35 trial
    if (request.method === "POST" && route === "/studio/booking/checkout") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400, origin);
      }

      const { start, end, name, email, notes = "", format } = body || {};
      if (!start || !end || !name?.trim() || !email?.trim()) {
        return json(
          { error: "Name, email, start, and end are required." },
          400,
          origin
        );
      }
      if (!PUBLIC_FORMATS.has(String(format))) {
        return json(
          { error: "Choose a lesson format: at the home studio or online." },
          400,
          origin
        );
      }

      const payload = await readPayload(env);
      const emailNorm = String(email).trim().toLowerCase();
      if (activeTrialExists(payload.bookings, emailNorm)) {
        return json(
          {
            error:
              "This email already has a trial booked. Use Contact if you need to reschedule.",
          },
          409,
          origin
        );
      }

      const open = await assertSlotOpen(env, payload, start, end);
      if (!open) {
        return json(
          { error: "That time was just taken. Please pick another slot." },
          409,
          origin
        );
      }

      const bookingId = newId("booking");
      const booking = {
        id: bookingId,
        start,
        end,
        name: String(name).trim(),
        email: emailNorm,
        notes: String(notes || "").trim(),
        lessonType: PUBLIC_LESSON_TYPE,
        format: String(format),
        durationMinutes: PUBLIC_TRIAL_MINUTES,
        status: "pending_payment",
        amountCents: PUBLIC_TRIAL_PRICE_CENTS,
        createdAt: new Date().toISOString(),
      };

      try {
        await writePayload(env, {
          ...payload,
          bookings: [...payload.bookings, booking],
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        return json(
          { error: error.message || "Failed to save booking" },
          500,
          origin
        );
      }

      if (!env.STRIPE_SECRET_KEY) {
        return json(
          {
            error:
              "Stripe is not configured yet. Set STRIPE_SECRET_KEY on studio-api.",
            booking,
          },
          503,
          origin
        );
      }

      const base = siteBase(env);
      try {
        const session = await createTrialCheckoutSession(env, {
          bookingId,
          email: emailNorm,
          name: booking.name,
          successUrl: `${base}/trial?success=1&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${base}/trial?canceled=1`,
          metadata: { format: String(format) },
        });

        const fresh = await readPayload(env);
        await writePayload(env, {
          ...fresh,
          bookings: fresh.bookings.map((b) =>
            b.id === bookingId ? { ...b, stripeSessionId: session.id } : b
          ),
          updatedAt: new Date().toISOString(),
        });

        return json(
          { url: session.url, sessionId: session.id, bookingId },
          200,
          origin
        );
      } catch (error) {
        return json(
          { error: error.message || "Could not start checkout." },
          502,
          origin
        );
      }
    }

    // Confirm booking after Checkout return
    if (request.method === "GET" && route === "/studio/booking/session") {
      const sessionId = url.searchParams.get("session_id") || "";
      if (!sessionId) {
        return json({ error: "session_id required" }, 400, origin);
      }
      let payload = await readPayload(env);
      let booking = (payload.bookings || []).find(
        (b) => b.stripeSessionId === sessionId
      );

      // Webhook may lag (or be missing in the wrong Stripe mode).
      // Confirm from Stripe when the visitor lands on the success URL.
      if (!booking || booking.status !== "scheduled") {
        try {
          const session = await retrieveCheckoutSession(env, sessionId);
          const paid =
            session.payment_status === "paid" ||
            session.status === "complete";
          if (paid) {
            const result = await confirmTrialFromSession(env, payload, session);
            payload = result.payload;
            booking = result.booking;
            if (!booking) {
              booking = (payload.bookings || []).find(
                (b) =>
                  b.stripeSessionId === sessionId ||
                  b.id === (session.metadata?.bookingId || session.client_reference_id)
              );
            }
          }
        } catch (err) {
          // Fall through to existing KV lookup / 404
        }
      }

      if (!booking) {
        return json({ error: "Booking not found" }, 404, origin);
      }
      return json(
        {
          booking,
          confirmation:
            booking.status === "scheduled"
              ? confirmationDetails(env, booking.format)
              : null,
        },
        200,
        origin
      );
    }

    // Legacy direct book (no payment) — disabled when Stripe configured
    if (request.method === "POST" && route === "/studio/booking") {
      if (env.STRIPE_SECRET_KEY) {
        return json(
          {
            error:
              "Use /studio/booking/checkout to pay for your $35 trial.",
          },
          400,
          origin
        );
      }
      return json(
        {
          error:
            "Online booking requires Stripe. Configure STRIPE_SECRET_KEY or use Contact.",
        },
        503,
        origin
      );
    }

    // Subscription checkout with mid-month proration
    if (request.method === "POST" && route === "/studio/subscription/checkout") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400, origin);
      }
      const { name, email, durationMinutes, startDate } = body || {};
      const mins = Number(durationMinutes);
      if (!name?.trim() || !email?.trim() || ![30, 45, 60].includes(mins)) {
        return json(
          { error: "Name, email, and duration (30/45/60) are required." },
          400,
          origin
        );
      }
      if (!env.STRIPE_SECRET_KEY) {
        return json({ error: "Stripe is not configured." }, 503, origin);
      }

      let proration;
      try {
        proration = computeProration({
          durationMinutes: mins,
          startDate: startDate ? new Date(startDate) : new Date(),
        });
      } catch (error) {
        return json({ error: error.message }, 400, origin);
      }

      const priceEnvKey = `STRIPE_PRICE_${mins}`;
      const priceId = env[priceEnvKey] || "";
      const base = siteBase(env);

      try {
        const session = await createSubscriptionCheckoutSession(env, {
          email: String(email).trim().toLowerCase(),
          name: String(name).trim(),
          durationMinutes: mins,
          monthlyRateCents: proration.monthlyRateCents,
          prorateCents: proration.prorateCents,
          priceId: priceId || undefined,
          successUrl: `${base}/?sub=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${base}/?sub=canceled`,
          billingCycleAnchor: proration.billingCycleAnchor,
          metadata: {
            remainingLessons: String(proration.remainingLessons),
            lessonsInFullMonth: String(proration.lessonsInFullMonth),
          },
        });
        return json(
          {
            url: session.url,
            sessionId: session.id,
            proration,
          },
          200,
          origin
        );
      } catch (error) {
        return json(
          { error: error.message || "Could not start subscription checkout." },
          502,
          origin
        );
      }
    }

    if (request.method === "GET" && route === "/studio/subscription/proration") {
      const mins = Number(url.searchParams.get("durationMinutes") || 45);
      try {
        const proration = computeProration({
          durationMinutes: mins,
          startDate: url.searchParams.get("startDate")
            ? new Date(url.searchParams.get("startDate"))
            : new Date(),
        });
        return json({ proration }, 200, origin);
      } catch (error) {
        return json({ error: error.message }, 400, origin);
      }
    }

    if (request.method === "GET" && route === "/studio/booking") {
      const token = getBearer(request);
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      const payload = await readPayload(env);
      const bookings = (payload.bookings || [])
        .filter((b) => b.status !== "cancelled")
        .sort((a, b) => a.start.localeCompare(b.start));
      return json(
        { bookings, subscriptions: payload.subscriptions || [] },
        200,
        origin
      );
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
