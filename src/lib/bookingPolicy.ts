/**
 * Public pricing & trial policy for Battery String Studio.
 */
export const PUBLIC_TRIAL_MINUTES = 30;
export const PUBLIC_TRIAL_PRICE = 35;
export const PUBLIC_LESSON_TYPE = "trial" as const;

export type PublicLessonType = typeof PUBLIC_LESSON_TYPE;
export type LessonType = "trial" | "lesson";
export type LessonFormat = "in_person" | "online";

export const SUBSCRIPTION_DURATIONS = [30, 45, 60] as const;
export type SubscriptionDuration = (typeof SUBSCRIPTION_DURATIONS)[number];

export const SUBSCRIPTION_MONTHLY_RATES: Record<SubscriptionDuration, number> =
  {
    30: 160,
    45: 220,
    60: 310,
  };

export const DEFAULT_SUBSCRIPTION_MINUTES: SubscriptionDuration = 45;

export const PUBLIC_BOOKING_COPY = {
  cta: "Book your trial",
  modalTitle: "Book your trial",
  modalSubtitle: "$35 · 30 minutes — meet me and try it out, no commitment",
  confirm: "Pay $35 & book",
  successTitle: "You're booked",
  trialBannerTitle: "$35 trial · 30 minutes",
  trialBannerBody:
    "Meet me and try it out — no commitment. You'll pay $35 securely with Stripe to confirm your time.",
  formatSameRate: "Same rate either way.",
  formatInPerson: "At my home studio (Bowan Village area)",
  formatOnline: "Online (video lesson)",
  subscriptionHeader:
    "Weekly lessons, billed monthly. One simple rate that covers all your lessons for the year, holidays already accounted for.",
  subscriptionFootnote:
    "Same price every month, no surprise bills, six weeks off built in for holidays and summer.",
  paidComingSoon:
    "Ongoing monthly lessons are set up after your trial. Book a $35 trial to get started.",
  alreadyBookedTrial:
    "This email already has a trial booked. Use Contact if you need to reschedule.",
  confirmationOnline:
    "You'll get a video link by email before the lesson.",
  confirmationInPersonArea: "Bowan Village area",
  confirmationPayment: "Your $35 trial payment is confirmed.",
  stepFormat: "Format",
  stepTime: "Time",
  stepDetails: "Details",
  stepReview: "Pay",
} as const;
