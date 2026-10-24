import type { Metadata } from "next";
import { AccountShell } from "@/components/AccountShell";
import AccountCanceled from "@/views/AccountCanceled";

export const metadata: Metadata = {
  title: "Checkout canceled",
  robots: { index: false, follow: false },
};

export default function AccountCanceledPage() {
  return (
    <AccountShell>
      <AccountCanceled />
    </AccountShell>
  );
}
