"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  clearAccountSessionToken,
  exchangeAccountMagicToken,
  fetchAccountMe,
  getAccountSessionToken,
  requestAccountMagicLink,
  startAccountCheckout,
  type AccountPortalData,
} from "../lib/bookingApi";
import {
  buildLessonsIcs,
  downloadIcs,
  googleCalendarUrlForLesson,
} from "../lib/accountCalendar";
import { formatSlotDay, formatSlotTime } from "../lib/slots";
import { marketingSiteUrl, studioEmail } from "../lib/env";

const TZ = "America/New_York";

function formatMoney(cents: number) {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Paid";
    case "due":
      return "Due now";
    case "upcoming":
      return "Scheduled";
    case "scheduled":
      return "Scheduled";
    case "holiday":
      return "Holiday";
    case "break":
      return "Break";
    default:
      return status;
  }
}

const Account: React.FC = () => {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AccountPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState<"auto" | "manual" | null>(
    null
  );
  const paidBanner = searchParams.get("paid") === "1";
  const canceledBanner = searchParams.get("canceled") === "1";

  useEffect(() => {
    let cancelled = false;
    const token = searchParams.get("token");

    async function boot() {
      setLoading(true);
      setError("");
      try {
        if (token) {
          const next = await exchangeAccountMagicToken(token);
          if (!cancelled) {
            setData(next);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("token");
              window.history.replaceState({}, "", url.pathname + url.search);
            }
          }
          return;
        }
        if (getAccountSessionToken()) {
          const next = await fetchAccountMe();
          if (!cancelled) setData(next);
          return;
        }
        if (!cancelled) setData(null);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Could not sign in.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const refresh = async () => {
    try {
      const next = await fetchAccountMe();
      setData(next);
      setError("");
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Session expired.");
    }
  };

  useEffect(() => {
    if (!paidBanner || !getAccountSessionToken()) return;
    const t = window.setTimeout(() => {
      void refresh();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [paidBanner]);

  const onRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    setError("");
    setLinkSent(false);
    try {
      await requestAccountMagicLink(email.trim());
      setLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send link.");
    } finally {
      setRequesting(false);
    }
  };

  const onCheckout = async (mode: "auto" | "manual") => {
    setCheckoutBusy(mode);
    setError("");
    try {
      const { url } = await startAccountCheckout(mode);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setCheckoutBusy(null);
    }
  };

  const signOut = () => {
    clearAccountSessionToken();
    setData(null);
  };

  if (loading) {
    return (
      <div className="section-container py-20 max-w-2xl">
        <p className="text-muted text-sm">Loading your account…</p>
      </div>
    );
  }

  if (!data?.enrollment) {
    return (
      <div className="section-container py-16 max-w-md">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          Student account
        </p>
        <h1 className="font-display text-4xl text-ink mt-2 mb-3">
          Need a sign-in link?
        </h1>
        <p className="text-ink-soft mb-6 leading-relaxed">
          Open the magic link from your invite email, or email the studio for a
          fresh one — we&apos;ll resend it from Admin.
        </p>
        <p className="mb-8">
          <a
            className="btn-primary inline-flex"
            href={`mailto:${studioEmail()}?subject=${encodeURIComponent(
              "Please resend my Battery String Studio account link"
            )}`}
          >
            Email {studioEmail()}
          </a>
        </p>
        {error ? (
          <p className="text-sm text-accent mb-4" role="alert">
            {error}
          </p>
        ) : null}
        {linkSent ? (
          <p className="text-sm text-ink-soft mb-4 border border-line bg-paper-muted/50 px-4 py-3">
            If that email is on file, a sign-in link is on its way. Check your
            inbox (and spam).
          </p>
        ) : null}
        <details className="text-sm text-muted">
          <summary className="cursor-pointer hover:text-ink">
            Already invited? Request a link to this email
          </summary>
          <form onSubmit={onRequestLink} className="space-y-4 mt-4">
            <label className="block text-sm text-ink">
              <span className="text-muted text-xs uppercase tracking-wider">
                Email
              </span>
              <input
                type="email"
                className="admin-input mt-1 w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <button
              type="submit"
              className="btn-secondary w-full"
              disabled={requesting || !email.trim()}
            >
              {requesting ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        </details>
        <p className="text-sm text-muted mt-8">
          <a
            href={marketingSiteUrl()}
            className="underline underline-offset-2"
          >
            Studio website
          </a>
        </p>
      </div>
    );
  }

  const { enrollment, schedule, billingItems, payments } = data;
  const due = enrollment.amountDueCents || 0;
  const mode = enrollment.billingMode || "manual";
  const autoReady = mode === "auto" && Boolean(enrollment.stripeSubscriptionId);
  const showAutoSetup = mode === "auto" && !enrollment.stripeSubscriptionId;
  const showManualPay = mode === "manual" || mode === "unset";
  const showChoice = mode === "unset";

  const lessonsOnly = (schedule || [])
    .filter((row) => row.type === "lesson" && row.start && row.end)
    .map((row) => ({
      start: row.start,
      end: row.end as string,
      title: row.title,
    }));
  const lessonTitle = `Lesson — ${enrollment.name}`;
  const billingRows = billingItems || [];

  const downloadAllCalendars = () => {
    const ics = buildLessonsIcs(lessonsOnly, {
      name: enrollment.name,
      calendarName: `BSS — ${enrollment.name}`,
    });
    downloadIcs(
      `bss-lessons-${enrollment.name.replace(/\s+/g, "-").toLowerCase()}.ics`,
      ics
    );
  };

  return (
    <div className="section-container py-12 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
            Your account
          </p>
          <h1 className="font-display text-4xl text-ink mt-2">
            {enrollment.name}
          </h1>
          <p className="text-muted text-sm mt-1">{enrollment.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="text-xs text-muted underline underline-offset-2 shrink-0"
        >
          Sign out
        </button>
      </div>

      {paidBanner ? (
        <p className="text-sm border border-line bg-paper-muted/50 px-4 py-3 mb-6">
          Payment received — thank you.
        </p>
      ) : null}
      {canceledBanner ? (
        <p className="text-sm text-muted mb-6">
          Checkout canceled. You can try again anytime.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-accent mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display text-2xl">Schedule</h2>
            <p className="text-sm text-muted mt-1">
              {enrollment.durationMinutes}-minute{" "}
              {enrollment.format === "online" ? "online" : "in-person"} · next{" "}
              {enrollment.scheduleMonths || 12} months
            </p>
          </div>
          {lessonsOnly.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={downloadAllCalendars}
              >
                Apple Calendar (.ics)
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={downloadAllCalendars}
              >
                Google Calendar (.ics)
              </button>
              {lessonsOnly[0] ? (
                <a
                  className="btn-secondary text-xs inline-flex items-center"
                  href={googleCalendarUrlForLesson(
                    lessonsOnly[0],
                    lessonTitle
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Next lesson → Google
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <p className="text-xs text-muted mb-3">
          Download .ics once, then open in Apple Calendar or import in Google
          Calendar (Settings → Import).
        </p>
        {(schedule || []).length === 0 ? (
          <p className="text-sm text-ink-soft">No upcoming times listed yet.</p>
        ) : (
          <div className="border border-line bg-white overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Time / note</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => {
                  const isOff =
                    row.type === "holiday" || row.type === "break";
                  return (
                    <tr
                      key={`${row.type}-${row.start}`}
                      className={`border-b border-line/70 last:border-0 ${
                        isOff ? "bg-paper-muted/40" : ""
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatSlotDay(row.start, TZ)}
                      </td>
                      <td className="px-3 py-2 capitalize">
                        {row.type === "lesson"
                          ? "Lesson"
                          : row.type === "break"
                            ? "Break"
                            : "Holiday"}
                      </td>
                      <td className="px-3 py-2 text-ink-soft">
                        {isOff
                          ? row.title ||
                            (row.holidayStart && row.holidayEnd
                              ? `${row.holidayStart} → ${row.holidayEnd}`
                              : "Studio closed")
                          : `${formatSlotTime(row.start, TZ)}${
                              row.end
                                ? ` – ${formatSlotTime(row.end, TZ)}`
                                : ""
                            }`}
                      </td>
                      <td className="px-3 py-2">
                        {statusLabel(row.status || row.type)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl mb-2">Billing</h2>
        {autoReady ? (
          <div className="border border-line bg-white px-4 py-4 text-sm space-y-1 mb-4">
            <p className="font-medium">Auto-charge monthly</p>
            <p className="text-ink-soft">
              Card on file
              {enrollment.nextDueAt
                ? ` · renews around ${formatSlotDay(enrollment.nextDueAt, TZ)}`
                : ""}
            </p>
          </div>
        ) : showAutoSetup ? (
          <div className="border border-line bg-white px-4 py-4 text-sm space-y-3 mb-4">
            <p className="font-medium">Set up monthly auto-charge</p>
            <p className="text-ink-soft">
              First period: {formatMoney(due)} (proration if mid-month), then
              monthly tuition on your card.
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={Boolean(checkoutBusy)}
              onClick={() => onCheckout("auto")}
            >
              {checkoutBusy === "auto" ? "Redirecting…" : "Continue to Stripe"}
            </button>
          </div>
        ) : (
          <div className="border border-line bg-white px-4 py-4 text-sm space-y-3 mb-4">
            {showChoice ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={Boolean(checkoutBusy)}
                  onClick={() => onCheckout("auto")}
                >
                  {checkoutBusy === "auto"
                    ? "Redirecting…"
                    : "Auto-charge monthly"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={Boolean(checkoutBusy) || due <= 0}
                  onClick={() => onCheckout("manual")}
                >
                  {checkoutBusy === "manual"
                    ? "Redirecting…"
                    : `Pay ${formatMoney(due)} this period`}
                </button>
              </div>
            ) : showManualPay && due > 0 ? (
              <button
                type="button"
                className="btn-primary"
                disabled={Boolean(checkoutBusy)}
                onClick={() => onCheckout("manual")}
              >
                {checkoutBusy === "manual"
                  ? "Redirecting…"
                  : `Pay ${formatMoney(due)} due now`}
              </button>
            ) : (
              <p className="text-muted">You&apos;re paid up for this period.</p>
            )}
          </div>
        )}

        {billingRows.length > 0 ? (
          <div className="border border-line bg-white overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {billingRows.map((item) => (
                  <tr
                    key={item.periodKey}
                    className={`border-b border-line/70 last:border-0 ${
                      item.status === "due" ? "bg-paper-muted/50" : ""
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                      {item.periodKey}
                    </td>
                    <td className="px-3 py-2 text-ink-soft">{item.label}</td>
                    <td className="px-3 py-2">
                      {formatMoney(item.amountCents)}
                    </td>
                    <td className="px-3 py-2">{statusLabel(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {(payments || []).some((p) => p.status === "paid") ? (
        <section>
          <h2 className="font-display text-xl mb-3">Payment history</h2>
          <ul className="text-sm divide-y divide-line border border-line bg-white">
            {payments
              .filter((p) => p.status === "paid")
              .slice(0, 12)
              .map((p) => (
                <li
                  key={p.id}
                  className="px-4 py-2.5 flex justify-between gap-2"
                >
                  <span className="text-ink-soft">
                    {p.kind}
                    {p.periodKey ? ` · ${p.periodKey}` : ""}
                  </span>
                  <span>{formatMoney(p.amountCents)}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default Account;
