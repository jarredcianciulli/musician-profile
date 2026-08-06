function parseHm(hm) {
  const [h, m] = String(hm || "0:0").split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

function dayKey(iso, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function zonedParts(date, timeZone) {
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
  const get = (type) => parts.find((p) => p.type === type)?.value || "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour") === "24" ? "0" : get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function zonedDateTime(year, month, day, hour, minute, timeZone) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += target - asUtc;
  }
  return new Date(utc);
}

function isHolidayDate(dateKey, holidays) {
  return (holidays || []).some(
    (h) => dateKey >= h.startDate && dateKey <= h.endDate
  );
}

function toBusyList(bookings, extraBusy = []) {
  const fromBookings = (bookings || [])
    .filter((b) => b.status !== "cancelled")
    .map((b) => ({ start: b.start, end: b.end }));
  return [...fromBookings, ...extraBusy];
}

function overlapsBusy(startMs, endMs, busy) {
  return (busy || []).some((b) => {
    const bStart = new Date(b.start).getTime();
    const bEnd = new Date(b.end).getTime();
    return startMs < bEnd && endMs > bStart;
  });
}

export function generateAvailableSlots({
  from,
  to,
  durationMinutes,
  availability,
  holidays,
  bookings,
  busyIntervals = [],
}) {
  const timeZone = availability?.timezone || "America/New_York";
  const interval = availability?.slotIntervalMinutes || 15;
  const slotMs = durationMinutes * 60 * 1000;
  const stepMs = interval * 60 * 1000;
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const now = Date.now();
  const slots = [];
  const weekly = availability?.weeklyHours || [];
  const busy = toBusyList(bookings, busyIntervals);

  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const probe = new Date(fromMs + dayOffset * 24 * 60 * 60 * 1000);
    const p = zonedParts(probe, timeZone);
    const dateKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(
      p.day
    ).padStart(2, "0")}`;
    if (dateKey > dayKey(new Date(toMs).toISOString(), timeZone)) break;
    if (isHolidayDate(dateKey, holidays)) continue;

    const weekday = WEEKDAY_MAP[p.weekday];
    const hours = weekly.find((h) => h.day === weekday);
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
        slotStart >= now + 60 * 60 * 1000 &&
        !overlapsBusy(slotStart, slotEnd, busy)
      ) {
        slots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
        });
      }
      slotStart += stepMs;
    }
  }

  return slots;
}
