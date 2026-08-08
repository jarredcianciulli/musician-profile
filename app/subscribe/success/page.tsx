import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "Subscription confirmed",
  robots: { index: false, follow: false },
};

export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <PublicShell>
      <div className="section-container py-20 max-w-lg">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          Confirmed
        </p>
        <h1 className="font-display text-4xl text-ink mt-2 mb-4">
          Your weekly spot is reserved
        </h1>
        <p className="text-ink-soft leading-relaxed mb-6">
          Thanks — your subscription checkout completed
          {session_id ? " and payment was received" : ""}. You&apos;ll get a
          confirmation email shortly. Your monthly tuition holds this lesson
          time each week.
        </p>
        <Link href="/" className="btn-primary inline-flex">
          Back to home
        </Link>
      </div>
    </PublicShell>
  );
}
