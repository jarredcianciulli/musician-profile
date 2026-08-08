"use client";

import React from "react";
import Link from "next/link";
import {
  formatSlotDay,
  formatSlotTime,
} from "../../lib/bookingApi";
import { PUBLIC_BOOKING_COPY } from "../../lib/bookingPolicy";
import { TrialBookingState } from "../../hooks/useTrialBooking";

type Props = {
  booking: TrialBookingState;
  onDone?: () => void;
};

/** Dedicated confirmation view — not the booking-form chrome. */
const TrialBookingSuccess: React.FC<Props> = ({ booking, onDone }) => {
  const { confirmation, selectedSlot, timezone, format, name, email } = booking;

  return (
    <div className="space-y-5 py-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          Confirmed
        </p>
        <h2 className="font-display text-3xl text-ink mt-1">
          {PUBLIC_BOOKING_COPY.successTitle}
        </h2>
        <p className="text-sm text-muted mt-2">
          {PUBLIC_BOOKING_COPY.confirmationPayment}
        </p>
      </div>

      {confirmation ? (
        <div className="border border-line bg-paper-muted/50 px-4 py-4 text-sm space-y-3">
          <p className="font-medium text-ink text-base">
            {confirmation.format === "online"
              ? "Online lesson"
              : `In person · ${
                  confirmation.area ||
                  PUBLIC_BOOKING_COPY.confirmationInPersonArea
                }`}
          </p>
          {selectedSlot ? (
            <p className="text-ink-soft">
              {formatSlotDay(selectedSlot.start, timezone)} ·{" "}
              {formatSlotTime(selectedSlot.start, timezone)}
            </p>
          ) : null}
          {name || email ? (
            <p className="text-ink-soft">
              {[name, email].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {confirmation.address ? (
            <p className="text-ink whitespace-pre-line leading-relaxed">
              {confirmation.address}
            </p>
          ) : null}
          <p className="text-ink-soft leading-relaxed">
            {confirmation.instructions}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted leading-relaxed">
          Payment received. We&apos;re finalizing your confirmation — check your
          email shortly
          {format === "in_person"
            ? ", including the studio address for your visit."
            : ", including the video link details."}
        </p>
      )}

      {onDone ? (
        <button type="button" className="btn-primary w-full" onClick={onDone}>
          Back to home
        </button>
      ) : (
        <Link href="/" className="btn-primary inline-flex w-full justify-center">
          Back to home
        </Link>
      )}
    </div>
  );
};

export default TrialBookingSuccess;
