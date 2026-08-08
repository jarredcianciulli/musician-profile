/**
 * Mid-month proration — client mirror of workers/studio-api/src/proration.js
 * First partial month = remaining lessons × locked per-lesson rate, then
 * monthly from the 1st.
 */

export const SUBSCRIPTION_RATES_DOLLARS: Record<30 | 45 | 60, number> = {
  30: 160,
  45: 220,
  60: 310,
};

/** Locked flat rates for mid-month à la carte billing (cents). */
export const PER_LESSON_CENTS: Record<30 | 45 | 60, number> = {
  30: 4200,
  45: 5700,
  60: 8100,
};

export const TEACHING_WEEKS_PER_YEAR = 46;
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

function windowEndHour(weekday: number): number | null {
  if (weekday === 1) return 20;
  if (weekday === 6) return 11;
  return null;
}

function countWeekdayOccurrences(
  from: Date,
  toExclusive: Date,
  preferredWeekday: 1 | 6
): number {
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

/** @deprecated Prefer PER_LESSON_CENTS[duration] — kept for callers that pass monthly. */
export function perLessonCents(
  durationOrMonthly: 30 | 45 | 60 | number
): number {
  if (durationOrMonthly === 30 || durationOrMonthly === 45 || durationOrMonthly === 60) {
    return PER_LESSON_CENTS[durationOrMonthly];
  }
  // Legacy monthly-dollar path — map known anchors, else derive
  if (durationOrMonthly === 160) return PER_LESSON_CENTS[30];
  if (durationOrMonthly === 220) return PER_LESSON_CENTS[45];
  if (durationOrMonthly === 310) return PER_LESSON_CENTS[60];
  return Math.round((durationOrMonthly * 12 * 100) / TEACHING_WEEKS_PER_YEAR);
}

export type ProrationResult = {
  durationMinutes: 30 | 45 | 60;
  preferredWeekday: 1 | 6;
  monthlyRate: number;
  monthlyRateCents: number;
  perLessonCents: number;
  perLessonDollars: number;
  remainingLessons: number;
  prorateDollars: number;
  prorateCents: number;
  billingCycleAnchor: number;
  nextCycleStartIso: string;
};

export function computeProration(options: {
  durationMinutes: 30 | 45 | 60;
  preferredWeekday: 1 | 6;
  startDate?: Date;
}): ProrationResult {
  const { durationMinutes, preferredWeekday, startDate = new Date() } = options;
  const rate = SUBSCRIPTION_RATES_DOLLARS[durationMinutes];
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
