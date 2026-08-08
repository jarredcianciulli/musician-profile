import {
  AvailabilityConfig,
  LessonBooking,
  LessonFormat,
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
import { contactInfo } from "../config/contactInfo";
import { ProrationResult } from "./subscriptionProration";
import { studioApiBase } from "./env";

export { dayKey, formatSlotDay, formatSlotTime };

const apiBase = studioApiBase();

export type BookingConfirmation = {
  format: LessonFormat;
  area?: string;
  address?: string | null;
  instructions: string;
};

export async function fetchAvailableSlots(options?: {
  durationMinutes?: number;
  days?: number;
}): Promise<{ slots: TimeSlot[]; availability: AvailabilityConfig }> {
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

export type CheckoutTrialInput = {
  start: string;
  end: string;
  name: string;
  email: string;
  notes?: string;
  format: LessonFormat;
  flyer?: string;
};

export type CheckoutTrialResult = {
  url: string;
  sessionId: string;
  bookingId: string;
};

export async function startTrialCheckout(
  input: CheckoutTrialInput
): Promise<CheckoutTrialResult> {
  if (input.format !== "in_person" && input.format !== "online") {
    throw new Error("Choose a lesson format: at the home studio or online.");
  }

  if (!apiBase) {
    // Local fallback: save pending booking and skip Stripe
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
    if (hasTrial) throw new Error(PUBLIC_BOOKING_COPY.alreadyBookedTrial);

    const open = generateAvailableSlots({
      from: input.start,
      to: new Date(new Date(input.end).getTime() + 1000).toISOString(),
      durationMinutes: PUBLIC_TRIAL_MINUTES,
      availability: studio.availability,
      holidays: studio.holidays,
      bookings: studio.bookings,
    });
    if (!open.some((s) => s.start === input.start)) {
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
      format: input.format,
      durationMinutes: PUBLIC_TRIAL_MINUTES,
      status: "scheduled",
      amountCents: 3500,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await saveStudio({
      ...studio,
      bookings: [...studio.bookings, booking],
    });
    return {
      url: `/trial?success=1&local=1&booking=${booking.id}`,
      sessionId: "local",
      bookingId: booking.id,
    };
  }

  const res = await fetch(`${apiBase}/studio/booking/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      lessonType: PUBLIC_LESSON_TYPE,
      durationMinutes: PUBLIC_TRIAL_MINUTES,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not start checkout.");
  }
  return data as CheckoutTrialResult;
}

export async function fetchBookingBySession(
  sessionId: string
): Promise<{
  booking: LessonBooking;
  confirmation: BookingConfirmation | null;
}> {
  if (!apiBase || sessionId === "local") {
    return {
      booking: {
        id: "local",
        start: "",
        end: "",
        name: "",
        email: "",
        lessonType: "trial",
        durationMinutes: 30,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      },
      confirmation: {
        format: "in_person",
        area: contactInfo.neighborhood,
        address: null,
        instructions: `Lessons are at the home studio in the ${contactInfo.neighborhood}. (Local demo — no Stripe.)`,
      },
    };
  }
  const res = await fetch(
    `${apiBase}/studio/booking/session?session_id=${encodeURIComponent(
      sessionId
    )}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not load booking.");
  }
  return data;
}

export async function startSubscriptionCheckout(input: {
  name: string;
  email: string;
  durationMinutes: 30 | 45 | 60;
  start: string;
  end: string;
  format?: LessonFormat;
  policyAccepted: boolean;
  notes?: string;
}): Promise<{ url: string; proration: ProrationResult; reservationId?: string }> {
  if (!apiBase) {
    throw new Error("Subscription checkout requires the studio API.");
  }
  const res = await fetch(`${apiBase}/studio/subscription/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not start subscription checkout.");
  }
  return data;
}

const RESERVATION_STORAGE_KEY = "bss_sub_reservation_id";
const BOOKING_STORAGE_KEY = "bss_trial_booking_id";

export function persistReservationId(id: string) {
  try {
    sessionStorage.setItem(RESERVATION_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function takeStoredReservationId(): string {
  try {
    const id = sessionStorage.getItem(RESERVATION_STORAGE_KEY) || "";
    sessionStorage.removeItem(RESERVATION_STORAGE_KEY);
    return id;
  } catch {
    return "";
  }
}

export function persistTrialBookingId(id: string) {
  try {
    sessionStorage.setItem(BOOKING_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function takeStoredTrialBookingId(): string {
  try {
    const id = sessionStorage.getItem(BOOKING_STORAGE_KEY) || "";
    sessionStorage.removeItem(BOOKING_STORAGE_KEY);
    return id;
  } catch {
    return "";
  }
}

export async function releaseSubscriptionHold(input: {
  reservationId?: string;
  sessionId?: string;
}): Promise<{ ok: boolean; released?: boolean }> {
  if (!apiBase || (!input.reservationId && !input.sessionId)) {
    return { ok: true, released: false };
  }
  const res = await fetch(`${apiBase}/studio/subscription/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not release hold.");
  }
  return data;
}

export async function releaseTrialHold(input: {
  bookingId?: string;
  sessionId?: string;
}): Promise<{ ok: boolean; released?: boolean }> {
  if (!apiBase || (!input.bookingId && !input.sessionId)) {
    return { ok: true, released: false };
  }
  const res = await fetch(`${apiBase}/studio/booking/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not release trial hold.");
  }
  return data;
}

export async function submitLead(input: {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  flyer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  path?: string;
  notes?: string;
  company?: string;
}): Promise<{ ok: boolean }> {
  if (!apiBase) {
    throw new Error("Lead form requires the studio API.");
  }
  const res = await fetch(`${apiBase}/studio/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not submit.");
  }
  return data;
}

export async function updateLeadStatus(
  id: string,
  status: "new" | "contacted" | "closed",
  token: string
): Promise<{ ok: boolean }> {
  if (!apiBase) throw new Error("Requires studio API.");
  const res = await fetch(`${apiBase}/studio/leads/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not update lead.");
  return data;
}

export async function fetchSubscriptionSlots(durationMinutes: 30 | 45 | 60) {
  if (!apiBase) {
    const studio = normalizeStudioPayload(await loadStudio());
    const { from, to } = rangeForDays(21);
    const slots = generateAvailableSlots({
      from,
      to,
      durationMinutes,
      availability: studio.availability,
      holidays: studio.holidays,
      bookings: studio.bookings,
    });
    return { slots, availability: studio.availability };
  }
  const res = await fetch(
    `${apiBase}/studio/subscription/slots?durationMinutes=${durationMinutes}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load subscription times.");
  return data as { slots: TimeSlot[]; availability: AvailabilityConfig };
}

export async function trackFlyerHit(code: string) {
  if (!apiBase) return { flyer: { code, label: code } };
  const res = await fetch(`${apiBase}/studio/flyers/hit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Unknown flyer code.");
  return data as { flyer: { code: string; label: string } };
}

/** @deprecated use startTrialCheckout */
export async function createBooking() {
  throw new Error("Use Pay $35 checkout on /trial instead.");
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
