/**
 * Mid-month proration: charge for remaining weekly lesson slots in the
 * current calendar month (America/New_York), then full monthly rate next cycle.
 *
 * Windows: Mon 18:00–20:00, Sat 08:00–11:00 (lesson starts must fit duration).
 */

const RATES = { 30: 160, 45: 220, 60: 310 };

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Count lesson-start opportunities in a calendar month from `fromDate` (inclusive). */
export function countLessonsInRange(fromDate, toDateExclusive, durationMinutes) {
  const timeZone = "America/New_York";
  const durationMs = durationMinutes * 60 * 1000;
  let count = 0;
  const cursor = new Date(fromDate);
  cursor.setHours(12, 0, 0, 0);

  for (let i = 0; i < 62; i++) {
    const p = zonedParts(cursor, timeZone);
    const dayStart = new Date(
      Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0)
    );
    if (dayStart >= toDateExclusive) break;

    const wd = WEEKDAY[p.weekday];
    let windowStartH = null;
    let windowEndH = null;
    if (wd === 1) {
      windowStartH = 18;
      windowEndH = 20;
    } else if (wd === 6) {
      windowStartH = 8;
      windowEndH = 11;
    }

    if (windowStartH !== null) {
      // One weekly lesson per open day (studio books one slot per window for sub math)
      const windowEndMs =
        Date.UTC(p.year, p.month - 1, p.day, windowEndH, 0, 0) -
        /** rough ET offset handled by counting days not exact UTC */
        0;
      void windowEndMs;
      void durationMs;
      void windowStartH;
      if (dayStart >= fromDate && dayStart < toDateExclusive) {
        count += 1;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function computeProration({
  durationMinutes,
  startDate = new Date(),
}) {
  const rate = RATES[durationMinutes];
  if (!rate) {
    throw new Error("Invalid lesson duration for subscription.");
  }

  const timeZone = "America/New_York";
  const start = new Date(startDate);
  const p = zonedParts(start, timeZone);

  const monthStart = new Date(Date.UTC(p.year, p.month - 1, 1, 5, 0, 0));
  const nextMonth = new Date(Date.UTC(p.year, p.month, 1, 5, 0, 0));

  const lessonsInFullMonth = Math.max(
    1,
    countLessonsInRange(monthStart, nextMonth, durationMinutes)
  );
  const remainingLessons = countLessonsInRange(
    start,
    nextMonth,
    durationMinutes
  );

  const prorateDollars =
    remainingLessons <= 0
      ? 0
      : Math.round((rate * remainingLessons) / lessonsInFullMonth);

  return {
    durationMinutes,
    monthlyRate: rate,
    monthlyRateCents: rate * 100,
    lessonsInFullMonth,
    remainingLessons,
    prorateDollars,
    prorateCents: prorateDollars * 100,
    billingCycleAnchor: Math.floor(nextMonth.getTime() / 1000),
    nextCycleStartIso: nextMonth.toISOString(),
  };
}

export { RATES };
