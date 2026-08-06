import React, { useState } from "react";
import { contactInfo } from "../config/contactInfo";
import { analytics } from "../utils/analytics";
import BookingModal from "./BookingModal";
import {
  DEFAULT_SUBSCRIPTION_MINUTES,
  PUBLIC_BOOKING_COPY,
  PUBLIC_TRIAL_PRICE,
  PUBLIC_TRIAL_MINUTES,
  SUBSCRIPTION_DURATIONS,
  SUBSCRIPTION_MONTHLY_RATES,
  SubscriptionDuration,
} from "../lib/bookingPolicy";

const Lessons: React.FC = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [duration, setDuration] = useState<SubscriptionDuration>(
    DEFAULT_SUBSCRIPTION_MINUTES
  );

  const monthlyPrice = SUBSCRIPTION_MONTHLY_RATES[duration];

  const openTrialBooking = (source: string) => {
    analytics.bookingModalOpened(source);
    setIsBookingModalOpen(true);
  };

  return (
    <section id="lessons" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
      <div className="w-full px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Lessons &amp; Pricing
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Start with a trial, then weekly private lessons billed as one simple
            monthly rate — in the {contactInfo.neighborhood} or online.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto">
          {/* Trial — start here */}
          <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md border-2 border-ink overflow-hidden flex flex-col">
            <div className="bg-ink text-paper px-5 sm:px-6 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold">
                Start here
              </p>
            </div>
            <div className="p-5 sm:p-6 lg:p-8 flex flex-col flex-1">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                Trial lesson
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed text-sm sm:text-base">
                Meet me and try it out, no commitment.
              </p>
              <div className="mb-6">
                <p className="font-display text-5xl sm:text-6xl font-semibold text-ink leading-none">
                  ${PUBLIC_TRIAL_PRICE}
                </p>
                <p className="text-muted mt-2 text-sm sm:text-base">
                  {PUBLIC_TRIAL_MINUTES} minutes · violin or viola
                </p>
              </div>
              <ul className="space-y-2 mb-8 text-sm sm:text-base text-gray-700 flex-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5" aria-hidden>
                    ✓
                  </span>
                  See if we&apos;re a good fit
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
                  No subscription required to book
                </li>
              </ul>
              <button
                type="button"
                onClick={() => openTrialBooking("Lessons Section - Trial")}
                className="btn-primary w-full"
              >
                {PUBLIC_BOOKING_COPY.cta}
              </button>
            </div>
          </div>

          {/* Subscription */}
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
              <p className="text-sm text-muted mb-8 leading-relaxed">
                {PUBLIC_BOOKING_COPY.subscriptionFootnote}
              </p>

              <ul className="space-y-2 mb-8 text-sm sm:text-base text-gray-700 flex-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5" aria-hidden>
                    ✓
                  </span>
                  One-on-one instruction, your goals and pacing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5" aria-hidden>
                    ✓
                  </span>
                  Same rate at the studio or online
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5" aria-hidden>
                    ✓
                  </span>
                  Set up after your trial — no surprise bills
                </li>
              </ul>

              <button
                type="button"
                onClick={() => openTrialBooking("Lessons Section - Subscription CTA")}
                className="w-full px-6 py-3 font-bold rounded-lg bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-50 transition-colors"
              >
                Start with a trial
              </button>
            </div>
          </div>
        </div>

        {/* What to Expect */}
        <div className="mt-12 sm:mt-16 lg:mt-20 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-6 sm:p-8 lg:p-12">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-8 sm:mb-10 lg:mb-12">
              What to Expect
            </h3>

            <div className="space-y-8 sm:space-y-10 lg:space-y-12">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-primary-100 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Flexible Scheduling
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                    Mondays 6–8pm and Saturdays 8–11am ET — in person or online
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-primary-100 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    {contactInfo.neighborhood}
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                    In-person lessons at my home studio in the{" "}
                    {contactInfo.neighborhood}, {contactInfo.city},{" "}
                    {contactInfo.state} — or online by video. Same rate either way.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-primary-100 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    All Ages Welcome
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                    Teaching children, teens, and adults with customized
                    approaches for each age group
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  );
};

export default Lessons;
