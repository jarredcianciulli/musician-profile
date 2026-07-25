import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { analytics } from "../utils/analytics";
import BookingModal from "./BookingModal";
import LogoLockup from "./brand/LogoLockup";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <motion.nav
      initial={false}
      animate={{
        y: visible ? 0 : -24,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed w-full top-0 z-50 transition-colors duration-300 ${
        isOpen || isScrolled
          ? "bg-paper border-b border-line shadow-sm"
          : "bg-transparent"
      }`}
      style={{ pointerEvents: visible ? "auto" : "none" }}
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
              <motion.a
                key={link.id}
                href={`#${link.id}`}
                className="text-ink-soft/90 hover:text-ink transition-colors cursor-pointer text-sm"
                onClick={(e) => handleSmoothScroll(e as any, link.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {link.label}
              </motion.a>
            ))}
          </div>

          <div className="hidden lg:block">
            <button
              onClick={() => {
                analytics.bookingModalOpened("Navbar");
                setIsBookingModalOpen(true);
              }}
              className="btn-primary"
            >
              Book free intro
            </button>
          </div>

          <div className="lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-ink hover:text-sky-deep focus:outline-none"
              aria-label="Toggle menu"
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
          <motion.div
            className="lg:hidden pb-4 bg-paper -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-line"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <motion.a
                  key={link.id}
                  href={`#${link.id}`}
                  className="text-ink hover:text-sky-deep transition-colors py-2 cursor-pointer"
                  onClick={(e) => handleSmoothScroll(e as any, link.id)}
                  whileTap={{ scale: 0.98 }}
                >
                  {link.label}
                </motion.a>
              ))}
              <button
                onClick={() => {
                  analytics.bookingModalOpened("Mobile Menu");
                  setIsBookingModalOpen(true);
                }}
                className="btn-primary w-full mt-3"
              >
                Book free intro
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </motion.nav>
  );
};

export default Navbar;
