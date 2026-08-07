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
import { computeProration } from "../lib/subscriptionProration";
import { startSubscriptionCheckout } from "../lib/bookingApi";
import { useBooking } from "../context/BookingContext";

const Lessons: React.FC = () => {
  const { openBooking } = useBooking();
  const [duration, setDuration] = useState<SubscriptionDuration>(
    DEFAULT_SUBSCRIPTION_MINUTES
  );
  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subError, setSubError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const monthlyPrice = SUBSCRIPTION_MONTHLY_RATES[duration];
  const proration = computeProration({ durationMinutes: duration });

  const startSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError("");
    setSubmitting(true);
    try {
      const result = await startSubscriptionCheckout({
        name: subName.trim(),
        email: subEmail.trim(),
        durationMinutes: duration,
      });
      window.location.href = result.url;
    } catch (err) {
      setSubError(
        err instanceof Error ? err.message : "Could not start subscription."
      );
      setSubmitting(false);
    }
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
                  Pay securely with Stripe to confirm your time
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
                Starting mid-month: about{" "}
                <strong>${proration.prorateDollars}</strong> for roughly{" "}
                {proration.remainingLessons} lesson
                {proration.remainingLessons === 1 ? "" : "s"} left this month
                (exact amount depends on which day you take), then $
                {monthlyPrice}/mo.
              </p>

              <form className="space-y-3 mt-auto" onSubmit={startSub}>
                <input
                  className="w-full border border-line bg-white px-3 py-2.5 text-ink"
                  placeholder="Name"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  className="w-full border border-line bg-white px-3 py-2.5 text-ink"
                  placeholder="Email"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  required
                />
                {subError && (
                  <p className="text-sm text-accent" role="alert">
                    {subError}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full px-6 py-3 font-bold rounded-lg bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Redirecting…" : "Start subscription"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 lg:mt-20 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-6 sm:p-8 lg:p-12">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-8">
              What to Expect
            </h3>
            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">
                  Flexible Scheduling
                </h4>
                <p className="text-gray-600 text-sm sm:text-base">
                  Mondays 6–8pm and Saturdays 8–11am ET — in person or online
                </p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">
                  {contactInfo.neighborhood}
                </h4>
                <p className="text-gray-600 text-sm sm:text-base">
                  In-person at my home studio in the {contactInfo.neighborhood},{" "}
                  {contactInfo.city}, {contactInfo.state} — or online. Same rate
                  either way.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">
                  All Ages Welcome
                </h4>
                <p className="text-gray-600 text-sm sm:text-base">
                  Children, teens, and adults with customized approaches for each
                  age group.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Lessons;
