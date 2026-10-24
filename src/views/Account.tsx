"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
import { formatSlotDay, formatSlotTime } from "../lib/slots";

const TZ = "America/New_York";

function formatMoney(cents: number) {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
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
            // Drop token from URL without full reload
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
      const result = await requestAccountMagicLink(email.trim());
      setLinkSent(true);
      setError("");
      void result;
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
      <div className="section-container py-20 max-w-lg">
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
          Sign in with email
        </h1>
        <p className="text-ink-soft mb-8 leading-relaxed">
          Enter the email on your studio invite. We&apos;ll send a magic link —
          no password.
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
        <form onSubmit={onRequestLink} className="space-y-4">
          <label className="block text-sm">
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
            className="btn-primary w-full"
            disabled={requesting || !email.trim()}
          >
            {requesting ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
        <p className="text-sm text-muted mt-8">
          <Link href="/" className="underline underline-offset-2">
            Back to home
          </Link>
        </p>
      </div>
    );
  }

  const { enrollment, schedule, payments } = data;
  const due = enrollment.amountDueCents || 0;
  const mode = enrollment.billingMode || "unset";
  const showChoice = mode === "unset";
  const showManualPay = mode === "manual";

  return (
    <div className="section-container py-16 max-w-xl">
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
          Payment received — thank you. Your schedule and billing status are
          below.
        </p>
      ) : null}
      {canceledBanner ? (
        <p className="text-sm text-muted mb-6">Checkout canceled. You can try again anytime.</p>
      ) : null}
      {error ? (
        <p className="text-sm text-accent mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mb-10">
        <h2 className="font-display text-2xl mb-2">Upcoming lessons</h2>
        <p className="text-sm text-muted mb-4">
          {enrollment.durationMinutes}-minute{" "}
          {enrollment.format === "online" ? "online" : "in-person"} weekly spot
        </p>
        {schedule.length === 0 ? (
          <p className="text-sm text-ink-soft">No upcoming times listed yet.</p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-white">
            {schedule.map((lesson) => (
              <li
                key={lesson.start}
                className="px-4 py-3 flex justify-between gap-3 text-sm"
              >
                <span>{formatSlotDay(lesson.start, TZ)}</span>
                <span className="text-ink-soft">
                  {formatSlotTime(lesson.start, TZ)}
                  {lesson.end ? ` – ${formatSlotTime(lesson.end, TZ)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl mb-2">Billing</h2>
        {mode === "auto" && enrollment.stripeSubscriptionId ? (
          <div className="border border-line bg-white px-4 py-4 text-sm space-y-1">
            <p className="font-medium">Auto-charge monthly</p>
            <p className="text-ink-soft">
              Card on file
              {enrollment.nextDueAt
                ? ` · renews around ${formatSlotDay(enrollment.nextDueAt, TZ)}`
                : ""}
            </p>
            <p className="text-muted">Nothing due right now.</p>
          </div>
        ) : (
          <div className="border border-line bg-white px-4 py-4 text-sm space-y-3">
            <p>
              <span className="text-muted">Amount due this period: </span>
              <span className="font-medium text-lg">{formatMoney(due)}</span>
            </p>
            {enrollment.paidThroughPeriodKey ? (
              <p className="text-muted text-xs">
                Paid through {enrollment.paidThroughPeriodKey}
              </p>
            ) : null}

            {showChoice ? (
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
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
                  : `Pay ${formatMoney(due)}`}
              </button>
            ) : (
              <p className="text-muted">You&apos;re paid up for this period.</p>
            )}

            {showChoice ? (
              <p className="text-xs text-muted leading-relaxed pt-1">
                Auto-charge keeps a card on file and bills monthly. Or pay
                only what&apos;s due now and come back each month with a magic
                link.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {(payments || []).length > 0 ? (
        <section>
          <h2 className="font-display text-xl mb-3">Recent payments</h2>
          <ul className="text-sm divide-y divide-line border border-line bg-white">
            {payments.slice(0, 8).map((p) => (
              <li
                key={p.id}
                className="px-4 py-2.5 flex justify-between gap-2"
              >
                <span className="text-ink-soft">
                  {p.kind}
                  {p.periodKey ? ` · ${p.periodKey}` : ""}
                </span>
                <span>
                  {formatMoney(p.amountCents)}{" "}
                  <span className="text-muted">{p.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default Account;
