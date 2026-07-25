import {
  AvailabilityConfig,
  LessonBooking,
  TimeSlot,
} from "../types/studio";
import {
  PUBLIC_BOOKING_COPY,
  PUBLIC_LESSON_TYPE,
  PUBLIC_TRIAL_MINUTES,
} from "./bookingPolicy";
import { normalizeAvailability, normalizeStudioPayload } from "./normalizeStudio";
import { getAdminToken, loadStudio, newId, saveStudio } from "./studioApi";
import {
  dayKey,
  formatSlotDay,
  formatSlotTime,
  generateAvailableSlots,
  rangeForDays,
} from "./slots";

export { dayKey, formatSlotDay, formatSlotTime };

const apiBase = (process.env.REACT_APP_STUDIO_API || "").replace(/\/$/, "");

export async function fetchAvailableSlots(options?: {
  durationMinutes?: number;
  days?: number;
}): Promise<{ slots: TimeSlot[]; availability: AvailabilityConfig }> {
  // Public calendar is always free-intro length for now.
  const durationMinutes = PUBLIC_TRIAL_MINUTES;
  void options?.durationMinutes;
  const days = options?.days ?? 14;
  const { from, to } = rangeForDays(days);

  if (apiBase) {
    const params = new URLSearchParams({
      from,
      to,
      durationMinutes: String(durationMinutes),
    });
    const res = await fetch(`${apiBase}/studio/booking/slots?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Could not load available times.");
    }
    return {
      slots: data.slots || [],
      availability: normalizeAvailability({
        ...data.availability,
        defaultDurationMinutes: PUBLIC_TRIAL_MINUTES,
        durationsMinutes: [PUBLIC_TRIAL_MINUTES],
      }),
    };
  }

  const studio = normalizeStudioPayload(await loadStudio());
  const slots = generateAvailableSlots({
    from,
    to,
    durationMinutes,
    availability: studio.availability,
    holidays: studio.holidays,
    bookings: studio.bookings,
  });
  return {
    slots,
    availability: {
      ...studio.availability,
      defaultDurationMinutes: PUBLIC_TRIAL_MINUTES,
      durationsMinutes: [PUBLIC_TRIAL_MINUTES],
    },
  };
}

export type CreateBookingInput = {
  start: string;
  end: string;
  name: string;
  email: string;
  notes?: string;
  durationMinutes: number;
  lessonType?: string;
};

export type CreateBookingResult = {
  booking: LessonBooking;
  email?: { ok: boolean; error?: string };
};

export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const lessonType = input.lessonType || PUBLIC_LESSON_TYPE;
  const durationMinutes = Number(input.durationMinutes);

  if (lessonType === "lesson") {
    throw new Error(PUBLIC_BOOKING_COPY.paidComingSoon);
  }
  if (
    lessonType !== PUBLIC_LESSON_TYPE ||
    durationMinutes !== PUBLIC_TRIAL_MINUTES
  ) {
    throw new Error(
      "Only free 30-minute intro lessons are bookable online right now."
    );
  }

  const payload = {
    ...input,
    lessonType: PUBLIC_LESSON_TYPE,
    durationMinutes: PUBLIC_TRIAL_MINUTES,
  };

  if (apiBase) {
    const res = await fetch(`${apiBase}/studio/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Booking failed. Please try another time.");
    }
    return data as CreateBookingResult;
  }

  const studio = normalizeStudioPayload(
    await loadStudio({ includePrivate: true })
  );
  const emailNorm = input.email.trim().toLowerCase();

  const hasTrial = studio.bookings.some(
    (b) =>
      b.email === emailNorm &&
      b.lessonType === PUBLIC_LESSON_TYPE &&
      b.status !== "cancelled"
  );
  if (hasTrial) {
    throw new Error(PUBLIC_BOOKING_COPY.alreadyBookedTrial);
  }

  const open = generateAvailableSlots({
    from: input.start,
    to: new Date(new Date(input.end).getTime() + 1000).toISOString(),
    durationMinutes: PUBLIC_TRIAL_MINUTES,
    availability: studio.availability,
    holidays: studio.holidays,
    bookings: studio.bookings,
  });
  const stillOpen = open.some((s) => s.start === input.start);
  if (!stillOpen) {
    throw new Error("That time was just taken. Please pick another slot.");
  }

  const booking: LessonBooking = {
    id: newId("booking"),
    start: input.start,
    end: input.end,
    name: input.name.trim(),
    email: emailNorm,
    notes: input.notes?.trim() || "",
    lessonType: PUBLIC_LESSON_TYPE,
    durationMinutes: PUBLIC_TRIAL_MINUTES,
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };

  await saveStudio({
    ...studio,
    bookings: [...studio.bookings, booking],
  });

  return { booking, email: { ok: true } };
}

export async function listBookingsAdmin(): Promise<LessonBooking[]> {
  if (apiBase) {
    const token = getAdminToken();
    const res = await fetch(`${apiBase}/studio/booking`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.bookings || [];
  }
  const studio = normalizeStudioPayload(
    await loadStudio({ includePrivate: true })
  );
  return studio.bookings
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start));
}
