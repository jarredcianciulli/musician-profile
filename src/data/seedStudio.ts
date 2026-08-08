import { AvailabilityConfig, StudioPayload } from "../types/studio";

/** Default teaching hours — Charleston (America/New_York). Editable in /admin. */
export const defaultAvailability: AvailabilityConfig = {
  timezone: "America/New_York",
  /** Fit bookings into open windows in 15-minute increments */
  slotIntervalMinutes: 15,
  durationsMinutes: [30, 45, 60],
  defaultDurationMinutes: 30,
  minLeadHours: 24,
  weeklyHours: [
    { day: 0, start: "10:00", end: "14:00", enabled: false }, // Sun
    { day: 1, start: "18:00", end: "20:00", enabled: true }, // Mon 6–8pm ET
    { day: 2, start: "15:00", end: "20:00", enabled: false }, // Tue
    { day: 3, start: "15:00", end: "20:00", enabled: false }, // Wed
    { day: 4, start: "15:00", end: "20:00", enabled: false }, // Thu
    { day: 5, start: "15:00", end: "20:00", enabled: false }, // Fri
    { day: 6, start: "08:00", end: "11:00", enabled: true }, // Sat 8–11am ET
  ],
};

/** Default studio calendar — editable in /admin */
export const seedStudio: StudioPayload = {
  updatedAt: new Date().toISOString(),
  availability: defaultAvailability,
  bookings: [],
  subscriptions: [],
  flyers: [
    {
      code: "bowan-qr-01",
      label: "Bowan Village flyer QR",
      views: 0,
      trials: 0,
      createdAt: new Date().toISOString(),
    },
    {
      code: "general",
      label: "General / untracked",
      views: 0,
      trials: 0,
      createdAt: new Date().toISOString(),
    },
  ],
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
