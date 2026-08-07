import React from "react";
import { useNavigate } from "react-router-dom";
import { useIsDesktopBooking } from "../hooks/useMediaQuery";
import TrialBookingMobile from "../components/booking/TrialBookingMobile";
import TrialBookingDesktop from "../components/booking/TrialBookingDesktop";

/**
 * Flyer / QR landing.
 * Mobile → full-screen flow. Desktop → modal over a quiet page.
 */
const Trial: React.FC = () => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktopBooking();
  const goHome = () => navigate("/");

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-paper">
        <TrialBookingDesktop isOpen onClose={goHome} />
      </div>
    );
  }

  return <TrialBookingMobile onClose={goHome} />;
};

export default Trial;
