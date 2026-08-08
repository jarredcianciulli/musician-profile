"use client";

import React, { useEffect } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";
import {
  formatSlotDay,
  formatSlotTime,
} from "../../lib/bookingApi";
import {
  PUBLIC_BOOKING_COPY,
  PUBLIC_TRIAL_MINUTES,
  PUBLIC_TRIAL_PRICE,
} from "../../lib/bookingPolicy";
import { TrialBookingState, TrialStep } from "../../hooks/useTrialBooking";
import BookingDayPicker from "./BookingDayPicker";

export const TRIAL_STEPS: { n: TrialStep; label: string }[] = [
  { n: 1, label: PUBLIC_BOOKING_COPY.stepFormat },
  { n: 2, label: PUBLIC_BOOKING_COPY.stepTime },
  { n: 3, label: PUBLIC_BOOKING_COPY.stepDetails },
  { n: 4, label: PUBLIC_BOOKING_COPY.stepReview },
];

type Props = {
  booking: TrialBookingState;
  /** Dense spacing for desktop modal */
  compact?: boolean;
};

const TrialBookingSteps: React.FC<Props> = ({ booking, compact }) => {
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();
  const {
    step,
    loading,
    success,
    format,
    setFormat,
    slots,
    days,
    availableDayKeys,
    daySlots,
    selectedDay,
    selectDay,
    selectedSlot,
    setSelectedSlot,
    timezone,
    name,
    setName,
    email,
    setEmail,
    notes,
    setNotes,
    error,
  } = booking;

  useEffect(() => {
    const el = scope.current;
    if (!el) return;
    if (reduceMotion) {
      animate(el, { opacity: 1, y: 0 }, { duration: 0 });
      return;
    }
    void animate(el, { opacity: 0, y: 14 }, { duration: 0 }).then(() =>
      animate(
        el,
        { opacity: 1, y: 0 },
        { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      )
    );
  }, [step, success, loading, animate, reduceMotion, scope]);

  return (
    <div ref={scope} className={compact ? "space-y-3" : "space-y-4"}>
      {loading && !success ? (
        <p className="text-sm text-muted text-center py-12">
          Finding open times…
        </p>
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
              className={`flex items-start gap-3 border px-4 py-4 cursor-pointer transition-colors ${
                format === value
                  ? "border-ink bg-paper-muted/50"
                  : "border-line bg-white hover:border-sky-deep/60"
              }`}
            >
              <input
                type="radio"
                name="format"
                className="mt-1 accent-ink"
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
              No open times in the next two weeks. Please check back soon, or
              use Contact to request a time.
            </p>
          ) : (
            <>
              <BookingDayPicker
                selectedDay={selectedDay}
                availableDayKeys={availableDayKeys}
                dayLabels={days}
                onSelectDay={selectDay}
              />
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
                        className={`px-2 py-3 text-sm border transition-colors ${
                          active
                            ? "bg-ink text-paper border-ink"
                            : "bg-white text-ink border-line hover:border-sky-deep"
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
            You&apos;ll complete payment on Stripe&apos;s secure checkout. Your
            spot is held after payment succeeds.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-accent mt-2" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default TrialBookingSteps;
