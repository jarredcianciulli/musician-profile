import type { Metadata } from "next";
import Link from "next/link";
import {
  STUDIO_POLICY_SECTIONS,
  STUDIO_POLICY_TITLE,
} from "@/content/studioPolicy";
import { PublicShell } from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "Studio policy",
  description:
    "Battery String Studio tuition, reserved weekly slots, make-ups, closures, and cancellation policy.",
};

export default function PolicyPage() {
  return (
    <PublicShell>
      <article className="section-container py-16 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          Battery String Studio
        </p>
        <h1 className="font-display text-4xl text-ink mt-2 mb-8">
          {STUDIO_POLICY_TITLE}
        </h1>
        <div className="space-y-8">
          {STUDIO_POLICY_SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-2xl text-ink mb-2">
                {s.heading}
              </h2>
              <p className="text-ink-soft leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12">
          <Link href="/" className="btn-secondary inline-flex">
            Back to home
          </Link>
        </p>
      </article>
    </PublicShell>
  );
}
