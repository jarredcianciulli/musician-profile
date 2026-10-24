import type { HolidayWeek } from "../types/studio";

const TZ = "America/New_York";

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
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

function dayKey(d: Date): string {
  const p = zonedParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function isHolidayCovering(isoDay: string, holidays: HolidayWeek[]): boolean {
  for (const h of holidays || []) {
    if (!h.startDate || !h.endDate) continue;
    if (isoDay >= h.startDate && isoDay <= h.endDate) return true;
  }
  return false;
}

/** Next upcoming lesson ISO from weekly slot (skips holidays when provided). */
export function nextLessonStartIso(
  slotStart: string,
  holidays: HolidayWeek[] = []
): string | null {
  if (!slotStart) return null;
  const slot = new Date(slotStart);
  if (Number.isNaN(slot.getTime())) return null;
  const slotP = zonedParts(slot);
  const targetWd = WEEKDAY[slotP.weekday];
  if (targetWd == null) return null;

  const firstMs = slot.getTime();
  const now = Date.now();
  const from = new Date(Math.max(firstMs, now - 60 * 60 * 1000));

  for (let i = 0; i < 90; i++) {
    const probe = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    const p = zonedParts(probe);
    if (WEEKDAY[p.weekday] !== targetWd) continue;
    // Build lesson at slot clock time on this calendar day (approx via UTC noon walk)
    const candidate = new Date(slot);
    // Align calendar day in TZ by searching near probe
    const dayStartGuess = Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0);
    let best: Date | null = null;
    for (let off = -36; off <= 36; off++) {
      const c = new Date(dayStartGuess + off * 60 * 60 * 1000);
      const cp = zonedParts(c);
      if (
        cp.year === p.year &&
        cp.month === p.month &&
        cp.day === p.day &&
        cp.hour === slotP.hour &&
        cp.minute === slotP.minute
      ) {
        best = c;
        break;
      }
    }
    if (!best) continue;
    if (best.getTime() < firstMs - 60 * 60 * 1000) continue;
    if (best.getTime() + 5 * 60 * 1000 < now) continue;
    const key = dayKey(best);
    if (isHolidayCovering(key, holidays)) continue;
    return best.toISOString();
  }
  return null;
}
