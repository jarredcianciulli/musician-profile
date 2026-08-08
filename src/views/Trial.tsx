"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useIsDesktopBooking } from "@/hooks/useMediaQuery";
import TrialBookingMobile from "@/components/booking/TrialBookingMobile";
import TrialBookingDesktop from "@/components/booking/TrialBookingDesktop";

const TrialPage: React.FC = () => {
  const router = useRouter();
  const isDesktop = useIsDesktopBooking();
  const goHome = () => router.push("/");

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-paper">
        <TrialBookingDesktop isOpen onClose={goHome} />
      </div>
    );
  }

  return <TrialBookingMobile onClose={goHome} />;
};

export default TrialPage;
