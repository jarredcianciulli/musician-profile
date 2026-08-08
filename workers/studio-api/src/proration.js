/**
 * Mid-month proration: first partial month billed per lesson at locked flat
 * rates ($42 / $57 / $81), then full monthly from the 1st.
 *
 * A subscription is ONE weekly lesson — preferredWeekday 1=Mon or 6=Sat.
 */

const RATES = { 30: 160, 45: 220, 60: 310 };
/** Locked flat rates for mid-month à la carte billing (cents). */
const PER_LESSON_CENTS = { 30: 4200, 45: 5700, 60: 8100 };
const TEACHING_WEEKS_PER_YEAR = 46; // ~52 − 6 studio-off weeks
const TIME_ZONE = "America/New_York";

function zonedParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
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

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function windowEndHour(weekday) {
  if (weekday === 1) return 20;
  if (weekday === 6) return 11;
  return null;
}

/** Count remaining Mon or Sat dates from `from` through day before `toExclusive`. */
function countWeekdayOccurrences(from, toExclusive, preferredWeekday) {
  const start = zonedParts(from);
  const end = zonedParts(toExclusive);
  let count = 0;
  let y = start.year;
  let m = start.month;
  let d = start.day;

  for (let i = 0; i < 62; i++) {
    if (
      y > end.year ||
      (y === end.year && m > end.month) ||
      (y === end.year && m === end.month && d >= end.day)
    ) {
      break;
    }

    const probe = new Date(Date.UTC(y, m - 1, d, 16, 0, 0));
    const p = zonedParts(probe);
    const wd = WEEKDAY[p.weekday];
    const endH = windowEndHour(wd);

    if (wd === preferredWeekday && endH !== null) {
      const isToday =
        p.year === start.year &&
        p.month === start.month &&
        p.day === start.day;
      const stillOpen =
        !isToday ||
        start.hour < endH ||
        (start.hour === endH && start.minute === 0);
      if (stillOpen) count += 1;
    }

    const next = new Date(Date.UTC(y, m - 1, d + 1, 16, 0, 0));
    const np = zonedParts(next);
    y = np.year;
    m = np.month;
    d = np.day;
  }

  return count;
}

export function perLessonCents(durationMinutes) {
  const locked = PER_LESSON_CENTS[durationMinutes];
  if (locked != null) return locked;
  const monthly = RATES[durationMinutes];
  if (!monthly) return 0;
  return Math.round((monthly * 12 * 100) / TEACHING_WEEKS_PER_YEAR);
}

export function computeProration({
  durationMinutes,
  preferredWeekday,
  startDate = new Date(),
}) {
  const rate = RATES[durationMinutes];
  if (!rate) {
    throw new Error("Invalid lesson duration for subscription.");
  }
  if (preferredWeekday !== 1 && preferredWeekday !== 6) {
    throw new Error("Choose a weekly lesson day (Monday or Saturday).");
  }

  const start = new Date(startDate);
  const p = zonedParts(start);
  const nextMonth = new Date(Date.UTC(p.year, p.month, 1, 5, 0, 0));

  const remainingLessons = countWeekdayOccurrences(
    start,
    nextMonth,
    preferredWeekday
  );
  const lessonCents = PER_LESSON_CENTS[durationMinutes];
  const prorateCents = remainingLessons * lessonCents;

  return {
    durationMinutes,
    preferredWeekday,
    monthlyRate: rate,
    monthlyRateCents: rate * 100,
    perLessonCents: lessonCents,
    perLessonDollars: lessonCents / 100,
    remainingLessons,
    prorateDollars: prorateCents / 100,
    prorateCents,
    billingCycleAnchor: Math.floor(nextMonth.getTime() / 1000),
    nextCycleStartIso: nextMonth.toISOString(),
  };
}

export { RATES, TEACHING_WEEKS_PER_YEAR, PER_LESSON_CENTS };
