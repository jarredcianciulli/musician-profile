import { generateAvailableSlots } from "./slots.js";

const STORE_KEY = "studio_payload_v2";

/** Public online booking: free 30-min intro only (Stripe/paid next). */
const PUBLIC_TRIAL_MINUTES = 30;
const PUBLIC_LESSON_TYPE = "trial";

const defaultAvailability = {
  timezone: "America/New_York",
  slotIntervalMinutes: 30,
  // 45/60 kept for admin / future paid Checkout; public API forces 30.
  durationsMinutes: [30, 45, 60],
  defaultDurationMinutes: 30,
  weeklyHours: [
    { day: 0, start: "10:00", end: "14:00", enabled: false },
    { day: 1, start: "15:00", end: "20:00", enabled: true },
    { day: 2, start: "15:00", end: "20:00", enabled: true },
    { day: 3, start: "15:00", end: "20:00", enabled: true },
    { day: 4, start: "15:00", end: "20:00", enabled: true },
    { day: 5, start: "15:00", end: "20:00", enabled: true },
    { day: 6, start: "09:00", end: "13:00", enabled: true },
  ],
};

const seed = {
  updatedAt: new Date().toISOString(),
  availability: defaultAvailability,
  bookings: [],
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

const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

async function readPayload(env) {
  if (!env.STUDIO_KV) return structuredClone(seed);
  const stored = await env.STUDIO_KV.get(STORE_KEY, "json");
  if (stored) return normalizePayload(stored);
  // Migrate v1 if present
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
    // Never expose booking PII publicly
  };
}

export default {
  async fetch(request, env) {
    const origin = env.WEBSITE_DOMAIN || "*";
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const route = path.startsWith("/studio") ? path : `/studio${path}`;

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
        // Preserve bookings unless admin explicitly sends them
        bookings: Array.isArray(body.bookings) ? body.bookings : current.bookings,
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

    // --- Booking: public slots (free 30-min intro only) ---
    if (request.method === "GET" && route === "/studio/booking/slots") {
      const payload = await readPayload(env);
      // Ignore client duration — public calendar is trial-length only for now.
      const durationMinutes = PUBLIC_TRIAL_MINUTES;
      const from =
        url.searchParams.get("from") || new Date().toISOString();
      const toDefault = new Date();
      toDefault.setDate(toDefault.getDate() + 14);
      const to = url.searchParams.get("to") || toDefault.toISOString();

      const slots = generateAvailableSlots({
        from,
        to,
        durationMinutes,
        availability: payload.availability,
        holidays: payload.holidays,
        bookings: payload.bookings,
      });

      const availability = {
        ...publicStudio(payload).availability,
        defaultDurationMinutes: PUBLIC_TRIAL_MINUTES,
        durationsMinutes: [PUBLIC_TRIAL_MINUTES],
      };

      return json({ slots, availability }, 200, origin);
    }

    // --- Booking: create (public = free trial only; paid → Stripe later) ---
    if (request.method === "POST" && route === "/studio/booking") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400, origin);
      }

      const { start, end, name, email, notes = "" } = body || {};
      const lessonType = String(body?.lessonType || PUBLIC_LESSON_TYPE);
      const durationMinutes = Number(body?.durationMinutes || PUBLIC_TRIAL_MINUTES);

      if (!start || !end || !name?.trim() || !email?.trim()) {
        return json(
          { error: "Name, email, start, and end are required." },
          400,
          origin
        );
      }

      // Paid path stub — Stripe Checkout next phase
      if (lessonType === "lesson") {
        return json(
          {
            error:
              "Paid lessons will check out through Stripe soon. Book a free 30-minute intro for now.",
          },
          501,
          origin
        );
      }

      if (
        lessonType !== PUBLIC_LESSON_TYPE ||
        durationMinutes !== PUBLIC_TRIAL_MINUTES
      ) {
        return json(
          {
            error:
              "Only free 30-minute intro lessons are bookable online right now.",
          },
          400,
          origin
        );
      }

      const payload = await readPayload(env);
      const emailNorm = String(email).trim().toLowerCase();

      const hasTrial = (payload.bookings || []).some(
        (b) =>
          b.email === emailNorm &&
          b.lessonType === PUBLIC_LESSON_TYPE &&
          b.status !== "cancelled"
      );
      if (hasTrial) {
        return json(
          {
            error:
              "This email already has a free intro booked. Use Contact if you need to reschedule.",
          },
          409,
          origin
        );
      }

      const open = generateAvailableSlots({
        from: start,
        to: new Date(new Date(end).getTime() + 1000).toISOString(),
        durationMinutes: PUBLIC_TRIAL_MINUTES,
        availability: payload.availability,
        holidays: payload.holidays,
        bookings: payload.bookings,
      });

      if (!open.some((s) => s.start === start)) {
        return json(
          { error: "That time was just taken. Please pick another slot." },
          409,
          origin
        );
      }

      const booking = {
        id: newId("booking"),
        start,
        end,
        name: String(name).trim(),
        email: emailNorm,
        notes: String(notes || "").trim(),
        lessonType: PUBLIC_LESSON_TYPE,
        durationMinutes: PUBLIC_TRIAL_MINUTES,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };

      const next = {
        ...payload,
        bookings: [...payload.bookings, booking],
        updatedAt: new Date().toISOString(),
      };

      try {
        await writePayload(env, next);
      } catch (error) {
        return json(
          { error: error.message || "Failed to save booking" },
          500,
          origin
        );
      }

      // Brevo confirmation can hook here (Phase 2b)
      return json({ booking, email: { ok: true } }, 201, origin);
    }

    // --- Booking: admin list ---
    if (request.method === "GET" && route === "/studio/booking") {
      const token = getBearer(request);
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      const payload = await readPayload(env);
      const bookings = (payload.bookings || [])
        .filter((b) => b.status !== "cancelled")
        .sort((a, b) => a.start.localeCompare(b.start));
      return json({ bookings }, 200, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
