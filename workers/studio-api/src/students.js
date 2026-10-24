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

/** Next N weekly lesson occurrences from enrollment slot. */
export function upcomingLessons(enrollment, holidays = [], count = 8) {
  const tz = TIME_ZONE;
  const slot = new Date(enrollment.slotStart);
  const slotParts = zonedParts(slot, tz);
  const weekday = WEEKDAY_LABEL[slotParts.weekday];
  const durationMs = (enrollment.durationMinutes || 45) * 60 * 1000;
  const out = [];
  const cursor = new Date();
  // Walk day by day up to ~4 months
  for (let i = 0; i < 130 && out.length < count; i++) {
    const probe = new Date(cursor.getTime() + i * 24 * 60 * 60 * 1000);
    const p = zonedParts(probe, tz);
    if (WEEKDAY_LABEL[p.weekday] !== weekday) continue;
    // Build ISO for this calendar day at slot time in ET via UTC noon adjust
    const approx = new Date(
      Date.UTC(p.year, p.month - 1, p.day, 16, 0, 0)
    );
    const ap = zonedParts(approx, tz);
    // Refine: create date string and parse — use slot hour/minute in TZ by offset guess
    const startGuess = new Date(
      Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0)
    );
    // Iterate hours to match target local hour/minute
    let start = null;
    for (let h = 0; h < 48; h++) {
      const candidate = new Date(
        Date.UTC(p.year, p.month - 1, p.day, h, slotParts.minute, 0)
      );
      const cp = zonedParts(candidate, tz);
      if (
        cp.year === p.year &&
        cp.month === p.month &&
        cp.day === p.day &&
        cp.hour === slotParts.hour &&
        cp.minute === slotParts.minute
      ) {
        start = candidate;
        break;
      }
    }
    if (!start) {
      start = startGuess;
    }
    if (start.getTime() + durationMs < Date.now() - 60 * 60 * 1000) {
      // skip more than ~1h past
      continue;
    }
    if (isHoliday(start.toISOString(), holidays, tz)) continue;
    out.push({
      start: start.toISOString(),
      end: new Date(start.getTime() + durationMs).toISOString(),
      status: "scheduled",
    });
  }
  return out;
}

export function publicEnrollment(enrollment) {
  if (!enrollment) return null;
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
    billingMode: enrollment.billingMode || "unset",
    amountDueCents: enrollment.amountDueCents || 0,
    periodKey: enrollment.periodKey || null,
    paidThroughPeriodKey: enrollment.paidThroughPeriodKey || null,
    nextDueAt: enrollment.nextDueAt || null,
    stripeSubscriptionId: enrollment.stripeSubscriptionId || "",
    createdAt: enrollment.createdAt,
  };
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

  // Never paid: proration from now
  try {
    const proration = computeProration({
      durationMinutes: next.durationMinutes,
      preferredWeekday: weekday,
      startDate: now,
      weeklyHours,
      includeToday: true,
    });
    next.amountDueCents = proration.prorateCents || proration.perLessonCents;
    next.periodKey = periodKey;
    next.nextDueAt = null;
    next._proration = proration;
  } catch {
    next.amountDueCents = next.amountDueCents || 0;
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
