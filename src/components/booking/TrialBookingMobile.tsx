"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAnimate, useReducedMotion } from "framer-motion";
import { brand } from "../../config/brand";
import LogoLockup from "../brand/LogoLockup";
import { PUBLIC_BOOKING_COPY } from "../../lib/bookingPolicy";
import { lockBodyScroll, unlockBodyScroll } from "../../lib/scrollLock";
import { useTrialBooking } from "../../hooks/useTrialBooking";
import TrialBookingSteps, { TRIAL_STEPS } from "./TrialBookingSteps";
import TrialBookingSuccess from "./TrialBookingSuccess";

type Props = {
  onClose?: () => void;
};

/**
 * Full-viewport mobile booking shell (QR / phone).
 * Uses dvh + a single scroll region so landscape doesn't crush the body to 0px.
 */
const TrialBookingMobile: React.FC<Props> = ({ onClose }) => {
  const booking = useTrialBooking();
  const [shellRef, animateShell] = useAnimate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || reduceMotion) return;
    void animateShell(
      el,
      { opacity: [0, 1], y: [16, 0] },
      { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    );
  }, [animateShell, reduceMotion, shellRef]);

  const closeControl = onClose ? (
    <button
      type="button"
      onClick={onClose}
      className="text-sm text-muted hover:text-ink px-2 py-1"
      aria-label="Close"
    >
      ✕
    </button>
  ) : (
    <Link
      href="/"
      className="text-sm text-muted hover:text-ink px-2 py-1"
      aria-label="Close"
    >
      ✕
    </Link>
  );

  const footer = !booking.success && !booking.loading ? (
    <div className="flex gap-3">
      {booking.step > 1 ? (
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={booking.goBack}
        >
          Back
        </button>
      ) : onClose ? (
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={onClose}
        >
          Cancel
        </button>
      ) : (
        <Link href="/" className="btn-secondary flex-1 text-center">
          Cancel
        </Link>
      )}
      {booking.step < 4 ? (
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={
            (booking.step === 2 && !booking.selectedSlot) ||
            (booking.step === 3 &&
              (!booking.name.trim() || !booking.email.trim()))
          }
          onClick={booking.goNext}
        >
          Continue
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={booking.submitting || !booking.selectedSlot}
          onClick={booking.pay}
        >
          {booking.submitting ? "Redirecting…" : PUBLIC_BOOKING_COPY.confirm}
        </button>
      )}
    </div>
  ) : null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-paper flex flex-col"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-mobile-title"
    >
      <div
        ref={shellRef}
        className="flex flex-col flex-1 min-h-0 w-full max-w-lg mx-auto"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-line shrink-0">
          <LogoLockup
            variant="horizontal"
            tone="light"
            className="max-w-[160px]"
            markClassName="w-5 h-8 text-sky-deep shrink-0"
          />
          {closeControl}
        </header>

        {/*
          One scroll column for the whole middle + actions.
          Avoids flex middle collapsing to ~0px in landscape when
          header/title/progress/footer are all shrink-0.
        */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y">
          {booking.success ? (
            <div className="px-5 py-5 pb-8">
              <h1 id="trial-mobile-title" className="sr-only">
                {PUBLIC_BOOKING_COPY.successTitle}
              </h1>
              <TrialBookingSuccess booking={booking} onDone={onClose} />
            </div>
          ) : (
            <>
              <div className="px-5 pt-4 pb-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
                  {brand.studioName}
                </p>
                <h1
                  id="trial-mobile-title"
                  className="font-display text-2xl leading-tight text-ink mt-1"
                >
                  {PUBLIC_BOOKING_COPY.modalTitle}
                </h1>
                <p className="text-sm text-muted mt-1">
                  {PUBLIC_BOOKING_COPY.modalSubtitle}
                </p>
              </div>

              <nav
                className="flex gap-1.5 px-5 pb-3"
                aria-label="Progress"
              >
                {TRIAL_STEPS.map((s) => (
                  <div key={s.n} className="flex-1 min-w-0">
                    <div
                      className={`h-0.5 rounded-full transition-colors duration-300 ${
                        booking.step >= s.n ? "bg-ink" : "bg-line"
                      }`}
                    />
                    <p
                      className={`text-[10px] mt-1.5 uppercase tracking-wider truncate ${
                        booking.step === s.n
                          ? "text-ink font-semibold"
                          : "text-muted"
                      }`}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </nav>

              <div className="px-5 py-3 pb-6">
                <TrialBookingSteps booking={booking} />
              </div>

              {footer ? (
                <div className="sticky bottom-0 border-t border-line bg-paper/95 backdrop-blur-sm px-5 py-3">
                  {footer}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialBookingMobile;
