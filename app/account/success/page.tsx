import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountShell } from "@/components/AccountShell";
import AccountSuccess from "@/views/AccountSuccess";

export const metadata: Metadata = {
  title: "Payment confirmed",
  robots: { index: false, follow: false },
};

export default function AccountSuccessPage() {
  return (
    <AccountShell>
      <Suspense
        fallback={
          <div className="section-container py-20 max-w-lg">
            <p className="text-muted text-sm">Confirming your payment…</p>
          </div>
        }
      >
        <AccountSuccess />
      </Suspense>
    </AccountShell>
  );
}
