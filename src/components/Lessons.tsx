"use client";

import React, { useState } from "react";
import { contactInfo } from "../config/contactInfo";
import {
  DEFAULT_SUBSCRIPTION_MINUTES,
  PUBLIC_BOOKING_COPY,
  PUBLIC_TRIAL_PRICE,
  PUBLIC_TRIAL_MINUTES,
  SUBSCRIPTION_DURATIONS,
  SUBSCRIPTION_MONTHLY_RATES,
  SubscriptionDuration,
} from "../lib/bookingPolicy";
import { useBooking } from "../context/BookingContext";
import { useIsDesktopBooking } from "../hooks/useMediaQuery";
import SubscriptionBookingFlow from "./booking/SubscriptionBookingFlow";
import Link from "next/link";

const Lessons: React.FC = () => {
  const { openBooking } = useBooking();
  const isDesktop = useIsDesktopBooking();
  const [duration, setDuration] = useState<SubscriptionDuration>(
    DEFAULT_SUBSCRIPTION_MINUTES
  );
  const [subOpen, setSubOpen] = useState(false);

  const monthlyPrice = SUBSCRIPTION_MONTHLY_RATES[duration];

  return (
    <section id="lessons" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
      <div className="section-container">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink mb-3">
            Lessons &amp; pricing
          </h2>
          <p className="text-muted max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Start with a trial, then weekly private lessons billed as one simple
            monthly rate — holidays already accounted for.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md border-2 border-ink overflow-hidden flex flex-col">
            <div className="p-5 sm:p-6 lg:p-8 flex flex-col flex-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold mb-2">
                Start here
              </p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                {PUBLIC_BOOKING_COPY.trialBannerTitle}
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed text-sm sm:text-base">
                {PUBLIC_BOOKING_COPY.trialBannerBody}
              </p>
              <p className="font-display text-5xl sm:text-6xl font-semibold text-ink mb-6">
                ${PUBLIC_TRIAL_PRICE}
                <span className="text-lg font-sans font-medium text-muted ml-2">
                  · {PUBLIC_TRIAL_MINUTES} min
                </span>
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-8 flex-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5" aria-hidden>
                    ✓
                  </span>
                  Meet me and try it — no subscription required
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5" aria-hidden>
                    ✓
                  </span>
                  Studio ({contactInfo.neighborhood}) or online
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5" aria-hidden>
                    ✓
                  </span>
                  Pay securely with Stripe to confirm your time
                </li>
              </ul>
              <button
                type="button"
                onClick={() => openBooking("Lessons Section - Trial")}
                className="btn-primary w-full text-center"
              >
                {PUBLIC_BOOKING_COPY.cta}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md overflow-hidden flex flex-col border border-gray-200">
            <div className="p-5 sm:p-6 lg:p-8 flex flex-col flex-1">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                Weekly private lessons
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed text-sm sm:text-base">
                {PUBLIC_BOOKING_COPY.subscriptionHeader}
              </p>

              <div
                className="inline-flex self-start border border-line bg-paper-muted/50 p-1 mb-6"
                role="group"
                aria-label="Lesson length"
              >
                {SUBSCRIPTION_DURATIONS.map((mins) => {
                  const active = duration === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDuration(mins)}
                      className={`px-3 sm:px-4 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-ink text-paper"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {mins} min
                    </button>
                  );
                })}
              </div>

              <div className="mb-2">
                <p className="font-display text-5xl sm:text-6xl font-semibold text-ink leading-none">
                  ${monthlyPrice}
                  <span className="text-lg sm:text-xl font-sans font-medium text-muted ml-1">
                    /month
                  </span>
                </p>
              </div>
              <p className="text-sm text-muted mb-4 leading-relaxed">
                {PUBLIC_BOOKING_COPY.subscriptionFootnote}
              </p>
              <p className="text-sm text-ink-soft mb-6">
                You&apos;ll pick your weekly day and time, agree to the{" "}
                <Link href="/policy" className="underline hover:text-ink">
                  studio policy
                </Link>
                , then pay. Mid-month starts are billed per lesson for the rest
                of the month, then ${monthlyPrice}/mo from the 1st.
              </p>

              <button
                type="button"
                className="btn-primary w-full mt-auto"
                onClick={() => setSubOpen(true)}
              >
                Reserve a weekly spot
              </button>
            </div>
          </div>
        </div>
      </div>

      <SubscriptionBookingFlow
        isOpen={subOpen}
        onClose={() => setSubOpen(false)}
        mobile={!isDesktop}
      />
    </section>
  );
};

export default Lessons;
