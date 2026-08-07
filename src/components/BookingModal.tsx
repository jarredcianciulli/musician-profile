import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { analytics } from "../utils/analytics";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

/** Opens the dedicated /trial flow (QR-friendly). Kept for existing callers. */
const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    analytics.bookingModalOpened("BookingModal → /trial");
    onClose();
    navigate("/trial");
  }, [isOpen, navigate, onClose]);

  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(null, document.body);
};

export default BookingModal;
