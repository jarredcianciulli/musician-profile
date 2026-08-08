import type { Metadata } from "next";
import { Suspense } from "react";
import TrialPage from "@/views/Trial";

export const metadata: Metadata = {
  title: "Book your $35 trial",
  description:
    "Book a 30-minute violin or viola trial lesson at Battery String Studio — $35, no subscription required.",
  robots: { index: true, follow: true },
};

export default function TrialRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">
          Loading…
        </div>
      }
    >
      <TrialPage />
    </Suspense>
  );
}
