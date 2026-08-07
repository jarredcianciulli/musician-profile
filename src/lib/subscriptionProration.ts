/**
 * Mid-month proration for weekly lesson subscriptions (client mirror of worker).
 * Count Mon + Sat lesson days remaining in the current ET calendar month.
 */

export const SUBSCRIPTION_RATES_DOLLARS: Record<30 | 45 | 60, number> = {
  30: 160,
  45: 220,
  60: 310,
};

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
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

function countLessonDays(fromDate: Date, toDateExclusive: Date): number {
  const timeZone = "America/New_York";
  let count = 0;
  const cursor = new Date(fromDate);
  cursor.setHours(12, 0, 0, 0);

  for (let i = 0; i < 62; i++) {
    const p = zonedParts(cursor, timeZone);
    const dayNoon = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
    if (dayNoon >= toDateExclusive) break;
    const wd = WEEKDAY[p.weekday];
    if ((wd === 1 || wd === 6) && dayNoon >= fromDate && dayNoon < toDateExclusive) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export type ProrationResult = {
  durationMinutes: 30 | 45 | 60;
  monthlyRate: number;
  monthlyRateCents: number;
  lessonsInFullMonth: number;
  remainingLessons: number;
  prorateDollars: number;
  prorateCents: number;
  billingCycleAnchor: number;
  nextCycleStartIso: string;
};

export function computeProration(options: {
  durationMinutes: 30 | 45 | 60;
  startDate?: Date;
}): ProrationResult {
  const { durationMinutes, startDate = new Date() } = options;
  const rate = SUBSCRIPTION_RATES_DOLLARS[durationMinutes];
  const timeZone = "America/New_York";
  const start = new Date(startDate);
  const p = zonedParts(start, timeZone);
  const monthStart = new Date(Date.UTC(p.year, p.month - 1, 1, 5, 0, 0));
  const nextMonth = new Date(Date.UTC(p.year, p.month, 1, 5, 0, 0));

  const lessonsInFullMonth = Math.max(
    1,
    countLessonDays(monthStart, nextMonth)
  );
  const remainingLessons = countLessonDays(start, nextMonth);
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
