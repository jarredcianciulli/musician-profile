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

const AccountSuccess: React.FC = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const [data, setData] = useState<AccountPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getAccountSessionToken()) {
        if (!cancelled) {
          setLoading(false);
          setError("Sign in with your magic link to view this page.");
        }
        return;
      }
      setLoading(true);
      setError("");
      try {
        const next = sessionId
          ? await confirmAccountCheckoutSession(sessionId)
          : await fetchAccountMe();
        if (!cancelled) setData(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not confirm payment."
          );
          try {
            const fallback = await fetchAccountMe();
            if (!cancelled) setData(fallback);
          } catch {
            /* keep error */
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const billingMode = data?.enrollment?.billingMode || "";
  const isAuto = billingMode === "auto";

  return (
    <div className="section-container py-16 sm:py-24 max-w-lg">
      {loading ? (
        <p className="text-muted text-sm">Confirming your payment…</p>
      ) : (
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
          {error ? (
            <p className="text-sm text-muted" role="status">
              {error} If you were charged, you’re all set — open your account
              below, or email{" "}
              <a className="underline underline-offset-2" href={`mailto:${studioEmail()}`}>
                {studioEmail()}
              </a>
              .
            </p>
          ) : null}
          <Link href="/account" className="btn-primary inline-flex">
            Continue to account
          </Link>
        </div>
      )}
    </div>
  );
};

export default AccountSuccess;
