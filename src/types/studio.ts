export type HolidayWeek = {
  id: string;
  title: string;
  /** ISO date YYYY-MM-DD */
  startDate: string;
  /** ISO date YYYY-MM-DD */
  endDate: string;
  /** Shown publicly, e.g. "Skipped for holiday — no lessons this week" */
  publicNote: string;
  /** Sync hint for future Google Calendar integration */
  syncToGoogle: boolean;
};

export type StudioEvent = {
  id: string;
  title: string;
  /** ISO datetime or date */
  startsAt: string;
  endsAt?: string;
  venue?: string;
  description: string;
  visibility: "public" | "students_only";
  infoUrl?: string;
  syncToGoogle: boolean;
};

/** 0 = Sunday … 6 = Saturday (JS Date.getDay) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DayHours = {
  day: Weekday;
  /** HH:mm local studio time */
  start: string;
  /** HH:mm local studio time (exclusive end of last slot start+duration) */
  end: string;
  enabled: boolean;
};

export type AvailabilityConfig = {
  timezone: string;
  /** Minutes between slot starts */
  slotIntervalMinutes: number;
  /** Offered lesson lengths students can pick */
  durationsMinutes: number[];
  /** Default duration preselected in the booking form */
  defaultDurationMinutes: number;
  weeklyHours: DayHours[];
};

export type LessonBookingStatus =
  | "scheduled"
  | "cancelled"
  | "pending_payment";

/** trial = $35 intro; lesson = ongoing monthly (set up after trial) */
export type LessonType = "trial" | "lesson";

export type LessonFormat = "in_person" | "online";

export type LessonBooking = {
  id: string;
  start: string;
  end: string;
  name: string;
  email: string;
  notes?: string;
  lessonType: LessonType | string;
  /** Where the lesson happens — set at booking only */
  format?: LessonFormat;
  durationMinutes: number;
  status: LessonBookingStatus;
  createdAt: string;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
  amountCents?: number;
  paidAt?: string;
};

export type StudioSubscription = {
  id: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  email: string;
  name: string;
  durationMinutes: number;
  status: string;
  createdAt: string;
};

/** Opaque busy interval (bookings or Google Calendar free/busy) */
export type BusyInterval = {
  start: string;
  end: string;
};

export type StudioPayload = {
  holidays: HolidayWeek[];
  events: StudioEvent[];
  availability: AvailabilityConfig;
  /** Bookings are admin-visible; public slot API never returns PII */
  bookings: LessonBooking[];
  subscriptions?: StudioSubscription[];
  updatedAt: string;
};

export type TimeSlot = {
  start: string;
  end: string;
};
