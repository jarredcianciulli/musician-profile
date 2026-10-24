"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  confirmAccountCheckoutSession,
  fetchAccountMe,
  getAccountSessionToken,
  type AccountPortalData,
} from "../lib/bookingApi";
import { studioEmail } from "../lib/env";

type Outcome = "loading" | "ok" | "incomplete" | "unsigned" | "error";

const AccountSuccess: React.FC = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const [data, setData] = useState<AccountPortalData | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getAccountSessionToken()) {
        if (!cancelled) setOutcome("unsigned");
        return;
      }
      setOutcome("loading");
      setError("");
      try {
        if (!sessionId) {
          const me = await fetchAccountMe();
          if (cancelled) return;
          setData(me);
          const ready =
            (me.enrollment.billingMode === "auto" &&
              me.enrollment.hasAutoBilling) ||
            ((me.enrollment.amountDueCents || 0) <= 0 &&
              Boolean(me.enrollment.paidThroughPeriodKey));
          setOutcome(ready ? "ok" : "incomplete");
          return;
        }
        const next = await confirmAccountCheckoutSession(sessionId);
        if (cancelled) return;
        setData(next);
        setOutcome(next.confirmed ? "ok" : "incomplete");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not confirm payment."
        );
        try {
          const fallback = await fetchAccountMe();
          if (!cancelled) setData(fallback);
        } catch {
          /* keep error */
        }
        setOutcome("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const isAuto = data?.enrollment?.billingMode === "auto";

  return (
    <div className="section-container py-16 sm:py-24 max-w-lg">
      {outcome === "loading" ? (
        <p className="text-muted text-sm">Confirming your payment…</p>
      ) : outcome === "ok" ? (
        <div className="border border-line bg-white px-6 py-8 sm:px-8 sm:py-10 space-y-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
            Payment
          </p>
          <h1 className="font-display text-4xl leading-tight">Thank you!</h1>
          <p className="text-base text-ink/90 leading-relaxed">
            {isAuto
              ? "You’re set up for automatic payments on the 1st of each month. Let’s make some music."
              : "Your payment was received. Let’s make some music."}
          </p>
          <Link href="/account" className="btn-primary inline-flex">
            Continue to account
          </Link>
        </div>
      ) : outcome === "unsigned" ? (
        <div className="border border-line bg-white px-6 py-8 space-y-5">
          <h1 className="font-display text-3xl leading-tight">
            Sign in to continue
          </h1>
          <p className="text-ink-soft leading-relaxed">
            Open the magic link from your invite email, then return here if
            needed.
          </p>
          <Link href="/account" className="btn-primary inline-flex">
            Go to account
          </Link>
        </div>
      ) : (
        <div className="border border-line bg-white px-6 py-8 sm:px-8 sm:py-10 space-y-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted font-semibold">
            Payment
          </p>
          <h1 className="font-display text-3xl leading-tight">
            Payment not completed
          </h1>
          <p className="text-base text-ink/90 leading-relaxed">
            We couldn’t confirm a successful charge
            {error ? ` (${error})` : ""}. No worries — you can try again from
            your account. If you believe you were charged, email{" "}
            <a
              className="underline underline-offset-2"
              href={`mailto:${studioEmail()}`}
            >
              {studioEmail()}
            </a>
            .
          </p>
          <Link href="/account" className="btn-primary inline-flex">
            Back to account
          </Link>
        </div>
      )}
    </div>
  );
};

export default AccountSuccess;
