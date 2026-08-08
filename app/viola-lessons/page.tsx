import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import {
  PUBLIC_TRIAL_MINUTES,
  PUBLIC_TRIAL_PRICE,
  SUBSCRIPTION_MONTHLY_RATES,
} from "@/lib/bookingPolicy";
import { contactInfo } from "@/config/contactInfo";

export const metadata: Metadata = {
  title: "Viola lessons in Charleston, SC",
  description:
    "Private viola lessons in the Bowan Village / Charleston area with Jarred Cianciulli. $35 trial lessons and weekly subscriptions.",
  openGraph: {
    title: "Viola lessons | Battery String Studio",
    description:
      "Private viola lessons near Charleston. $35 trial · weekly subscriptions.",
  },
};

export default function ViolaLessonsPage() {
  return (
    <PublicShell>
      <article className="section-container py-16 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          Battery String Studio
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mt-2 mb-6">
          Viola lessons near Charleston
        </h1>
        <p className="text-lg text-ink-soft leading-relaxed mb-6">
          Looking for viola lessons in the Bowan Village / Charleston area?
          Battery String Studio offers private lessons with Jarred Cianciulli —
          start with a ${PUBLIC_TRIAL_PRICE} {PUBLIC_TRIAL_MINUTES}-minute trial,
          then choose a weekly slot if it&apos;s a fit.
        </p>
        <p className="text-ink-soft leading-relaxed mb-8">
          Same studio rates as violin: ${SUBSCRIPTION_MONTHLY_RATES[30]} / $
          {SUBSCRIPTION_MONTHLY_RATES[45]} / ${SUBSCRIPTION_MONTHLY_RATES[60]}{" "}
          monthly for {PUBLIC_TRIAL_MINUTES} / 45 / 60 minute weekly lessons. In
          person at the home studio or online. {contactInfo.phone}.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/trial" className="btn-primary inline-flex">
            Book a ${PUBLIC_TRIAL_PRICE} trial
          </Link>
          <Link href="/lead" className="btn-secondary inline-flex">
            Ask a question
          </Link>
        </div>
      </article>
    </PublicShell>
  );
}
