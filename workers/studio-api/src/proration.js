/**
 * Mid-month proration: charge for remaining weekly lessons in the
 * current calendar month (America/New_York), then full monthly rate next cycle.
 *
 * Windows: Mon 18:00–20:00, Sat 08:00–11:00.
 * A subscription is ONE lesson per week (student picks a day). Without a
 * preferred day we average remaining Mon/Sat opportunities as a ballpark.
 */

const RATES = { 30: 160, 45: 220, 60: 310 };
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

function countStudioDays(from, toExclusive) {
  const start = zonedParts(from);
  const end = zonedParts(toExclusive);
  let mondays = 0;
  let saturdays = 0;

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

    if (endH !== null) {
      const isToday =
        p.year === start.year &&
        p.month === start.month &&
        p.day === start.day;
      const stillOpen =
        !isToday ||
        start.hour < endH ||
        (start.hour === endH && start.minute === 0);

      if (stillOpen) {
        if (wd === 1) mondays += 1;
        if (wd === 6) saturdays += 1;
      }
    }

    const next = new Date(Date.UTC(y, m - 1, d + 1, 16, 0, 0));
    const np = zonedParts(next);
    y = np.year;
    m = np.month;
    d = np.day;
  }

  return { mondays, saturdays };
}

function weeklyEstimate({ mondays, saturdays }) {
  if (mondays === 0) return saturdays;
  if (saturdays === 0) return mondays;
  return Math.round((mondays + saturdays) / 2);
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

  const start = new Date(startDate);
  const p = zonedParts(start);
  const monthStart = new Date(Date.UTC(p.year, p.month - 1, 1, 5, 0, 0));
  const nextMonth = new Date(Date.UTC(p.year, p.month, 1, 5, 0, 0));

  const full = countStudioDays(monthStart, nextMonth);
  const rem = countStudioDays(start, nextMonth);

  const lessonsInFullMonth = Math.max(
    1,
    preferredWeekday === 1
      ? full.mondays
      : preferredWeekday === 6
        ? full.saturdays
        : weeklyEstimate(full)
  );

  const remainingLessons =
    preferredWeekday === 1
      ? rem.mondays
      : preferredWeekday === 6
        ? rem.saturdays
        : weeklyEstimate(rem);

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
    remainingMondays: rem.mondays,
    remainingSaturdays: rem.saturdays,
    prorateDollars,
    prorateCents: prorateDollars * 100,
    billingCycleAnchor: Math.floor(nextMonth.getTime() / 1000),
    nextCycleStartIso: nextMonth.toISOString(),
  };
}

export { RATES };
