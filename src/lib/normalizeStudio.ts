import { defaultAvailability, seedStudio } from "../data/seedStudio";
import { AvailabilityConfig, StudioPayload } from "../types/studio";

export function normalizeAvailability(
  raw?: Partial<AvailabilityConfig> | null
): AvailabilityConfig {
  const base = defaultAvailability;
  if (!raw) return structuredClone(base);
  return {
    timezone: raw.timezone || base.timezone,
    slotIntervalMinutes: raw.slotIntervalMinutes || base.slotIntervalMinutes,
    durationsMinutes: raw.durationsMinutes?.length
      ? raw.durationsMinutes
      : base.durationsMinutes,
    defaultDurationMinutes:
      raw.defaultDurationMinutes || base.defaultDurationMinutes,
    weeklyHours: raw.weeklyHours?.length
      ? raw.weeklyHours
      : structuredClone(base.weeklyHours),
  };
}

/** Ensure older local/API payloads still work after Phase 2. */
export function normalizeStudioPayload(
  payload: Partial<StudioPayload> | null | undefined
): StudioPayload {
  const seed = structuredClone(seedStudio);
  if (!payload) return seed;
  return {
    holidays: payload.holidays || seed.holidays,
    events: payload.events || seed.events,
    availability: normalizeAvailability(payload.availability),
    bookings: Array.isArray(payload.bookings) ? payload.bookings : [],
    subscriptions: Array.isArray(payload.subscriptions)
      ? payload.subscriptions
      : [],
    updatedAt: payload.updatedAt || new Date().toISOString(),
  };
}
