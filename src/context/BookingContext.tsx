import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { analytics } from "../utils/analytics";
import { useIsDesktopBooking } from "../hooks/useMediaQuery";
import TrialBookingDesktop from "../components/booking/TrialBookingDesktop";

type BookingContextValue = {
  openBooking: (source: string) => void;
  closeBooking: () => void;
  isDesktopOpen: boolean;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktopBooking();
  const [isDesktopOpen, setDesktopOpen] = useState(false);

  const openBooking = useCallback(
    (source: string) => {
      analytics.bookingModalOpened(source);
      if (isDesktop) {
        setDesktopOpen(true);
      } else {
        navigate("/trial");
      }
    },
    [isDesktop, navigate]
  );

  const closeBooking = useCallback(() => {
    setDesktopOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openBooking, closeBooking, isDesktopOpen }),
    [openBooking, closeBooking, isDesktopOpen]
  );

  return (
    <BookingContext.Provider value={value}>
      {children}
      <TrialBookingDesktop isOpen={isDesktopOpen} onClose={closeBooking} />
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBooking must be used within BookingProvider");
  }
  return ctx;
}
