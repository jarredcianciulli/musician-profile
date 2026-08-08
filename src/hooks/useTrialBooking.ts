"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookingConfirmation,
  dayKey,
  fetchAvailableSlots,
  fetchBookingBySession,
  formatSlotDay,
  startTrialCheckout,
} from "@/lib/bookingApi";
import { PUBLIC_TRIAL_MINUTES } from "@/lib/bookingPolicy";
import { AvailabilityConfig, LessonFormat, TimeSlot } from "@/types/studio";
import { defaultAvailability } from "@/data/seedStudio";
import { analytics } from "@/utils/analytics";

export type TrialStep = 1 | 2 | 3 | 4;

export function useTrialBooking(flyerCode?: string) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<TrialStep>(1);
  const [availability, setAvailability] =
    useState<AvailabilityConfig>(defaultAvailability);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [format, setFormat] = useState<LessonFormat>("in_person");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmation, setConfirmation] =
    useState<BookingConfirmation | null>(null);

  const timezone = availability.timezone || "America/New_York";
  const successParam = searchParams.get("success");
  const sessionId = searchParams.get("session_id");
  const canceled = searchParams.get("canceled");
  const flyer =
    flyerCode || searchParams.get("f") || searchParams.get("flyer") || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (successParam && sessionId) {
        setLoading(true);
        try {
          const result = await fetchBookingBySession(sessionId);
          if (cancelled) return;
          setConfirmation(result.confirmation);
          setSuccess(true);
          analytics.bookingCompleted();
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : "Could not confirm booking."
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (successParam && searchParams.get("local")) {
        setSuccess(true);
        setConfirmation({
          format: "in_person",
          area: "Bowan Village area",
          instructions:
            "Local demo booking saved. Connect Stripe + studio-api for live payments.",
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await fetchAvailableSlots({
          durationMinutes: PUBLIC_TRIAL_MINUTES,
        });
        if (cancelled) return;
        setAvailability(result.availability);
        setSlots(result.slots);
        const first = result.slots[0]
          ? dayKey(result.slots[0].start, result.availability.timezone)
          : "";
        setSelectedDay(first);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load times."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [successParam, sessionId, searchParams]);

  useEffect(() => {
    if (canceled) {
      setError("Checkout was canceled. Pick a time when you're ready.");
    }
  }, [canceled]);

  const days = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of slots) {
      const key = dayKey(slot.start, timezone);
      if (!map.has(key)) map.set(key, formatSlotDay(slot.start, timezone));
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [slots, timezone]);

  const availableDayKeys = useMemo(
    () => new Set(days.map((d) => d.key)),
    [days]
  );

  const daySlots = useMemo(
    () => slots.filter((s) => dayKey(s.start, timezone) === selectedDay),
    [slots, selectedDay, timezone]
  );

  const goNext = useCallback(() => {
    setError("");
    setStep((s) => Math.min(4, s + 1) as TrialStep);
  }, []);

  const goBack = useCallback(() => {
    setError("");
    setStep((s) => Math.max(1, s - 1) as TrialStep);
  }, []);

  const selectDay = useCallback((key: string) => {
    setSelectedDay(key);
    setSelectedSlot(null);
  }, []);

  const pay = useCallback(async () => {
    if (!selectedSlot) {
      setError("Pick a time to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      analytics.bookingModalOpened("Trial Checkout");
      const result = await startTrialCheckout({
        start: selectedSlot.start,
        end: selectedSlot.end,
        name: name.trim(),
        email: email.trim(),
        notes: notes.trim(),
        format,
        flyer: flyer || undefined,
      });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setSubmitting(false);
    }
  }, [selectedSlot, name, email, notes, format, flyer]);

  const canContinue =
    step === 1 ||
    (step === 2 && Boolean(selectedSlot)) ||
    (step === 3 && Boolean(name.trim() && email.trim())) ||
    step === 4;

  return {
    step,
    setStep,
    goNext,
    goBack,
    timezone,
    slots,
    days,
    availableDayKeys,
    daySlots,
    selectedDay,
    selectDay,
    selectedSlot,
    setSelectedSlot,
    format,
    setFormat,
    name,
    setName,
    email,
    setEmail,
    notes,
    setNotes,
    loading,
    submitting,
    error,
    setError,
    success,
    confirmation,
    pay,
    canContinue,
    flyer,
  };
}

export type TrialBookingState = ReturnType<typeof useTrialBooking>;
