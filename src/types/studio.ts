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
  /** Hide slots that start sooner than this many hours from now */
  minLeadHours?: number;
  weeklyHours: DayHours[];
};

export type LessonBookingStatus =
  | "scheduled"
  | "cancelled"
  | "pending_payment"
  | "reserved";

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
  emailsSentAt?: string;
  emailError?: string;
};

export type StudioSubscription = {
  id: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripeSessionId?: string;
  email: string;
  name: string;
  durationMinutes: number;
  status: string;
  createdAt: string;
  slotStart?: string;
  slotEnd?: string;
  weekday?: number;
  format?: LessonFormat;
  policyAcceptedAt?: string;
  reservationId?: string;
  enrollmentId?: string;
  emailsSentAt?: string;
  emailError?: string;
  /** auto = Stripe subscription; manual = pay-by-link each month */
  billingMode?: "auto" | "manual" | string;
  monthlyPaymentLinkUrl?: string;
  paidAt?: string;
};

export type FlyerCampaign = {
  code: string;
  label: string;
  views: number;
  trials: number;
  lastSeenAt?: string;
  createdAt: string;
};

export type LeadStatus = "new" | "contacted" | "closed";

export type StudioLead = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  source: "subscribe_abandon" | "trial_abandon" | "lead_form" | "flyer" | string;
  status: LeadStatus;
  name?: string;
  email?: string;
  phone?: string;
  slotStart?: string;
  slotEnd?: string;
  durationMinutes?: number;
  format?: LessonFormat;
  flyer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  path?: string;
  notes?: string;
  reservationId?: string;
  bookingId?: string;
  cancelReason?: string;
};

/** Opaque busy interval (bookings or Google Calendar free/busy) */
export type BusyInterval = {
  start: string;
  end: string;
};

export type StudentBillingMode = "unset" | "auto" | "manual";

export type StudentEnrollment = {
  id: string;
  email: string;
  name: string;
  slotStart: string;
  slotEnd: string;
  durationMinutes: number;
  format?: LessonFormat;
  weekday?: number;
  status: "invited" | "active" | "cancelled" | string;
  billingMode: StudentBillingMode | string;
  amountDueCents: number;
  /** When true, amountDueCents is an admin override (not auto-recalculated). */
  amountDueLocked?: boolean;
  periodKey?: string | null;
  paidThroughPeriodKey?: string | null;
  nextDueAt?: string | null;
  /** Portal-safe flag — Stripe subscription id never leaves the API. */
  hasAutoBilling?: boolean;
  /** Admin / internal only when present on full enrollment records. */
  stripeSubscriptionId?: string;
  /** How far ahead the portal shows lessons (months). Default 12. */
  scheduleMonths?: number;
  /** ISO timestamp when student agreed to studio policy (portal or subscribe). */
  policyAcceptedAt?: string;
  /** Admin-only freeform notes (custom info widget). */
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  cancelledAt?: string;
};

export type StudentPayment = {
  id: string;
  enrollmentId: string;
  kind: "proration" | "monthly" | "subscription_setup" | string;
  amountCents: number;
  status: "pending" | "paid" | string;
  stripeSessionId?: string;
  periodKey?: string;
  paidAt?: string;
  createdAt?: string;
};

/** Outbound transactional email log (admin-visible). */
export type StudioEmailLog = {
  id: string;
  templateId: string;
  enrollmentId?: string;
  to: string;
  toName?: string;
  subject: string;
  status: "sent" | "failed" | "skipped" | string;
  error?: string;
  preview?: string;
  createdAt: string;
};

export type StudioPolicySection = {
  heading: string;
  body: string;
};

/** Versioned studio policy. `expiresAt` null means currently in force. */
export type StudioPolicyVersion = {
  id: string;
  title: string;
  /** YYYY-MM-DD — effective / start date shown publicly */
  startDate: string;
  /** YYYY-MM-DD or null — null = still in place */
  expiresAt: string | null;
  sections: StudioPolicySection[];
  createdAt?: string;
};

export type StudioPayload = {
  holidays: HolidayWeek[];
  events: StudioEvent[];
  availability: AvailabilityConfig;
  /** Bookings are admin-visible; public slot API never returns PII */
  bookings: LessonBooking[];
  subscriptions?: StudioSubscription[];
  reservations?: Array<Record<string, unknown>>;
  enrollments?: StudentEnrollment[];
  payments?: StudentPayment[];
  /** Outbound email history (invite, resend, etc.) */
  emails?: StudioEmailLog[];
  flyers?: FlyerCampaign[];
  leads?: StudioLead[];
  /** Versioned studio policies; current = expiresAt null, newest startDate */
  policies?: StudioPolicyVersion[];
  updatedAt: string;
};

export type TimeSlot = {
  start: string;
  end: string;
};
