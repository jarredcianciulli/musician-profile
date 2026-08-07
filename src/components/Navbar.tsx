import React, { useState, useEffect } from "react";
import { analytics } from "../utils/analytics";
import { PUBLIC_BOOKING_COPY } from "../lib/bookingPolicy";
import LogoLockup from "./brand/LogoLockup";
import { useBooking } from "../context/BookingContext";

const navLinks = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "lessons", label: "Lessons" },
  { id: "calendar", label: "Calendar" },
  { id: "credentials", label: "Credentials" },
  { id: "contact", label: "Contact" },
];

type Props = {
  visible?: boolean;
};

const Navbar: React.FC<Props> = ({ visible = true }) => {
  const { openBooking } = useBooking();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleOpenBooking = (source: string) => {
    setIsOpen(false);
    openBooking(source);
  };

  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    analytics.navLinkClicked(targetId);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setIsOpen(false);
  };

  return (
    <nav
      className={`fixed w-full top-0 z-50 transition-[background-color,border-color,box-shadow,opacity] duration-300 ${
        isOpen || isScrolled
          ? "bg-paper border-b border-line shadow-sm"
          : "bg-transparent"
      }`}
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="section-container">
        <div className="flex items-center justify-between h-16">
          <a
            href="#home"
            onClick={(e) => handleSmoothScroll(e as any, "home")}
            className="min-w-0"
          >
            <LogoLockup
              variant="horizontal"
              tone="light"
              className="max-w-[220px] sm:max-w-none"
              markClassName="w-6 h-11 text-sky-deep shrink-0"
            />
          </a>

          <div className="hidden lg:flex items-center space-x-7">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-ink-soft/90 hover:text-ink transition-colors cursor-pointer text-sm"
                onClick={(e) => handleSmoothScroll(e as any, link.id)}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:block">
            <button
              onClick={() => handleOpenBooking("Navbar")}
              className="btn-primary"
            >
              {PUBLIC_BOOKING_COPY.cta}
            </button>
          </div>

          <div className="lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-ink hover:text-sky-deep focus:outline-none"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="lg:hidden pb-4 bg-paper -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-line">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="text-ink hover:text-sky-deep transition-colors py-2 cursor-pointer"
                  onClick={(e) => handleSmoothScroll(e as any, link.id)}
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => handleOpenBooking("Mobile Menu")}
                className="btn-primary w-full mt-3"
              >
                {PUBLIC_BOOKING_COPY.cta}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
