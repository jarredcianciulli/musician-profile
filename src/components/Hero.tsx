import React from "react";
import { contactInfo } from "../config/contactInfo";
import { brand } from "../config/brand";
import { analytics } from "../utils/analytics";
import { PUBLIC_BOOKING_COPY } from "../lib/bookingPolicy";
import { useBooking } from "../context/BookingContext";
import heroImage from "../assets/headshots/home3.webp";

const Hero: React.FC = () => {
  const { openBooking } = useBooking();

  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden pt-16 lg:pt-0"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky/25 via-paper to-paper" />

      <div className="relative z-10">
        <div className="section-container pt-8 pb-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="flex items-center">
              <div className="w-full max-w-xl">
                <p className="text-sky-deep text-sm font-semibold tracking-[0.14em] uppercase mb-4">
                  Violin &amp; Viola Lessons · {contactInfo.area}, {contactInfo.state}
                </p>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-ink mb-6 leading-tight text-left">
                  Same studio you saw
                  <br />
                  on the poster —
                  <br />
                  book a lesson here.
                </h1>

                <p className="text-base sm:text-lg text-muted mb-3 leading-relaxed text-left">
                  Private instruction with {brand.instructorName}. All ages and
                  levels — clear goals, serious musicianship, Charleston-area
                  studio.
                </p>

                <p className="text-sm text-muted mb-8">
                  {contactInfo.website} · {contactInfo.email}
                </p>

                <div className="flex flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => openBooking("Hero Section")}
                    className="btn-primary flex-1 sm:flex-none whitespace-nowrap text-sm text-center"
                  >
                    {PUBLIC_BOOKING_COPY.cta}
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
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-start justify-center pt-6">
              <div className="w-full max-w-sm aspect-[3/4] overflow-hidden shadow-2xl border border-line">
                <img
                  src={heroImage}
                  alt={`${brand.instructorName} — violin & viola instruction`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
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
    </section>
  );
};

export default Hero;
