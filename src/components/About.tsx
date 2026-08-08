"use client";

import React from "react";
import teacherImage from "../assets/headshots/unnamed.jpg";

const About: React.FC = () => {
  const features = [
    {
      icon: (
        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
        </svg>
      ),
      title: "Professional Violist",
      description:
        "Experienced performer with a deep understanding of string instruments and technique",
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5 2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
        </svg>
      ),
      title: "Patient & Supportive",
      description:
        "Creating a positive learning environment where every student feels encouraged",
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
        </svg>
      ),
      title: "All Skill Levels",
      description:
        "Teaching students from complete beginners to advanced players",
    },
  ];

  return (
    <section id="about" className="py-20 bg-white">
      <div className="section-container text-center">
        <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
          About Your <span className="text-primary-600">Teacher</span>
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Passionate about music education and dedicated to helping students
          discover the joy of playing violin and viola
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="bg-primary-100 p-4 rounded-full mb-4 text-primary-700">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="section-container mt-20 pt-20 border-t border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="aspect-[3/4] w-full max-w-xs mx-auto rounded-2xl lg:rounded-3xl shadow-md overflow-hidden">
              <img
                src={teacherImage.src}
                alt="Music teacher"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-6">
              My Teaching <span className="text-primary-600">Philosophy</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                As a professional violist who also teaches violin, I bring a
                unique perspective to string instruction. I believe that
                learning music should be an enjoyable and rewarding experience,
                tailored to each student's individual goals and learning style.
              </p>
              <p>
                Whether you're picking up an instrument for the first time or
                looking to refine your advanced technique, I'm here to guide you
                on your musical journey. My lessons focus on building a strong
                technical foundation while fostering creativity and musical
                expression.
              </p>
              <p>
                I'm also excited to offer group classes in the future, providing
                opportunities for students to learn ensemble skills and connect
                with fellow musicians.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
