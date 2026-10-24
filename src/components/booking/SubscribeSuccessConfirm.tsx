"use client";

import { useEffect, useState } from "react";
import { fetchSubscriptionBySession } from "@/lib/bookingApi";

type Props = {
  sessionId?: string;
};

/**
 * Confirms the Stripe Checkout session on return (and sends Brevo emails)
 * even if the webhook lagged or failed — same pattern as trial success.
 */
export function SubscribeSuccessConfirm({ sessionId }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">(
    sessionId ? "loading" : "idle"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { subscription } = await fetchSubscriptionBySession(sessionId);
        if (cancelled) return;
        if (subscription.emailError && !subscription.emailsSentAt) {
          setState("error");
          setMessage(
            "Payment is confirmed, but the confirmation email could not be sent. We’ll follow up shortly."
          );
          return;
        }
        setState("ok");
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Could not confirm subscription yet. If you were charged, email jarred@batterystringstudio.com."
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId || state === "idle" || state === "loading") {
    return state === "loading" ? (
      <p className="text-sm text-muted mb-6">Confirming your subscription…</p>
    ) : null;
  }

  if (state === "error") {
    return (
      <p className="text-sm text-accent mb-6 border border-line bg-white px-3 py-2">
        {message}
      </p>
    );
  }

  return null;
}
