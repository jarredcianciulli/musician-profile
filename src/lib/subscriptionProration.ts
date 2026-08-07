/**
 * Mid-month proration for weekly lesson subscriptions (client mirror of worker).
 *
 * Studio windows are Mon + Sat, but a subscription is ONE weekly lesson
 * (student picks a day). Without a chosen day/time we estimate remaining
 * weeks from the average of remaining Mon and Sat opportunities in ET.
 */

export const SUBSCRIPTION_RATES_DOLLARS: Record<30 | 45 | 60, number> = {
  30: 160,
  45: 220,
  60: 310,
};

const TIME_ZONE = "America/New_York";

function zonedParts(date: Date) {
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
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Studio window end hour (ET) — after this, that day no longer counts. */
function windowEndHour(weekday: number): number | null {
  if (weekday === 1) return 20; // Mon 6–8pm
  if (weekday === 6) return 11; // Sat 8–11am
  return null;
}

type DayCounts = { mondays: number; saturdays: number };

/**
 * Count remaining Mon / Sat teaching days from `from` (inclusive if the
 * day's window has not ended yet in ET) through the day before `toExclusive`.
 */
function countStudioDays(from: Date, toExclusive: Date): DayCounts {
  const start = zonedParts(from);
  const end = zonedParts(toExclusive);
  let mondays = 0;
  let saturdays = 0;

  // Iterate ET calendar days with a UTC noon probe (stable across TZ).
  let y = start.year;
  let m = start.month;
  let d = start.day;

  for (let i = 0; i < 62; i++) {
    if (y > end.year || (y === end.year && m > end.month) || (y === end.year && m === end.month && d >= end.day)) {
      break;
    }

    const probe = new Date(Date.UTC(y, m - 1, d, 16, 0, 0)); // ~noon ET
    const p = zonedParts(probe);
    const wd = WEEKDAY[p.weekday];
    const endH = windowEndHour(wd);

    if (endH !== null) {
      const isToday =
        p.year === start.year && p.month === start.month && p.day === start.day;
      const stillOpen =
        !isToday ||
        start.hour < endH ||
        (start.hour === endH && start.minute === 0);

      if (stillOpen) {
        if (wd === 1) mondays += 1;
        if (wd === 6) saturdays += 1;
      }
    }

    // next calendar day
    const next = new Date(Date.UTC(y, m - 1, d + 1, 16, 0, 0));
    const np = zonedParts(next);
    y = np.year;
    m = np.month;
    d = np.day;
  }

  return { mondays, saturdays };
}

/** Weekly estimate when the student has not picked Mon vs Sat yet. */
function weeklyEstimate({ mondays, saturdays }: DayCounts): number {
  if (mondays === 0) return saturdays;
  if (saturdays === 0) return mondays;
  return Math.round((mondays + saturdays) / 2);
}

export type ProrationResult = {
  durationMinutes: 30 | 45 | 60;
  monthlyRate: number;
  monthlyRateCents: number;
  lessonsInFullMonth: number;
  remainingLessons: number;
  remainingMondays: number;
  remainingSaturdays: number;
  prorateDollars: number;
  prorateCents: number;
  billingCycleAnchor: number;
  nextCycleStartIso: string;
};

export function computeProration(options: {
  durationMinutes: 30 | 45 | 60;
  /** Preferred weekly day once known: 1 = Mon, 6 = Sat */
  preferredWeekday?: 1 | 6;
  startDate?: Date;
}): ProrationResult {
  const { durationMinutes, preferredWeekday, startDate = new Date() } = options;
  const rate = SUBSCRIPTION_RATES_DOLLARS[durationMinutes];
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

  const remainingLessons = preferredWeekday === 1
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
