import React from "react";
import TrialBookingFlow from "../components/booking/TrialBookingFlow";

/** Dedicated QR / flyer landing — full-screen trial booking. */
const Trial: React.FC = () => {
  return (
    <div className="min-h-screen bg-paper">
      <TrialBookingFlow />
    </div>
  );
};

export default Trial;
