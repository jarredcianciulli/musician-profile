import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { brand } from "../config/brand";
import {
  BookingConfirmation,
  createBooking,
  dayKey,
  fetchAvailableSlots,
  formatSlotDay,
  formatSlotTime,
} from "../lib/bookingApi";
import {
  PUBLIC_BOOKING_COPY,
  PUBLIC_TRIAL_MINUTES,
} from "../lib/bookingPolicy";
import { AvailabilityConfig, LessonFormat, TimeSlot } from "../types/studio";
import { defaultAvailability } from "../data/seedStudio";
import { analytics } from "../utils/analytics";
import { lockBodyScroll, unlockBodyScroll } from "../lib/scrollLock";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  title = PUBLIC_BOOKING_COPY.modalTitle,
}) => {
  const [availability, setAvailability] =
    useState<AvailabilityConfig>(defaultAvailability);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [format, setFormat] = useState<LessonFormat>("in_person");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmation, setConfirmation] =
    useState<BookingConfirmation | null>(null);

  const timezone = availability.timezone || "America/New_York";
  const durationMinutes = PUBLIC_TRIAL_MINUTES;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const preventBackgroundScroll = (event: TouchEvent | WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-modal-scroll]")) return;
      event.preventDefault();
    };

    lockBodyScroll();
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("touchmove", preventBackgroundScroll, {
      passive: false,
    });
    document.addEventListener("wheel", preventBackgroundScroll, {
      passive: false,
    });

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("touchmove", preventBackgroundScroll);
      document.removeEventListener("wheel", preventBackgroundScroll);
      unlockBodyScroll();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSuccess(false);
    setConfirmation(null);
    setSelectedSlot(null);
    setFormat("in_person");
    setLoading(true);
    setSlots([]);
    setSelectedDay("");

    let cancelled = false;
    (async () => {
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
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError("Pick a time to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await createBooking({
        start: selectedSlot.start,
        end: selectedSlot.end,
        name: name.trim(),
        email: email.trim(),
        notes: notes.trim(),
        durationMinutes: PUBLIC_TRIAL_MINUTES,
        lessonType: "trial",
        format,
      });
      analytics.bookingCompleted();
      setConfirmation(result.confirmation || null);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-ink/55 z-[200]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            data-modal-scroll
            className="fixed inset-0 z-[201] flex justify-center items-start md:items-center overflow-y-auto overscroll-contain py-8 px-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-modal-title"
              className="bg-paper rounded-none md:rounded-sm shadow-2xl w-full max-w-lg max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col relative border border-line"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-line">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
                    {brand.studioName}
                  </p>
                  <h2
                    id="booking-modal-title"
                    className="font-display text-2xl text-ink mt-1"
                  >
                    {title}
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    {PUBLIC_BOOKING_COPY.modalSubtitle}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {durationMinutes} minutes · {timezone.replace("_", " ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-muted hover:text-ink text-2xl leading-none px-1"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div
                data-modal-scroll
                className="flex-1 overflow-y-auto overscroll-contain px-6 py-5"
              >
                {success && selectedSlot ? (
                  <div className="space-y-4">
                    <h3 className="font-display text-xl text-ink">
                      {PUBLIC_BOOKING_COPY.successTitle}
                    </h3>
                    <p className="text-ink-soft">
                      $35 trial · {formatSlotDay(selectedSlot.start, timezone)}{" "}
                      at {formatSlotTime(selectedSlot.start, timezone)}
                    </p>
                    <p className="text-sm text-muted">
                      {PUBLIC_BOOKING_COPY.confirmationPayment}
                    </p>
                    {confirmation ? (
                      <div className="border border-line bg-paper-muted/60 px-3 py-3 text-sm text-ink-soft space-y-2">
                        <p className="font-medium text-ink">
                          {confirmation.format === "online"
                            ? "Online lesson"
                            : `In person · ${
                                confirmation.area ||
                                PUBLIC_BOOKING_COPY.confirmationInPersonArea
                              }`}
                        </p>
                        {confirmation.format === "in_person" &&
                        confirmation.address ? (
                          <p className="text-ink whitespace-pre-line">
                            {confirmation.address}
                          </p>
                        ) : null}
                        <p>{confirmation.instructions}</p>
                      </div>
                    ) : null}
                    <p className="text-sm text-muted">
                      We&apos;ll also follow up at <strong>{email}</strong>.
                    </p>
                    <button type="button" className="btn-primary" onClick={onClose}>
                      Done
                    </button>
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="border border-line bg-paper-muted/60 px-3 py-3 text-sm text-ink-soft">
                      <p className="font-medium text-ink">
                        {PUBLIC_BOOKING_COPY.trialBannerTitle}
                      </p>
                      <p className="text-muted mt-1 text-xs leading-relaxed">
                        {PUBLIC_BOOKING_COPY.trialBannerBody}
                      </p>
                    </div>

                    <fieldset className="space-y-2">
                      <legend className="text-muted uppercase tracking-wider text-[11px] font-semibold">
                        Lesson format
                      </legend>
                      <label className="flex items-start gap-3 border border-line bg-white px-3 py-3 cursor-pointer has-[:checked]:border-ink">
                        <input
                          type="radio"
                          name="lesson-format"
                          className="mt-1"
                          checked={format === "in_person"}
                          onChange={() => setFormat("in_person")}
                        />
                        <span>
                          <span className="block text-ink text-sm font-medium">
                            {PUBLIC_BOOKING_COPY.formatInPerson}
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3 border border-line bg-white px-3 py-3 cursor-pointer has-[:checked]:border-ink">
                        <input
                          type="radio"
                          name="lesson-format"
                          className="mt-1"
                          checked={format === "online"}
                          onChange={() => setFormat("online")}
                        />
                        <span>
                          <span className="block text-ink text-sm font-medium">
                            {PUBLIC_BOOKING_COPY.formatOnline}
                          </span>
                        </span>
                      </label>
                      <p className="text-xs text-muted">
                        {PUBLIC_BOOKING_COPY.formatSameRate}
                      </p>
                    </fieldset>

                    {loading ? (
                      <p className="text-sm text-muted py-6 text-center">
                        Finding open times…
                      </p>
                    ) : null}

                    {!loading && !error && slots.length === 0 ? (
                      <p className="text-sm text-muted">
                        No open times in the next two weeks. Please check back
                        soon, or use Contact to request a time.
                      </p>
                    ) : null}

                    {!loading && days.length > 0 ? (
                      <div className="space-y-3">
                        <label className="block text-sm">
                          <span className="text-muted uppercase tracking-wider text-[11px] font-semibold">
                            Day
                          </span>
                          <select
                            className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-ink focus:outline-none focus:border-sky-deep"
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
                            Time
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {daySlots.map((slot) => {
                              const active =
                                selectedSlot?.start === slot.start;
                              return (
                                <button
                                  key={slot.start}
                                  type="button"
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`px-2 py-2.5 text-sm border transition-colors ${
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
                      </div>
                    ) : null}

                    <div className="space-y-3 pt-1">
                      <label className="block text-sm">
                        <span className="text-muted uppercase tracking-wider text-[11px] font-semibold">
                          Name
                        </span>
                        <input
                          className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-ink focus:outline-none focus:border-sky-deep"
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
                          className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-ink focus:outline-none focus:border-sky-deep"
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
                          className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-ink focus:outline-none focus:border-sky-deep min-h-[72px]"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          placeholder="Student age, instrument, goals…"
                        />
                      </label>
                    </div>

                    {error && (
                      <p className="text-sm text-accent" role="alert">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="btn-primary w-full"
                      disabled={submitting || loading || !selectedSlot}
                    >
                      {submitting
                        ? "Booking…"
                        : PUBLIC_BOOKING_COPY.confirm}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BookingModal;
