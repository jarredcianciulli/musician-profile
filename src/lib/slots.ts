import {
  AvailabilityConfig,
  DayHours,
  HolidayWeek,
  LessonBooking,
  TimeSlot,
  Weekday,
} from "../types/studio";

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

/** Calendar date YYYY-MM-DD in a timezone */
export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatSlotDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatSlotTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour") === "24" ? "0" : get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

const WEEKDAY_MAP: Record<string, Weekday> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Approximate: build a Date for a local wall time in `timeZone`. */
function zonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  // Iterate from a UTC guess; refine with formatToParts offset.
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += target - asUtc;
  }
  return new Date(utc);
}

function hoursForDay(
  weekly: DayHours[],
  day: Weekday
): DayHours | undefined {
  return weekly.find((h) => h.day === day);
}

function isHolidayDate(dateKey: string, holidays: HolidayWeek[]): boolean {
  return holidays.some(
    (h) => dateKey >= h.startDate && dateKey <= h.endDate
  );
}

function overlaps(
  startMs: number,
  endMs: number,
  bookings: LessonBooking[]
): boolean {
  return bookings.some((b) => {
    if (b.status === "cancelled") return false;
    const bStart = new Date(b.start).getTime();
    const bEnd = new Date(b.end).getTime();
    return startMs < bEnd && endMs > bStart;
  });
}

/**
 * Generate open lesson slots from weekly hours, excluding holidays + bookings.
 */
export function generateAvailableSlots(options: {
  from: string | Date;
  to: string | Date;
  durationMinutes: number;
  availability: AvailabilityConfig;
  holidays: HolidayWeek[];
  bookings: LessonBooking[];
}): TimeSlot[] {
  const {
    durationMinutes,
    availability,
    holidays,
    bookings,
  } = options;
  const timeZone = availability.timezone || "America/New_York";
  const interval = availability.slotIntervalMinutes || 30;
  const slotMs = durationMinutes * 60 * 1000;
  const stepMs = interval * 60 * 1000;

  const fromMs = new Date(options.from).getTime();
  const toMs = new Date(options.to).getTime();
  const now = Date.now();
  const slots: TimeSlot[] = [];

  // Walk day-by-day in studio timezone
  let cursorDay = new Date(fromMs);
  // Align to noon UTC-ish then step by calendar days via timezone parts
  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const probe = new Date(fromMs + dayOffset * 24 * 60 * 60 * 1000);
    const p = zonedParts(probe, timeZone);
    const dateKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(
      p.day
    ).padStart(2, "0")}`;
    if (dateKey > dayKey(new Date(toMs).toISOString(), timeZone)) break;
    if (isHolidayDate(dateKey, holidays)) continue;

    const weekday = WEEKDAY_MAP[p.weekday];
    if (weekday === undefined) continue;
    const hours = hoursForDay(availability.weeklyHours, weekday);
    if (!hours || !hours.enabled) continue;

    const startHm = parseHm(hours.start);
    const endHm = parseHm(hours.end);
    let slotStart = zonedDateTime(
      p.year,
      p.month,
      p.day,
      startHm.h,
      startHm.m,
      timeZone
    ).getTime();
    const windowEnd = zonedDateTime(
      p.year,
      p.month,
      p.day,
      endHm.h,
      endHm.m,
      timeZone
    ).getTime();

    while (slotStart + slotMs <= windowEnd) {
      const slotEnd = slotStart + slotMs;
      if (
        slotStart >= fromMs &&
        slotEnd <= toMs &&
        slotStart >= now + 60 * 60 * 1000 && // at least 1h lead time
        !overlaps(slotStart, slotEnd, bookings)
      ) {
        slots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
        });
      }
      slotStart += stepMs;
    }

    void cursorDay;
  }

  return slots;
}

export function rangeForDays(days = 14): { from: string; to: string } {
  const from = new Date();
  from.setMinutes(0, 0, 0);
  if (from.getMinutes() > 0 || from.getSeconds() > 0) {
    from.setHours(from.getHours() + 1, 0, 0, 0);
  }
  const to = new Date(from);
  to.setDate(to.getDate() + days);
  return { from: from.toISOString(), to: to.toISOString() };
}
