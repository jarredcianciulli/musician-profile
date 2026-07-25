import React, { useState } from "react";
import { motion } from "framer-motion";
import { contactInfo } from "../config/contactInfo";
import { brand } from "../config/brand";
import { analytics } from "../utils/analytics";
import heroImage from "../assets/headshots/home3.webp";
import BookingModal from "./BookingModal";

const Hero: React.FC = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden pt-16 lg:pt-0"
    >
      {/* Continuity with poster: soft sky wash into paper */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky/25 via-paper to-paper" />

      <div className="relative z-10">
        <div className="section-container pt-8 pb-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="flex items-center">
              <div className="w-full max-w-xl">
                <motion.p
                  className="text-sky-deep text-sm font-semibold tracking-[0.14em] uppercase mb-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Violin &amp; Viola Lessons · {contactInfo.area}, {contactInfo.state}
                </motion.p>

                <motion.h1
                  className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-ink mb-6 leading-tight text-left"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  Same studio you saw
                  <br />
                  on the poster —
                  <br />
                  book a lesson here.
                </motion.h1>

                <motion.p
                  className="text-base sm:text-lg text-muted mb-3 leading-relaxed text-left"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                >
                  Private instruction with {brand.instructorName}. All ages and
                  levels — clear goals, serious musicianship, Charleston-area
                  studio.
                </motion.p>

                <motion.p
                  className="text-sm text-muted mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  {contactInfo.website} · {contactInfo.email}
                </motion.p>

                <motion.div
                  className="flex flex-row gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.55 }}
                >
                  <button
                    onClick={() => {
                      analytics.bookingModalOpened("Hero Section");
                      setIsBookingModalOpen(true);
                    }}
                    className="btn-primary flex-1 sm:flex-none whitespace-nowrap text-sm"
                  >
                    Book free intro
                  </button>
                  <button
                    onClick={() => {
                      analytics.learnMoreClicked("Hero Section");
                      document
                        .getElementById("about")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="btn-secondary flex-1 sm:flex-none whitespace-nowrap text-sm !py-2 !px-4"
                  >
                    Learn More
                  </button>
                </motion.div>
              </div>
            </div>

            <motion.div
              className="hidden lg:flex items-start justify-center pt-6"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="w-full max-w-sm aspect-[3/4] overflow-hidden shadow-2xl border border-line">
                <img
                  src={heroImage}
                  alt={`${brand.instructorName} — violin & viola instruction`}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="lg:hidden section-container -mt-4 px-4 pb-8">
          <div className="w-full overflow-hidden shadow-lg border border-line">
            <img
              src={heroImage}
              alt={`${brand.instructorName} — violin & viola instruction`}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-paper pointer-events-none" />

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  );
};

export default Hero;
