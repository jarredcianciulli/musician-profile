import React, { useState } from "react";
import { motion } from "framer-motion";
import { contactInfo } from "../config/contactInfo";
import { analytics } from "../utils/analytics";
import BookingModal from "./BookingModal";
import privateLessonImage from "../assets/images/xingchen-yan-A3LQGkOwZ9E-unsplash.jpg";
import groupLessonImage from "../assets/images/joel-timothy-3MDVR18ciOQ-unsplash.jpg";

const Lessons: React.FC = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const handleButtonClick = (lessonType: string) => {
    if (lessonType === "private") {
      analytics.bookingModalOpened("Lessons Section - Private");
      setIsBookingModalOpen(true);
    } else if (lessonType === "group") {
      analytics.expressInterestClicked();
      // Scroll to contact section
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // Pre-fill message after scroll
      setTimeout(() => {
        const messageInput = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
        if (messageInput) {
          messageInput.value = "I'm interested in group classes. Please let me know when they're available!";
          messageInput.focus();
        }
      }, 800);
    }
  };
  const lessons = [
    {
      id: 1,
      type: "private",
      title: "Private Lessons",
      description:
        "One-on-one instruction tailored to your goals. Start with a free 30-minute intro — paid lesson lengths come next with Stripe.",
      image: privateLessonImage,
      features: [
        "Free 30-minute intro online",
        "Personalized curriculum and pacing",
        "Technique, theory, and musicality",
        "Performance preparation",
      ],
      button: "Book free intro",
      buttonVariant: "black",
    },
    {
      id: 2,
      type: "group",
      title: "Group Classes",
      comingSoon: true,
      description:
        "Learn alongside other students in a collaborative environment. Great for building ensemble skills and musical community.",
      image: groupLessonImage,
      features: [
        "Small group settings for individual attention",
        "Ensemble playing and collaboration",
        "Music theory and ear training",
        "Affordable group rates",
      ],
      button: "Express Interest",
      buttonVariant: "white",
    },
  ];

  return (
    <section id="lessons" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
      <div className="w-full px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Lesson Options
          </motion.h2>
          <motion.p
            className="text-gray-600 text-base sm:text-lg"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Flexible lesson formats designed to meet your learning goals
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {lessons.map((lesson, index) => (
            <motion.div
              key={lesson.id}
              className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.15,
                ease: [0.25, 0.1, 0.25, 1]
              }}
            >
              {/* Image Section */}
              <motion.div 
                className="aspect-[5/2] overflow-hidden rounded-t-lg sm:rounded-t-xl lg:rounded-t-2xl"
                initial={{ opacity: 0, scale: 1.05 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.15 + 0.2,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
              >
                <img
                  src={lesson.image}
                  alt={lesson.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Content Section */}
              <div className="p-5 sm:p-6 lg:p-8">
                <div className="text-left sm:text-center mb-3">
                  <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-3">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 whitespace-nowrap">
                      {lesson.title}
                    </h3>
                    {lesson.comingSoon && (
                      <span className="bg-primary-100 text-primary-700 text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ml-auto sm:ml-0">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 mb-4 sm:mb-5 leading-relaxed text-sm sm:text-base text-left sm:text-center">
                  {lesson.description}
                </p>

                <ul className="space-y-1.5 sm:space-y-2 mb-5 sm:mb-6">
                  {lesson.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start text-gray-700 text-sm sm:text-base"
                    >
                      <svg
                        className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleButtonClick(lesson.type)}
                  className={`w-full px-6 py-3 font-bold rounded-lg transition-colors duration-200 whitespace-nowrap text-sm sm:text-base ${
                    lesson.buttonVariant === "black"
                      ? "bg-black text-white hover:bg-gray-800"
                      : "bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {lesson.button}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* What to Expect Section */}
        <div className="mt-12 sm:mt-16 lg:mt-20 max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            className="bg-white rounded-xl sm:rounded-2xl shadow-md p-6 sm:p-8 lg:p-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-8 sm:mb-10 lg:mb-12">
              What to Expect
            </h3>

            <div className="space-y-8 sm:space-y-10 lg:space-y-12">
              {/* Flexible Scheduling */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-primary-100 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Flexible Scheduling
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                    Lesson times that work with your schedule, including
                    after-school and evening options
                  </p>
                </div>
              </div>

              {/* Hanahan Location */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-primary-100 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    {contactInfo.city} Location
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                    Convenient location in {contactInfo.city}, {contactInfo.state} with a comfortable
                    teaching studio
                  </p>
                </div>
              </div>

              {/* All Ages Welcome */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-primary-100 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    All Ages Welcome
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                    Teaching children, teens, and adults with customized
                    approaches for each age group
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  );
};

export default Lessons;
