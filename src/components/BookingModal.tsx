"use client";

import React from "react";
import { useBooking } from "../context/BookingContext";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

/** @deprecated Prefer useBooking().openBooking() */
const BookingModal: React.FC<BookingModalProps> = ({ isOpen }) => {
  const { openBooking, isDesktopOpen } = useBooking();

  React.useEffect(() => {
    if (isOpen && !isDesktopOpen) openBooking("BookingModal");
  }, [isOpen, isDesktopOpen, openBooking]);

  return null;
};

export default BookingModal;
