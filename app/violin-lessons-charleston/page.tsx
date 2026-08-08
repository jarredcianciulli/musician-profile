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
  title: "Violin lessons in Charleston, SC",
  description:
    "Private violin lessons in the Bowan Village area of Charleston, SC with Jarred Cianciulli. Book a $35 thirty-minute trial or weekly lessons.",
  openGraph: {
    title: "Violin lessons in Charleston | Battery String Studio",
    description:
      "Private violin lessons near Bowan Village. $35 trial · weekly subscriptions.",
  },
};

export default function ViolinLessonsPage() {
  return (
    <PublicShell>
      <article className="section-container py-16 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          Battery String Studio
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mt-2 mb-6">
          Violin lessons in Charleston
        </h1>
        <p className="text-lg text-ink-soft leading-relaxed mb-6">
          Private violin and viola lessons in the Bowan Village area of
          Charleston, SC. Book a ${PUBLIC_TRIAL_PRICE} {PUBLIC_TRIAL_MINUTES}
          -minute trial with Jarred Cianciulli — all ages welcome, in person or
          online.
        </p>
        <p className="text-ink-soft leading-relaxed mb-8">
          Weekly lesson subscriptions run {PUBLIC_TRIAL_MINUTES}, 45, or 60
          minutes (${SUBSCRIPTION_MONTHLY_RATES[30]} / $
          {SUBSCRIPTION_MONTHLY_RATES[45]} / ${SUBSCRIPTION_MONTHLY_RATES[60]}{" "}
          per month). Teaching windows are typically Monday evening and Saturday
          morning. Call {contactInfo.phone} or book online.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/trial" className="btn-primary inline-flex">
            Book a ${PUBLIC_TRIAL_PRICE} trial
          </Link>
          <Link href="/#lessons" className="btn-secondary inline-flex">
            See weekly pricing
          </Link>
        </div>
      </article>
    </PublicShell>
  );
}
