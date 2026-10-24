import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import StudioPolicyBody from "@/components/StudioPolicyBody";

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
        <StudioPolicyBody variant="article" />
        <p className="mt-12">
          <Link href="/" className="btn-secondary inline-flex">
            Back to home
          </Link>
        </p>
      </article>
    </PublicShell>
  );
}
