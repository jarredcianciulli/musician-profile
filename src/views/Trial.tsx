"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsDesktopBooking } from "@/hooks/useMediaQuery";
import TrialBookingMobile from "@/components/booking/TrialBookingMobile";

const TrialPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktopBooking();
  const goHome = () => router.push("/");

  useEffect(() => {
    if (!isDesktop) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("book", "1");
    router.replace(`/?${params.toString()}`);
  }, [isDesktop, router, searchParams]);

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">
        Opening booking…
      </div>
    );
  }

  return <TrialBookingMobile onClose={goHome} />;
};

export default TrialPage;
