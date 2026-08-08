"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { analytics } from "@/utils/analytics";
import { useIsDesktopBooking } from "@/hooks/useMediaQuery";
import TrialBookingDesktop from "@/components/booking/TrialBookingDesktop";

type BookingContextValue = {
  openBooking: (source: string) => void;
  closeBooking: () => void;
  isDesktopOpen: boolean;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isDesktop = useIsDesktopBooking();
  const [isDesktopOpen, setDesktopOpen] = useState(false);

  const openBooking = useCallback(
    (source: string) => {
      analytics.bookingModalOpened(source);
      if (isDesktop) {
        setDesktopOpen(true);
      } else {
        router.push("/trial");
      }
    },
    [isDesktop, router]
  );

  const closeBooking = useCallback(() => {
    setDesktopOpen(false);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const bookingKeys = ["book", "success", "session_id", "canceled", "bid", "local"];
    let changed = false;
    for (const key of bookingKeys) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const q = params.toString();
      router.replace(q ? `/?${q}` : "/", { scroll: false });
    }
  }, [router]);

  /** Deep-link /trial redirects here with ?book=1 (plus flyer / Stripe return params). */
  useEffect(() => {
    if (!isDesktop || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("book") !== "1") return;
    setDesktopOpen(true);
    analytics.bookingModalOpened("Deep link");
    params.delete("book");
    const q = params.toString();
    router.replace(q ? `/?${q}` : "/", { scroll: false });
  }, [isDesktop, router]);

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
