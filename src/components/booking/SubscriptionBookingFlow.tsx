"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  dayKey,
  fetchSubscriptionSlots,
  formatSlotDay,
  formatSlotTime,
  persistReservationId,
  startSubscriptionCheckout,
} from "@/lib/bookingApi";
import { analytics } from "@/utils/analytics";
import {
  DEFAULT_SUBSCRIPTION_MINUTES,
  PUBLIC_BOOKING_COPY,
  SUBSCRIPTION_DURATIONS,
  SUBSCRIPTION_MONTHLY_RATES,
  SubscriptionDuration,
} from "@/lib/bookingPolicy";
import { computeProration } from "@/lib/subscriptionProration";
import {
  STUDIO_POLICY_SECTIONS,
  STUDIO_POLICY_TITLE,
} from "@/content/studioPolicy";
import { LessonFormat, TimeSlot } from "@/types/studio";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";
import Link from "next/link";
import LogoLockup from "@/components/brand/LogoLockup";
import { brand } from "@/config/brand";
import BookingDayPicker from "@/components/booking/BookingDayPicker";

type Step = 1 | 2 | 3 | 4 | 5;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Captured when opening — do not flip mid-session. */
  mobile: boolean;
};

function money(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

const SubscriptionBookingFlow: React.FC<Props> = ({
  isOpen,
  onClose,
  mobile,
}) => {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [duration, setDuration] = useState<SubscriptionDuration>(
    DEFAULT_SUBSCRIPTION_MINUTES
  );
  const [format, setFormat] = useState<LessonFormat>("in_person");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [timezone, setTimezone] = useState("America/New_York");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setDuration(DEFAULT_SUBSCRIPTION_MINUTES);
    setFormat("in_person");
    setSelectedDay("");
    setSelectedSlot(null);
    setName("");
    setEmail("");
    setPolicyAccepted(false);
    setSubmitting(false);
    setError("");
    setSlots([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchSubscriptionSlots(duration)
      .then((result) => {
        if (cancelled) return;
        setSlots(result.slots || []);
        const tz = result.availability?.timezone || "America/New_York";
        setTimezone(tz);
        const first = result.slots?.[0];
        if (first) {
          setSelectedDay(dayKey(first.start, tz));
        } else {
          setSelectedDay("");
        }
        setSelectedSlot(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load times."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, duration]);

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

  const preferredWeekday: 1 | 6 | null = useMemo(() => {
    if (!selectedSlot) return null;
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(new Date(selectedSlot.start));
    if (label === "Mon") return 1;
    if (label === "Sat") return 6;
    return null;
  }, [selectedSlot, timezone]);

  const proration = useMemo(() => {
    if (!selectedSlot || !preferredWeekday) return null;
    return computeProration({
      durationMinutes: duration,
      preferredWeekday,
      startDate: new Date(selectedSlot.start),
    });
  }, [selectedSlot, preferredWeekday, duration]);

  const monthlyPrice = SUBSCRIPTION_MONTHLY_RATES[duration];

  const pay = async () => {
    if (!selectedSlot || !policyAccepted || !preferredWeekday) {
      setError("Complete each step and agree to the studio policy.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await startSubscriptionCheckout({
        name: name.trim(),
        email: email.trim(),
        durationMinutes: duration,
        start: selectedSlot.start,
        end: selectedSlot.end,
        format,
        policyAccepted: true,
      });
      if (result.reservationId) {
        persistReservationId(result.reservationId);
      }
      analytics.subscribeCheckoutStart(duration);
      unlockBodyScroll();
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const shellClass = "fixed inset-0 z-[110] bg-paper flex flex-col";

  const panel = (
    <div
      className={
        mobile
          ? "flex flex-col flex-1 min-h-0 w-full max-w-lg mx-auto"
          : "flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto"
      }
      style={{ height: "100dvh", maxHeight: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-booking-title"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line shrink-0">
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onClose();
          }}
          className="block max-w-[180px]"
          aria-label="Battery String Studio home"
        >
          <LogoLockup
            variant="horizontal"
            tone="light"
            className="max-w-[180px]"
            markClassName="w-5 h-9 text-sky-deep shrink-0"
          />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted hover:text-ink px-2 py-1"
          aria-label="Close"
        >
          ✕
        </button>
      </header>

      <div className="px-5 pt-4 pb-2 shrink-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          {brand.studioName}
        </p>
        <h2
          id="sub-booking-title"
          className="font-display text-2xl text-ink mt-1"
        >
          Reserve your weekly lesson
        </h2>
        <p className="text-sm text-muted mt-1">
          You&apos;re holding one slot each week — then monthly tuition keeps it
          yours.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
        <div key={step} className="animate-[bss-rise_0.28s_ease-out]">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">
                Choose lesson length. Same rate in-studio or online.
              </p>
              <div className="inline-flex border border-line bg-paper-muted/50 p-1">
                {SUBSCRIPTION_DURATIONS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className={`px-4 py-2 text-sm font-semibold ${
                      duration === mins
                        ? "bg-ink text-paper"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
              <p className="font-display text-4xl text-ink">
                ${monthlyPrice}
                <span className="text-base font-sans text-muted ml-1">/mo</span>
              </p>
              <fieldset className="space-y-2">
                {(
                  [
                    ["in_person", PUBLIC_BOOKING_COPY.formatInPerson],
                    ["online", PUBLIC_BOOKING_COPY.formatOnline],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex gap-3 border px-3 py-3 cursor-pointer ${
                      format === value
                        ? "border-ink bg-paper-muted/50"
                        : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={format === value}
                      onChange={() => setFormat(value)}
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted py-8 text-center">
                  Finding open weekly times…
                </p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">
                  No open recurring slots in the next few weeks. Try another
                  length or contact the studio.
                </p>
              ) : (
                <>
                  <p className="text-sm text-ink-soft">
                    Pick the day and time you want reserved every week (Mon or
                    Sat).
                  </p>
                  <BookingDayPicker
                    selectedDay={selectedDay}
                    availableDayKeys={availableDayKeys}
                    dayLabels={days}
                    onSelectDay={(key) => {
                      setSelectedDay(key);
                      setSelectedSlot(null);
                    }}
                  />
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
                              : "bg-white border-line"
                          }`}
                        >
                          {formatSlotTime(slot.start, timezone)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && selectedSlot && proration && (
            <div className="space-y-4 text-sm">
              <div className="border border-line bg-paper-muted/50 px-4 py-4 space-y-2">
                <p className="font-medium text-ink text-base">
                  You&apos;re reserving{" "}
                  {formatSlotDay(selectedSlot.start, timezone)} at{" "}
                  {formatSlotTime(selectedSlot.start, timezone)} each week
                </p>
                <p className="text-ink-soft">
                  {duration} min ·{" "}
                  {format === "online" ? "Online" : "In person"}
                </p>
                <p className="text-ink-soft">
                  Partial first month: {proration.remainingLessons} lesson
                  {proration.remainingLessons === 1 ? "" : "s"} × $
                  {money(proration.perLessonDollars)} ={" "}
                  <strong>${money(proration.prorateDollars)}</strong>
                </p>
                <p className="text-ink-soft">
                  Then ${monthlyPrice}/mo starting{" "}
                  {new Date(proration.nextCycleStartIso).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone: timezone,
                    }
                  )}
                  .
                </p>
              </div>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  Name
                </span>
                <input
                  className="mt-1 w-full border border-line px-3 py-3 text-base text-ink focus:outline-none focus:border-sky-deep"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  Email
                </span>
                <input
                  type="email"
                  className="mt-1 w-full border border-line px-3 py-3 text-base text-ink focus:outline-none focus:border-sky-deep"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-display text-xl text-ink">
                {STUDIO_POLICY_TITLE}
              </h3>
              <div className="max-h-64 overflow-y-auto border border-line bg-white px-3 py-3 space-y-3 text-sm text-ink-soft">
                {STUDIO_POLICY_SECTIONS.map((s) => (
                  <div key={s.heading}>
                    <p className="font-semibold text-ink">{s.heading}</p>
                    <p className="mt-1 leading-relaxed">{s.body}</p>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={policyAccepted}
                  onChange={(e) => setPolicyAccepted(e.target.checked)}
                />
                <span>
                  I have read and agree to the studio policy, including that my
                  tuition reserves this weekly time whether or not I attend.
                </span>
              </label>
            </div>
          )}

          {step === 5 && selectedSlot && proration && (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-ink text-base">Ready to pay</p>
              <p className="text-ink-soft">
                Today: ${money(proration.prorateDollars)} for remaining lessons
                this month. Then ${monthlyPrice}/mo.
              </p>
              <p className="text-ink-soft">
                Reserved: {formatSlotDay(selectedSlot.start, timezone)}{" "}
                {formatSlotTime(selectedSlot.start, timezone)} weekly · {name}{" "}
                · {email}
              </p>
            </div>
          )}

          {error ? (
            <p className="text-sm text-accent mt-4" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-t border-line px-5 py-3 flex gap-3">
        {step > 1 ? (
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setStep((s) => (s - 1) as Step)}
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onClose}
          >
            Cancel
          </button>
        )}
        {step < 5 ? (
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={
              (step === 2 && !selectedSlot) ||
              (step === 3 && (!name.trim() || !email.trim() || !proration)) ||
              (step === 4 && !policyAccepted)
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
            disabled={submitting}
            onClick={pay}
          >
            {submitting ? "Redirecting…" : "Pay & reserve"}
          </button>
        )}
      </footer>
    </div>
  );

  const overlay = <div className={shellClass}>{panel}</div>;

  return createPortal(overlay, document.body);
};

export default SubscriptionBookingFlow;
