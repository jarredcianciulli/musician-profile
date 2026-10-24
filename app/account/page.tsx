import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/PublicShell";
import Account from "@/views/Account";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <PublicShell>
      <Suspense
        fallback={
          <div className="section-container py-20 max-w-lg">
            <p className="text-muted text-sm">Loading your account…</p>
          </div>
        }
      >
        <Account />
      </Suspense>
    </PublicShell>
  );
}
