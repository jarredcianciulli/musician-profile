/**
 * Public online booking policy (Phase: free intro only).
 * Paid 45/60 + Stripe Checkout come next; keep those lengths in admin seeds.
 */
export const PUBLIC_TRIAL_MINUTES = 30;
export const PUBLIC_LESSON_TYPE = "trial" as const;

export type PublicLessonType = typeof PUBLIC_LESSON_TYPE;
export type LessonType = "trial" | "lesson";

export const PUBLIC_BOOKING_COPY = {
  cta: "Book free intro",
  modalTitle: "Book a free intro",
  modalSubtitle: "Complimentary 30-minute lesson — no payment required",
  confirm: "Confirm free intro",
  successTitle: "You're booked",
  paidComingSoon:
    "Paid lessons will check out through Stripe soon. Book a free 30-minute intro for now.",
  alreadyBookedTrial:
    "This email already has a free intro booked. Use Contact if you need to reschedule.",
} as const;
