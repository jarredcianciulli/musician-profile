import type { Metadata } from "next";
import { Suspense } from "react";
import Admin from "@/views/Admin";

export const metadata: Metadata = {
  title: "Studio admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">
          Loading admin…
        </div>
      }
    >
      <Admin />
    </Suspense>
  );
}
