"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
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
  onClose: () => void;
};

/**
 * Full-viewport desktop trial shell — covers the page (not a floating card).
 * Mobile uses TrialBookingMobile.
 */
function TrialBookingDesktopPanel({ onClose }: Props) {
  const booking = useTrialBooking();
  const [shellRef, animateShell] = useAnimate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    if (reduceMotion) {
      void animateShell(el, { opacity: 1 }, { duration: 0 });
      return;
    }
    void animateShell(
      el,
      { opacity: [0, 1] },
      { duration: 0.28, ease: "easeOut" }
    );
  }, [animateShell, reduceMotion, shellRef]);

  const nextDisabled =
    (booking.step === 2 && !booking.selectedSlot) ||
    (booking.step === 3 && (!booking.name.trim() || !booking.email.trim()));

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[110] bg-paper flex flex-col opacity-0"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-desktop-title"
    >
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto">
        <header className="flex items-center justify-between gap-3 px-6 py-3 border-b border-line shrink-0">
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
            className="block max-w-[220px]"
            aria-label="Battery String Studio home"
          >
            <LogoLockup
              variant="horizontal"
              tone="light"
              className="max-w-[220px]"
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

        <div className="px-6 pt-5 pb-2 shrink-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
            {brand.studioName}
          </p>
          {!booking.success ? (
            <>
              <h2
                id="trial-desktop-title"
                className="font-display text-3xl text-ink mt-1"
              >
                {PUBLIC_BOOKING_COPY.modalTitle}
              </h2>
              <p className="text-sm text-muted mt-1">
                {PUBLIC_BOOKING_COPY.modalSubtitle}
              </p>
            </>
          ) : (
            <h2 id="trial-desktop-title" className="sr-only">
              {PUBLIC_BOOKING_COPY.successTitle}
            </h2>
          )}
        </div>

        {!booking.success && (
          <nav className="flex gap-1 px-6 pb-3 shrink-0" aria-label="Progress">
            {TRIAL_STEPS.map((s) => (
              <div key={s.n} className="flex-1">
                <div
                  className={`h-1 rounded-full ${
                    booking.step >= s.n ? "bg-ink" : "bg-line"
                  }`}
                />
                <p
                  className={`text-[10px] mt-1.5 uppercase tracking-wider ${
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
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
          {booking.success ? (
            <TrialBookingSuccess booking={booking} onDone={onClose} />
          ) : (
            <TrialBookingSteps booking={booking} />
          )}
        </div>

        {!booking.success && !booking.loading && (
          <footer className="shrink-0 border-t border-line px-6 py-4 flex gap-3">
            {booking.step > 1 ? (
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={booking.goBack}
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
            {booking.step < 4 ? (
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={nextDisabled}
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
                {booking.submitting
                  ? "Redirecting…"
                  : PUBLIC_BOOKING_COPY.confirm}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

type ShellProps = {
  isOpen: boolean;
  onClose: () => void;
};

const TrialBookingDesktop: React.FC<ShellProps> = ({ isOpen, onClose }) => {
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <TrialBookingDesktopPanel onClose={onClose} />,
    document.body
  );
};

export default TrialBookingDesktop;
