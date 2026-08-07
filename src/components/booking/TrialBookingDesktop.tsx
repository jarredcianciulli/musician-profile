import React, { useEffect } from "react";
import { createPortal } from "react-dom";
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

function TrialBookingDesktopPanel({ onClose }: Props) {
  const booking = useTrialBooking();
  const [backdropRef, animateBackdrop] = useAnimate();
  const [panelRef, animatePanel] = useAnimate();
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
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) return;
    if (reduceMotion) {
      animateBackdrop(backdrop, { opacity: 1 }, { duration: 0 });
      animatePanel(panel, { opacity: 1, y: 0, scale: 1 }, { duration: 0 });
      return;
    }
    void animateBackdrop(
      backdrop,
      { opacity: [0, 1] },
      { duration: 0.28, ease: "easeOut" }
    );
    void animatePanel(
      panel,
      { opacity: [0, 1], y: [18, 0], scale: [0.98, 1] },
      { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
    );
  }, [animateBackdrop, animatePanel, reduceMotion, backdropRef, panelRef]);

  const nextDisabled =
    (booking.step === 2 && !booking.selectedSlot) ||
    (booking.step === 3 && (!booking.name.trim() || !booking.email.trim()));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-ink/45 opacity-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-desktop-title"
        className="relative flex flex-col w-full max-w-lg max-h-[min(880px,calc(100vh-3rem))] bg-paper border border-line shadow-2xl opacity-0 overflow-hidden"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line shrink-0">
          <LogoLockup
            variant="horizontal"
            tone="light"
            className="max-w-[200px]"
            markClassName="w-5 h-9 text-sky-deep shrink-0"
          />
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
          {!booking.success ? (
            <>
              <h2
                id="trial-desktop-title"
                className="font-display text-2xl text-ink mt-1"
              >
                {PUBLIC_BOOKING_COPY.modalTitle}
              </h2>
              <p className="text-sm text-muted mt-1">
                {PUBLIC_BOOKING_COPY.modalSubtitle}
              </p>
            </>
          ) : (
            <h2
              id="trial-desktop-title"
              className="sr-only"
            >
              {PUBLIC_BOOKING_COPY.successTitle}
            </h2>
          )}
        </div>

        {!booking.success && (
          <nav className="flex gap-1 px-5 pb-3 shrink-0" aria-label="Progress">
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

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {booking.success ? (
            <TrialBookingSuccess booking={booking} onDone={onClose} />
          ) : (
            <TrialBookingSteps booking={booking} compact />
          )}
        </div>

        {!booking.success && !booking.loading && (
          <footer className="shrink-0 border-t border-line px-5 py-3 flex gap-3">
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

/** Desktop booking modal — centered panel. Mobile uses TrialBookingMobile. */
const TrialBookingDesktop: React.FC<ShellProps> = ({ isOpen, onClose }) => {
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <TrialBookingDesktopPanel onClose={onClose} />,
    document.body
  );
};

export default TrialBookingDesktop;
