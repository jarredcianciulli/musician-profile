"use client";

import React from "react";
import Link from "next/link";
import { studioEmail } from "../lib/env";

/** Durable cancel / abandon page after Stripe Checkout (refresh-safe). */
const AccountCanceled: React.FC = () => {
  return (
    <div className="section-container py-16 sm:py-24 max-w-lg">
      <div className="border border-line bg-white px-6 py-8 sm:px-8 sm:py-10 space-y-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted font-semibold">
          Checkout
        </p>
        <h1 className="font-display text-3xl leading-tight">
          Checkout canceled
        </h1>
        <p className="text-base text-ink/90 leading-relaxed">
          No charge was made. You can return to your account anytime and try
          again when you’re ready.
        </p>
        <p className="text-sm text-muted">
          Card declined on Stripe? Stay on that page and try another card, or
          come back here and start checkout again. Questions?{" "}
          <a
            className="underline underline-offset-2"
            href={`mailto:${studioEmail()}`}
          >
            {studioEmail()}
          </a>
        </p>
        <Link href="/account" className="btn-primary inline-flex">
          Back to account
        </Link>
      </div>
    </div>
  );
};

export default AccountCanceled;
