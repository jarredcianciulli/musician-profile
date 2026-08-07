import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { brand } from "../../config/brand";
import LogoLockup from "../brand/LogoLockup";
import {
  BookingConfirmation,
  dayKey,
  fetchAvailableSlots,
  fetchBookingBySession,
  formatSlotDay,
  formatSlotTime,
  startTrialCheckout,
} from "../../lib/bookingApi";
import {
  PUBLIC_BOOKING_COPY,
  PUBLIC_TRIAL_MINUTES,
  PUBLIC_TRIAL_PRICE,
} from "../../lib/bookingPolicy";
import { AvailabilityConfig, LessonFormat, TimeSlot } from "../../types/studio";
import { defaultAvailability } from "../../data/seedStudio";
import { analytics } from "../../utils/analytics";

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: PUBLIC_BOOKING_COPY.stepFormat },
  { n: 2, label: PUBLIC_BOOKING_COPY.stepTime },
  { n: 3, label: PUBLIC_BOOKING_COPY.stepDetails },
  { n: 4, label: PUBLIC_BOOKING_COPY.stepReview },
];

const TrialBookingFlow: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);
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

  const daySlots = useMemo(
    () => slots.filter((s) => dayKey(s.start, timezone) === selectedDay),
    [slots, selectedDay, timezone]
  );

  const pay = async () => {
    if (!selectedSlot) {
      setError("Pick a time to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      analytics.bookingModalOpened("Trial Route Checkout");
      const result = await startTrialCheckout({
        start: selectedSlot.start,
        end: selectedSlot.end,
        name: name.trim(),
        email: email.trim(),
        notes: notes.trim(),
        format,
      });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-paper md:bg-ink/40 md:items-center md:justify-center md:p-6">
      <div
        className="flex flex-col w-full h-full md:h-auto md:max-h-[min(920px,calc(100vh-3rem))] md:max-w-lg md:rounded-sm md:shadow-2xl md:border md:border-line bg-paper overflow-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-line shrink-0">
          <LogoLockup
            variant="horizontal"
            tone="light"
            className="max-w-[180px]"
            markClassName="w-5 h-9 text-sky-deep shrink-0"
          />
          <Link
            to="/"
            className="text-sm text-muted hover:text-ink px-2 py-1"
            aria-label="Close"
          >
            ✕
          </Link>
        </header>

        <div className="px-4 sm:px-5 pt-4 pb-2 shrink-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
            {brand.studioName}
          </p>
          <h1 className="font-display text-2xl text-ink mt-1">
            {PUBLIC_BOOKING_COPY.modalTitle}
          </h1>
          <p className="text-sm text-muted mt-1">
            {PUBLIC_BOOKING_COPY.modalSubtitle}
          </p>
        </div>

        {!success && (
          <nav
            className="flex gap-1 px-4 sm:px-5 pb-3 shrink-0"
            aria-label="Progress"
          >
            {STEPS.map((s) => (
              <div key={s.n} className="flex-1">
                <div
                  className={`h-1 rounded-full ${
                    step >= s.n ? "bg-ink" : "bg-line"
                  }`}
                />
                <p
                  className={`text-[10px] mt-1.5 uppercase tracking-wider ${
                    step === s.n ? "text-ink font-semibold" : "text-muted"
                  }`}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </nav>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4">
          {loading && !success ? (
            <p className="text-sm text-muted text-center py-12">
              Finding open times…
            </p>
          ) : null}

          {success ? (
            <div className="space-y-4 py-4">
              <h2 className="font-display text-xl text-ink">
                {PUBLIC_BOOKING_COPY.successTitle}
              </h2>
              <p className="text-sm text-muted">
                {PUBLIC_BOOKING_COPY.confirmationPayment}
              </p>
              {confirmation ? (
                <div className="border border-line bg-paper-muted/60 px-3 py-3 text-sm space-y-2">
                  <p className="font-medium text-ink">
                    {confirmation.format === "online"
                      ? "Online lesson"
                      : `In person · ${
                          confirmation.area ||
                          PUBLIC_BOOKING_COPY.confirmationInPersonArea
                        }`}
                  </p>
                  {confirmation.address ? (
                    <p className="text-ink whitespace-pre-line">
                      {confirmation.address}
                    </p>
                  ) : null}
                  <p className="text-ink-soft">{confirmation.instructions}</p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Payment received — confirmation details are on the way.
                </p>
              )}
              <Link to="/" className="btn-primary inline-flex">
                Back to home
              </Link>
            </div>
          ) : null}

          {!loading && !success && step === 1 ? (
            <fieldset className="space-y-3">
              <legend className="sr-only">Lesson format</legend>
              {(
                [
                  ["in_person", PUBLIC_BOOKING_COPY.formatInPerson],
                  ["online", PUBLIC_BOOKING_COPY.formatOnline],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 border px-4 py-4 cursor-pointer ${
                    format === value
                      ? "border-ink bg-paper-muted/50"
                      : "border-line bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    className="mt-1"
                    checked={format === value}
                    onChange={() => setFormat(value)}
                  />
                  <span className="text-ink text-base font-medium">{label}</span>
                </label>
              ))}
              <p className="text-xs text-muted">
                {PUBLIC_BOOKING_COPY.formatSameRate}
              </p>
            </fieldset>
          ) : null}

          {!loading && !success && step === 2 ? (
            <div className="space-y-4">
              {slots.length === 0 ? (
                <p className="text-sm text-muted">
                  No open times in the next two weeks. Please check back soon,
                  or use Contact to request a time.
                </p>
              ) : (
                <>
                  <label className="block text-sm">
                    <span className="text-muted uppercase tracking-wider text-[11px] font-semibold">
                      Day
                    </span>
                    <select
                      className="mt-1.5 w-full border border-line bg-white px-3 py-3 text-ink text-base focus:outline-none focus:border-sky-deep"
                      value={selectedDay}
                      onChange={(e) => {
                        setSelectedDay(e.target.value);
                        setSelectedSlot(null);
                      }}
                    >
                      {days.map((day) => (
                        <option key={day.key} value={day.key}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <p className="text-muted uppercase tracking-wider text-[11px] font-semibold mb-2">
                      Time · {PUBLIC_TRIAL_MINUTES} min
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {daySlots.map((slot) => {
                        const active = selectedSlot?.start === slot.start;
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-2 py-3 text-sm border ${
                              active
                                ? "bg-ink text-paper border-ink"
                                : "bg-white text-ink border-line"
                            }`}
                          >
                            {formatSlotTime(slot.start, timezone)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {!loading && !success && step === 3 ? (
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="text-muted uppercase tracking-wider text-[11px] font-semibold">
                  Name
                </span>
                <input
                  className="mt-1.5 w-full border border-line bg-white px-3 py-3 text-base text-ink focus:outline-none focus:border-sky-deep"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted uppercase tracking-wider text-[11px] font-semibold">
                  Email
                </span>
                <input
                  type="email"
                  className="mt-1.5 w-full border border-line bg-white px-3 py-3 text-base text-ink focus:outline-none focus:border-sky-deep"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted uppercase tracking-wider text-[11px] font-semibold">
                  Notes (optional)
                </span>
                <textarea
                  className="mt-1.5 w-full border border-line bg-white px-3 py-3 text-base text-ink focus:outline-none focus:border-sky-deep min-h-[88px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Student age, instrument, goals…"
                />
              </label>
            </div>
          ) : null}

          {!loading && !success && step === 4 && selectedSlot ? (
            <div className="space-y-4 text-sm">
              <div className="border border-line bg-paper-muted/50 px-4 py-4 space-y-2">
                <p className="font-medium text-ink text-base">
                  ${PUBLIC_TRIAL_PRICE} · {PUBLIC_TRIAL_MINUTES} min trial
                </p>
                <p className="text-ink-soft">
                  {format === "online"
                    ? PUBLIC_BOOKING_COPY.formatOnline
                    : PUBLIC_BOOKING_COPY.formatInPerson}
                </p>
                <p className="text-ink-soft">
                  {formatSlotDay(selectedSlot.start, timezone)} at{" "}
                  {formatSlotTime(selectedSlot.start, timezone)}
                </p>
                <p className="text-ink-soft">
                  {name} · {email}
                </p>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                You&apos;ll complete payment on Stripe&apos;s secure checkout.
                Your spot is held after payment succeeds.
              </p>
            </div>
          ) : null}

          {error && (
            <p className="text-sm text-accent mt-4" role="alert">
              {error}
            </p>
          )}
        </div>

        {!success && !loading && (
          <footer className="shrink-0 border-t border-line px-4 sm:px-5 py-3 flex gap-3">
            {step > 1 ? (
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setStep((s) => (s - 1) as Step)}
              >
                Back
              </button>
            ) : (
              <Link to="/" className="btn-secondary flex-1 text-center">
                Cancel
              </Link>
            )}
            {step < 4 ? (
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={
                  (step === 2 && !selectedSlot) ||
                  (step === 3 && (!name.trim() || !email.trim()))
                }
                onClick={() => {
                  setError("");
                  setStep((s) => (s + 1) as Step);
                }}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={submitting || !selectedSlot}
                onClick={pay}
              >
                {submitting ? "Redirecting…" : PUBLIC_BOOKING_COPY.confirm}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};

export default TrialBookingFlow;
