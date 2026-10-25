/**
 * Student enrollments, magic-link auth helpers, schedule + amount due.
 */

import { computeProration, weekdayFromDate } from "./proration.js";

const MAGIC_TTL_MS = 48 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TIME_ZONE = "America/New_York";

const WEEKDAY_LABEL = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 32) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function zonedParts(date, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function periodKeyFromDate(date = new Date(), timeZone = TIME_ZONE) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

export function nextMonthStartIso(date = new Date(), timeZone = TIME_ZONE) {
  const p = zonedParts(date, timeZone);
  const next = new Date(Date.UTC(p.year, p.month, 1, 5, 0, 0));
  return next.toISOString();
}

export function isHoliday(dateIso, holidays, timeZone = TIME_ZONE) {
  const p = zonedParts(new Date(dateIso), timeZone);
  const key = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return (holidays || []).some(
    (h) => h.startDate && h.endDate && key >= h.startDate && key <= h.endDate
  );
}

export function holidayCovering(dateIso, holidays, timeZone = TIME_ZONE) {
  const p = zonedParts(new Date(dateIso), timeZone);
  const key = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return (holidays || []).find(
    (h) => h.startDate && h.endDate && key >= h.startDate && key <= h.endDate
  );
}

function holidayKind(holiday) {
  const title = String(holiday?.title || "");
  if (/break/i.test(title)) return "break";
  return "holiday";
}

function slotOnDay(year, month, day, slotParts) {
  for (let h = 0; h < 48; h++) {
    const candidate = new Date(
      Date.UTC(year, month - 1, day, h, slotParts.minute, 0)
    );
    const cp = zonedParts(candidate, TIME_ZONE);
    if (
      cp.year === year &&
      cp.month === month &&
      cp.day === day &&
      cp.hour === slotParts.hour &&
      cp.minute === slotParts.minute
    ) {
      return candidate;
    }
  }
  return new Date(Date.UTC(year, month - 1, day, 16, slotParts.minute, 0));
}

/**
 * Timeline of lessons + holiday/break rows for the enrolled weekday.
 * @param {number} [months] horizon (default from enrollment.scheduleMonths or 12)
 */
export function buildSchedule(enrollment, holidays = [], months) {
  const tz = TIME_ZONE;
  const horizonMonths = Math.min(
    24,
    Math.max(1, Number(months || enrollment.scheduleMonths || 12))
  );
  const slot = new Date(enrollment.slotStart);
  const slotParts = zonedParts(slot, tz);
  const weekday = WEEKDAY_LABEL[slotParts.weekday];
  const durationMs = (enrollment.durationMinutes || 45) * 60 * 1000;
  const out = [];
  // Start from the enrolled first lesson so prorated / past first dates still show
  const firstLessonMs = new Date(enrollment.slotStart).getTime();
  const walkFromMs = Number.isFinite(firstLessonMs)
    ? Math.min(firstLessonMs, Date.now())
    : Date.now();
  const cursor = new Date(walkFromMs);
  const endMs = Date.now() + horizonMonths * 31 * 24 * 60 * 60 * 1000;
  const maxDays = horizonMonths * 32 + 21;
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < maxDays; i++) {
    const probe = new Date(cursor.getTime() + i * 24 * 60 * 60 * 1000);
    if (probe.getTime() > endMs) break;
    const p = zonedParts(probe, tz);
    if (WEEKDAY_LABEL[p.weekday] !== weekday) continue;

    const start = slotOnDay(p.year, p.month, p.day, slotParts);
    // Never list before the enrolled first lesson
    if (start.getTime() < firstLessonMs - 60 * 60 * 1000) continue;

    const ended = start.getTime() + durationMs < Date.now();
    if (ended) {
      // Keep first-lesson week + recent past; drop older history
      const nearFirst =
        Math.abs(start.getTime() - firstLessonMs) < 8 * 24 * 60 * 60 * 1000;
      if (!nearFirst && start.getTime() < fourteenDaysAgo) continue;
    }

    const covering = holidayCovering(start.toISOString(), holidays, tz);
    if (covering) {
      const kind = holidayKind(covering);
      out.push({
        type: kind,
        start: start.toISOString(),
        end: new Date(start.getTime() + durationMs).toISOString(),
        title: covering.title || (kind === "break" ? "Studio break" : "Holiday"),
        note: covering.publicNote || "",
        holidayStart: covering.startDate,
        holidayEnd: covering.endDate,
        status: kind === "break" ? "break" : "holiday",
      });
      continue;
    }

    out.push({
      type: "lesson",
      start: start.toISOString(),
      end: new Date(start.getTime() + durationMs).toISOString(),
      title: "Lesson",
      status: ended ? "completed" : "scheduled",
    });
  }
  return out;
}

/**
 * Merge one-off trial (and similar) bookings into the weekly schedule timeline.
 * Does not overwrite weekly slot expansion — adds / labels trial rows.
 */
export function mergeScheduleWithBookings(schedule, enrollment, bookings = []) {
  if (!enrollment?.id) return schedule || [];
  const rows = [...(schedule || [])];
  const linked = (bookings || []).filter(
    (b) =>
      b &&
      b.enrollmentId === enrollment.id &&
      b.lessonType === "trial" &&
      b.status !== "cancelled"
  );

  for (const b of linked) {
    if (!b.start) continue;
    const startMs = new Date(b.start).getTime();
    if (Number.isNaN(startMs)) continue;
    const endIso =
      b.end ||
      new Date(
        startMs + (b.durationMinutes || enrollment.durationMinutes || 30) * 60 * 1000
      ).toISOString();
    const ended = new Date(endIso).getTime() < Date.now();
    const status =
      b.status === "completed"
        ? "completed"
        : b.status === "pending_payment"
          ? "pending_payment"
          : ended
            ? "completed"
            : "scheduled";

    const nearIdx = rows.findIndex((r) => {
      if (!r?.start) return false;
      if (r.type !== "lesson" && r.type !== "trial") return false;
      return Math.abs(new Date(r.start).getTime() - startMs) < 2 * 60 * 1000;
    });

    const trialRow = {
      type: "trial",
      start: b.start,
      end: endIso,
      title: "Trial lesson",
      status,
      bookingId: b.id,
      amountCents: typeof b.amountCents === "number" ? b.amountCents : undefined,
    };

    if (nearIdx >= 0) {
      rows[nearIdx] = { ...rows[nearIdx], ...trialRow };
    } else {
      rows.push(trialRow);
    }
  }

  rows.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  return rows;
}

/** @deprecated use buildSchedule */
export function upcomingLessons(enrollment, holidays = [], count = 8) {
  return buildSchedule(enrollment, holidays, Math.ceil(count / 4)).filter(
    (row) => row.type === "lesson"
  );
}

const MONTHLY_RATES = { 30: 16000, 45: 22000, 60: 31000 };

/**
 * Trial lesson rows for the billing table (paid, due, or waived / $0).
 */
export function buildTrialBillingItems(enrollment, payments = [], bookings = []) {
  if (!enrollment?.id) return [];
  const items = [];
  const seenBooking = new Set();

  for (const p of payments || []) {
    if (p.kind !== "trial") continue;
    if (p.status === "cancelled" || p.status === "canceled") continue;
    const waived =
      p.note === "waived" ||
      (Number(p.amountCents) === 0 && p.status === "paid");
    if (p.bookingId) seenBooking.add(p.bookingId);
    const when = p.paidAt || p.createdAt || "";
    items.push({
      periodKey: when ? String(when).slice(0, 10) : "trial",
      label: waived ? "Trial lesson (waived)" : "Trial lesson",
      amountCents: typeof p.amountCents === "number" ? p.amountCents : 0,
      status: waived
        ? "waived"
        : p.status === "paid"
          ? "paid"
          : "due",
      paidAt: p.paidAt || null,
      kind: "trial",
      note: p.note || (waived ? "waived" : ""),
    });
  }

  for (const b of bookings || []) {
    if (!b || b.lessonType !== "trial") continue;
    if (b.status === "cancelled") continue;
    const linked =
      b.enrollmentId === enrollment.id ||
      b.id === enrollment.trialBookingId ||
      ((b.email || "").toLowerCase() ===
        (enrollment.email || "").toLowerCase() &&
        !b.enrollmentId);
    if (!linked) continue;
    if (b.id && seenBooking.has(b.id)) continue;
    const waived =
      Boolean(enrollment.trialWaived) ||
      String(b.notes || "").includes("waived") ||
      (typeof b.amountCents === "number" &&
        b.amountCents === 0 &&
        b.status !== "pending_payment");
    const amountCents =
      typeof b.amountCents === "number" ? b.amountCents : waived ? 0 : 0;
    items.push({
      periodKey: b.start ? String(b.start).slice(0, 10) : "trial",
      label: waived ? "Trial lesson (waived)" : "Trial lesson",
      amountCents,
      status:
        b.status === "pending_payment"
          ? "due"
          : waived
            ? "waived"
            : b.paidAt || b.status === "scheduled" || b.status === "completed"
              ? "paid"
              : "due",
      paidAt: b.paidAt || null,
      kind: "trial",
      note: waived ? "waived" : "",
    });
  }

  items.sort((a, b) =>
    String(b.periodKey || "").localeCompare(String(a.periodKey || ""))
  );
  return items;
}

/**
 * Read-only billing line items for the portal.
 * status: paid | due | upcoming | waived
 */
export function buildBillingItems(enrollment, payments = [], monthsAhead = 12) {
  const rates = MONTHLY_RATES;
  const monthly =
    rates[enrollment.durationMinutes] || rates[45];
  const now = new Date();
  const currentKey = periodKeyFromDate(now);
  const paidThrough = enrollment.paidThroughPeriodKey || null;
  const items = [];
  const horizon = Math.min(24, Math.max(1, Number(monthsAhead) || 12));

  const p0 = zonedParts(now, TIME_ZONE);
  for (let i = 0; i < horizon; i++) {
    const y = p0.year + Math.floor((p0.month - 1 + i) / 12);
    const m = ((p0.month - 1 + i) % 12) + 1;
    const periodKey = `${y}-${String(m).padStart(2, "0")}`;
    const ledger = (payments || []).find(
      (pay) =>
        pay.periodKey === periodKey &&
        (pay.status === "paid" || pay.status === "pending")
    );

    let status = "upcoming";
    let amountCents = monthly;
    let label = "Monthly tuition";

    if (paidThrough && periodKey <= paidThrough) {
      status = "paid";
      if (ledger) amountCents = ledger.amountCents || amountCents;
    } else if (periodKey === currentKey) {
      if ((enrollment.amountDueCents || 0) > 0) {
        status = "due";
        amountCents = enrollment.amountDueCents;
        label = paidThrough
          ? "Monthly tuition"
          : enrollment.amountDueLocked
            ? "First period (custom amount)"
            : "First period (proration)";
      } else if (paidThrough === currentKey) {
        status = "paid";
      } else if (enrollment.billingMode === "auto" && enrollment.stripeSubscriptionId) {
        status = "paid";
        label = "Auto-charge (card on file)";
      } else {
        status = "upcoming";
      }
    } else if (periodKey < currentKey) {
      // Past unpaid periods — skip clutter unless ledger has them
      if (ledger?.status === "paid") {
        status = "paid";
        amountCents = ledger.amountCents || amountCents;
      } else {
        continue;
      }
    }

    if (ledger?.status === "paid") {
      status = "paid";
      amountCents = ledger.amountCents || amountCents;
    } else if (ledger?.status === "pending" && periodKey === currentKey) {
      status = "due";
    }

    items.push({
      periodKey,
      label,
      amountCents,
      status,
      paidAt: ledger?.paidAt || null,
    });
  }
  return items;
}

/** Student-portal enrollment — no Stripe IDs or internal hashes. */
export function publicEnrollment(enrollment) {
  if (!enrollment) return null;
  const billingMode = enrollment.billingMode || "unset";
  return {
    id: enrollment.id,
    email: enrollment.email,
    name: enrollment.name,
    slotStart: enrollment.slotStart,
    slotEnd: enrollment.slotEnd,
    durationMinutes: enrollment.durationMinutes,
    format: enrollment.format,
    weekday: enrollment.weekday,
    status: enrollment.status,
    billingMode,
    amountDueCents: enrollment.amountDueCents || 0,
    amountDueLocked: Boolean(enrollment.amountDueLocked),
    periodKey: enrollment.periodKey || null,
    paidThroughPeriodKey: enrollment.paidThroughPeriodKey || null,
    nextDueAt: enrollment.nextDueAt || null,
    /** True when monthly auto-charge is already on file (no Stripe id leak). */
    hasAutoBilling: Boolean(
      billingMode === "auto" && enrollment.stripeSubscriptionId
    ),
    scheduleMonths: enrollment.scheduleMonths || 12,
    policyAcceptedAt: enrollment.policyAcceptedAt || "",
  };
}

/** First-period proration summary for the portal (safe public fields). */
export function publicProrationSummary(enrollment, weeklyHours) {
  if (!enrollment || enrollment.paidThroughPeriodKey) return null;
  if ((enrollment.amountDueCents || 0) <= 0 && !enrollment.amountDueLocked) {
    return null;
  }
  const weekday =
    typeof enrollment.weekday === "number"
      ? enrollment.weekday
      : weekdayFromDate(enrollment.slotStart, TIME_ZONE);
  if (weekday == null || !enrollment.slotStart) return null;
  try {
    const proration = computeProration({
      durationMinutes: enrollment.durationMinutes,
      preferredWeekday: weekday,
      startDate: new Date(enrollment.slotStart),
      weeklyHours,
      includeToday: true,
    });
    return {
      firstLessonStart: enrollment.slotStart,
      remainingLessons: proration.remainingLessons,
      perLessonCents: proration.perLessonCents,
      calculatedCents: proration.prorateCents,
      chargedCents: enrollment.amountDueCents || 0,
      nextCycleStartIso: proration.nextCycleStartIso,
      customAmount: Boolean(enrollment.amountDueLocked),
    };
  } catch {
    return null;
  }
}

/** Payment rows for the portal — strip Stripe session / customer ids. */
export function publicPayments(payments) {
  return (payments || []).map((p) => ({
    id: p.id,
    enrollmentId: p.enrollmentId,
    kind: p.kind,
    amountCents: p.amountCents,
    status: p.status,
    periodKey: p.periodKey || null,
    paidAt: p.paidAt || null,
    createdAt: p.createdAt || null,
    note: p.note || null,
    bookingId: p.bookingId || null,
  }));
}

/**
 * Ensure amountDueCents matches current period for manual / unset enrollments.
 */
export function refreshEnrollmentDue(enrollment, weeklyHours) {
  const now = new Date();
  const periodKey = periodKeyFromDate(now);
  let next = { ...enrollment };

  if (next.billingMode === "auto" && next.stripeSubscriptionId) {
    next.amountDueCents = 0;
    next.periodKey = periodKey;
    return next;
  }

  if (next.paidThroughPeriodKey === periodKey) {
    next.amountDueCents = 0;
    next.periodKey = periodKey;
    next.nextDueAt = nextMonthStartIso(now);
    return next;
  }

  // First period or unpaid current month
  const weekday =
    typeof next.weekday === "number"
      ? next.weekday
      : weekdayFromDate(next.slotStart, TIME_ZONE);

  if (next.paidThroughPeriodKey) {
    // Subsequent months: full monthly rate
    const rates = { 30: 16000, 45: 22000, 60: 31000 };
    next.amountDueCents = rates[next.durationMinutes] || 22000;
    next.periodKey = periodKey;
    next.nextDueAt = null;
    return next;
  }

  // Never paid: proration from the enrolled first lesson (not "now"),
  // so mid-month starts keep every remaining lesson in that month.
  try {
    const firstLesson = next.slotStart ? new Date(next.slotStart) : now;
    const proration = computeProration({
      durationMinutes: next.durationMinutes,
      preferredWeekday: weekday,
      startDate: firstLesson,
      weeklyHours,
      includeToday: true,
    });
    next.periodKey = periodKey;
    next.nextDueAt = null;
    next._proration = proration;
    if (next.amountDueLocked && typeof next.amountDueCents === "number") {
      // Admin-set custom first-period amount
    } else {
      next.amountDueCents = proration.prorateCents || proration.perLessonCents;
    }
  } catch {
    if (!next.amountDueLocked) {
      next.amountDueCents = next.amountDueCents || 0;
    }
    next.periodKey = periodKey;
  }
  return next;
}

export async function issueMagicLink(enrollment) {
  const token = randomToken();
  const hash = await sha256Hex(token);
  const magicExpiresAt = new Date(Date.now() + MAGIC_TTL_MS).toISOString();
  return {
    token,
    enrollment: {
      ...enrollment,
      magicTokenHash: hash,
      magicExpiresAt,
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function issueSession(enrollment) {
  const token = randomToken();
  const hash = await sha256Hex(token);
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  return {
    token,
    enrollment: {
      ...enrollment,
      sessionTokenHash: hash,
      sessionExpiresAt,
      magicTokenHash: "",
      magicExpiresAt: "",
      updatedAt: new Date().toISOString(),
    },
  };
}

export function findEnrollmentByMagicHash(enrollments, hash) {
  const now = Date.now();
  return (enrollments || []).find(
    (e) =>
      e.magicTokenHash &&
      e.magicTokenHash === hash &&
      e.magicExpiresAt &&
      new Date(e.magicExpiresAt).getTime() > now
  );
}

export function findEnrollmentBySessionHash(enrollments, hash) {
  const now = Date.now();
  return (enrollments || []).find(
    (e) =>
      e.sessionTokenHash &&
      e.sessionTokenHash === hash &&
      e.sessionExpiresAt &&
      new Date(e.sessionExpiresAt).getTime() > now
  );
}

export function findEnrollmentByEmail(enrollments, email) {
  const norm = String(email || "")
    .trim()
    .toLowerCase();
  return (enrollments || []).find((e) => e.email === norm);
}

export { MAGIC_TTL_MS, SESSION_TTL_MS };
