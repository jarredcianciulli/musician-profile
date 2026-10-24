"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_SUBSCRIPTION_MINUTES,
  SUBSCRIPTION_DURATIONS,
  SUBSCRIPTION_MONTHLY_RATES,
  type SubscriptionDuration,
} from "@/lib/bookingPolicy";
import {
  PER_LESSON_CENTS,
  TEACHING_WEEKS_PER_YEAR,
  computeProration,
  weekdayFromDate,
} from "@/lib/subscriptionProration";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function money(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

function todayLocalInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLongDate(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

function formatMonthDay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

const TuitionCalc: React.FC = () => {
  const [duration, setDuration] = useState<SubscriptionDuration>(
    DEFAULT_SUBSCRIPTION_MINUTES
  );
  const [startDate, setStartDate] = useState(todayLocalInputValue);

  const monthly = SUBSCRIPTION_MONTHLY_RATES[duration];
  const perLesson = PER_LESSON_CENTS[duration] / 100;
  const annual = monthly * 12;
  const impliedFromLessons = perLesson * TEACHING_WEEKS_PER_YEAR;

  const result = useMemo(() => {
    const wd = weekdayFromDate(`${startDate}T12:00:00`);
    if (wd == null) return null;
    try {
      return computeProration({
        durationMinutes: duration,
        preferredWeekday: wd,
        startDate: new Date(`${startDate}T12:00:00`),
      });
    } catch {
      return null;
    }
  }, [duration, startDate]);

  const weekdayLabel =
    result != null ? WEEKDAY_NAMES[result.preferredWeekday] : null;

  return (
    <div className="max-w-2xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
        Tuition calculator
      </p>
      <h1 className="font-display text-4xl md:text-5xl text-ink mt-2 mb-3">
        How monthly lessons are priced
      </h1>
      <p className="text-ink-soft leading-relaxed mb-10">
        Same rate every month — holidays already built in. Mid-month starts are
        billed per remaining lesson, then the flat monthly rate begins on the
        1st.
      </p>

      <section className="mb-12 space-y-5">
        <h2 className="font-display text-2xl text-ink">The monthly rate</h2>
        <p className="text-ink-soft leading-relaxed">
          Lessons are weekly. The studio takes about six weeks off each year for
          holidays and summer — roughly{" "}
          <strong className="text-ink">{TEACHING_WEEKS_PER_YEAR} teaching
          weeks</strong>{" "}
          out of 52. Your annual tuition is spread evenly across{" "}
          <strong className="text-ink">twelve months</strong>, so you pay the
          same amount every month, including months with a break.
        </p>

        <div className="border border-line bg-white px-5 py-5 space-y-3 text-sm">
          <p className="text-xs uppercase tracking-wider text-muted">
            Example · {duration}-minute weekly lessons
          </p>
          <ul className="space-y-2 text-ink-soft">
            <li>
              Per-lesson rate (mid-month starts):{" "}
              <strong className="text-ink">{money(perLesson)}</strong>
            </li>
            <li>
              Teaching weeks / year:{" "}
              <strong className="text-ink">{TEACHING_WEEKS_PER_YEAR}</strong>
            </li>
            <li>
              About {TEACHING_WEEKS_PER_YEAR} × {money(perLesson)} ≈{" "}
              <strong className="text-ink">{money(Math.round(impliedFromLessons))}</strong>{" "}
              for the year
            </li>
            <li>
              Divided by 12 months →{" "}
              <strong className="text-ink text-base">{money(monthly)}/mo</strong>
            </li>
          </ul>
          <p className="text-xs text-muted pt-1 border-t border-line">
            Published rates: {money(annual)}/year billed as {money(monthly)} each
            month. The six off weeks are already subtracted — you&apos;re not
            charged for weeks the studio is closed.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {SUBSCRIPTION_DURATIONS.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setDuration(mins)}
              className={`border px-3 py-3 text-sm transition-colors ${
                duration === mins
                  ? "border-sky-deep bg-sky-deep/5 text-ink"
                  : "border-line bg-white text-ink-soft hover:border-ink/30"
              }`}
            >
              <span className="block font-display text-xl text-ink">
                {money(SUBSCRIPTION_MONTHLY_RATES[mins])}
              </span>
              <span className="text-xs text-muted">{mins} min / wk</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-12 space-y-5">
        <h2 className="font-display text-2xl text-ink">
          Starting mid-month
        </h2>
        <p className="text-ink-soft leading-relaxed">
          If your first lesson isn&apos;t on the 1st, that partial month is
          billed{" "}
          <strong className="text-ink">per remaining weekly lesson</strong> at
          the flat lesson rate. Your smooth monthly subscription begins the
          first of the following month.
        </p>

        <div className="border border-line bg-white px-5 py-5 space-y-4">
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-muted">
              First lesson date
            </span>
            <input
              type="date"
              className="admin-input mt-1 w-full max-w-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          {result && weekdayLabel ? (
            <div className="space-y-3 text-sm border-t border-line pt-4">
              <p className="text-ink-soft">
                Weekly day: <strong className="text-ink">{weekdayLabel}</strong>
                {" · "}
                First lesson:{" "}
                <strong className="text-ink">
                  {formatLongDate(startDate)}
                </strong>
              </p>
              <p className="text-ink leading-relaxed text-base">
                {result.remainingLessons} lesson
                {result.remainingLessons === 1 ? "" : "s"} left this month ×{" "}
                {money(result.perLessonDollars)} ={" "}
                <strong>{money(result.prorateDollars)}</strong> due for the
                first period
              </p>
              <p className="text-ink-soft">
                Then {money(result.monthlyRate)}/mo starting{" "}
                {formatMonthDay(result.nextCycleStartIso)}.
              </p>
              {result.remainingLessons === 0 ? (
                <p className="text-xs text-muted">
                  No remaining {weekdayLabel}s in this calendar month from that
                  start date — pick an earlier date, or the first of next month
                  begins at the full monthly rate.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">Choose a valid first lesson date.</p>
          )}
        </div>
      </section>

      <section className="mb-10 space-y-3 text-sm text-ink-soft leading-relaxed">
        <h2 className="font-display text-2xl text-ink">In short</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {money(monthly)}/mo is your year of weekly {duration}-minute lessons,
            averaged over 12 months with studio breaks already included.
          </li>
          <li>
            Mid-month: pay only for the remaining weekly lessons that month at{" "}
            {money(perLesson)} each, then the monthly rate from the 1st.
          </li>
          <li>
            Full studio policy (make-ups, pausing, canceling) is on the{" "}
            <Link href="/policy" className="underline underline-offset-2 text-sky-deep">
              policy page
            </Link>
            .
          </li>
        </ul>
      </section>

      <p className="flex flex-wrap gap-3">
        <Link href="/trial" className="btn-primary inline-flex">
          Book a trial
        </Link>
        <Link href="/#lessons" className="btn-secondary inline-flex">
          Lesson options
        </Link>
      </p>
    </div>
  );
};

export default TuitionCalc;
