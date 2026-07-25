import { AvailabilityConfig, StudioPayload } from "../types/studio";

/** Default teaching hours — Charleston (America/New_York). Editable in /admin. */
export const defaultAvailability: AvailabilityConfig = {
  timezone: "America/New_York",
  slotIntervalMinutes: 30,
  /** Public booking uses 30 only (free intro). 45/60 reserved for Stripe later. */
  durationsMinutes: [30, 45, 60],
  defaultDurationMinutes: 30,
  weeklyHours: [
    { day: 0, start: "10:00", end: "14:00", enabled: false }, // Sun
    { day: 1, start: "15:00", end: "20:00", enabled: true }, // Mon
    { day: 2, start: "15:00", end: "20:00", enabled: true },
    { day: 3, start: "15:00", end: "20:00", enabled: true },
    { day: 4, start: "15:00", end: "20:00", enabled: true },
    { day: 5, start: "15:00", end: "20:00", enabled: true },
    { day: 6, start: "09:00", end: "13:00", enabled: true }, // Sat
  ],
};

/** Default studio calendar — editable in /admin */
export const seedStudio: StudioPayload = {
  updatedAt: new Date().toISOString(),
  availability: defaultAvailability,
  bookings: [],
  holidays: [
    {
      id: "holiday-thanksgiving-2026",
      title: "Thanksgiving Week",
      startDate: "2026-11-23",
      endDate: "2026-11-29",
      publicNote: "Skipped for holiday — no lessons this week.",
      syncToGoogle: true,
    },
    {
      id: "holiday-christmas-2026",
      title: "Christmas Week",
      startDate: "2026-12-21",
      endDate: "2026-12-27",
      publicNote: "Skipped for holiday — no lessons this week.",
      syncToGoogle: true,
    },
    {
      id: "holiday-summer-2027",
      title: "Summer Studio Break",
      startDate: "2027-06-15",
      endDate: "2027-06-21",
      publicNote:
        "Skipped for holiday — week after the end-of-year performance.",
      syncToGoogle: true,
    },
  ],
  events: [
    {
      id: "event-end-of-year-2027",
      title: "End-of-Year Studio Performance",
      startsAt: "2027-06-12T18:00:00",
      venue: "TBD — Charleston, SC",
      description:
        "Students share the stage for our year-end recital. Details and call times will be shared with families.",
      visibility: "public",
      syncToGoogle: true,
    },
  ],
};
