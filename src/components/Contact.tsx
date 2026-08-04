import React, { useState } from "react";
import { contactInfo } from "../config/contactInfo";
import { analytics } from "../utils/analytics";

const CONTACT_ENDPOINT = process.env.REACT_APP_CONTACT_ENDPOINT || "";

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!CONTACT_ENDPOINT) {
      setStatusMessage(
        `Contact form is not configured yet. Please email me directly at ${contactInfo.email}.`
      );
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Request failed");
      }

      analytics.contactFormSubmitted();
      setFormData({ name: "", email: "", phone: "", message: "" });
      setStatusMessage(
        "Thank you for your message! We'll get back to you soon."
      );
    } catch (error) {
      console.error("Contact form error:", error);
      setStatusMessage(
        `Sorry, there was an issue sending your message. Please try again or email me directly at ${contactInfo.email}.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2
            className="text-4xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h2>
          <p
            className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ready to start your musical journey? Contact me to schedule a lesson
            or ask any questions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Contact Form */}
          <div>
            <form
              onSubmit={handleSubmit}
              className="bg-white p-8 rounded-2xl border border-gray-200"
            >
              <div className="mb-6">
                <label
                  htmlFor="name"
                  className="block text-gray-900 font-bold mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-gray-900 font-bold mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="phone"
                  className="block text-gray-900 font-bold mb-2"
                >
                  Phone{" "}
                  <span className="text-gray-600 font-normal text-sm">
                    (optional)
                  </span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-colors"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="message"
                  className="block text-gray-900 font-bold mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-colors resize-none"
                  placeholder="Tell me about your musical experience and goals..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
              {statusMessage && (
                <p className="mt-4 text-sm text-gray-600">{statusMessage}</p>
              )}
            </form>
          </div>

          {/* Right Column - Contact Information Cards */}
          <div className="space-y-6">
            {/* Location Card */}
            <div
              className="bg-gray-50 p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="bg-primary-100 p-3 rounded-lg flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-primary-600"
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
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Location</h3>
                  <p className="text-gray-900 mb-1">
                    {contactInfo.city}, {contactInfo.state}
                  </p>
                  <p className="text-sm text-gray-600">
                    Serving the greater {contactInfo.area} area
                  </p>
                </div>
              </div>
            </div>

            {/* Email Card */}
            <div
              className="bg-gray-50 p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="bg-primary-100 p-3 rounded-lg flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-900 mb-1">{contactInfo.email}</p>
                  <p className="text-sm text-gray-600">
                    I typically respond within 24 hours
                  </p>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div
              className="bg-gray-50 p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="bg-primary-100 p-3 rounded-lg flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-900 mb-1">{contactInfo.phone}</p>
                  <p className="text-sm text-gray-600">
                    Call or text for quickest response
                  </p>
                </div>
              </div>
            </div>

            {/* Availability Card */}
            <div
              className="bg-gray-50 p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="bg-primary-100 p-3 rounded-lg flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-primary-600"
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
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Availability</h3>
                  <p className="text-gray-900">Monday - Saturday</p>
                </div>
              </div>
            </div>

            {/* First Lesson Free Card */}
            <div
              className="bg-primary-50 p-6 rounded-2xl border border-primary-200">
              <h3 className="font-bold text-gray-900 mb-3">
                Free 30-minute intro
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Not sure if lessons are right for you? Book a complimentary
                30-minute intro online — meet me, see the studio, and talk goals.
                No payment required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
