import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/PublicShell";
import LeadForm from "@/views/Lead";

export const metadata: Metadata = {
  title: "Get in touch about violin & viola lessons",
  description:
    "Interested in private violin or viola lessons near Bowan Village / Charleston? Leave your details or book a $35 trial.",
  robots: { index: true, follow: true },
};

export default function LeadPage() {
  return (
    <PublicShell>
      <article className="section-container py-16 relative">
        <Suspense
          fallback={
            <p className="text-sm text-muted">Loading form…</p>
          }
        >
          <LeadForm />
        </Suspense>
      </article>
    </PublicShell>
  );
}
