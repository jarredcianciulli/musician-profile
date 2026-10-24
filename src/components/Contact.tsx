"use client";

import React, { useState } from "react";
import Link from "next/link";
import { contactInfo } from "../config/contactInfo";
import { analytics } from "../utils/analytics";
import { submitLead } from "@/lib/bookingApi";
import { PUBLIC_TRIAL_PRICE } from "@/lib/bookingPolicy";

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    company: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setStatusOk(false);

    if (!formData.email.trim() && !formData.phone.trim()) {
      setStatusMessage("Add an email or phone so we can reach you.");
      setIsSubmitting(false);
      return;
    }

    try {
      await submitLead({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        notes: formData.message.trim() || undefined,
        source: "contact_form",
        path:
          typeof window !== "undefined"
            ? window.location.pathname + window.location.hash
            : "/#contact",
        company: formData.company,
      });
      analytics.contactFormSubmitted();
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
        company: "",
      });
      setStatusOk(true);
      setStatusMessage(
        "Thank you — your message was sent. We’ll get back to you soon."
      );
    } catch (error) {
      console.error("Contact form error:", error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : `Sorry, there was an issue sending. Email ${contactInfo.email} directly.`
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
    <section id="contact" className="py-20 bg-paper">
      <div className="section-container">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
            Contact
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-ink mt-2 mb-4">
            Get in touch
          </h2>
          <p className="text-ink-soft max-w-xl mx-auto leading-relaxed">
            Ready to start lessons, or have a question? Send a note — it goes
            straight to the studio inbox.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-line p-6 sm:p-8 space-y-5"
          >
            <label className="block">
              <span className="text-sm text-muted">Name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="admin-input mt-1 w-full"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="admin-input mt-1 w-full"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">
                Phone{" "}
                <span className="text-muted/80 font-normal">(optional)</span>
              </span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="admin-input mt-1 w-full"
                placeholder="(843) 555-0100"
                autoComplete="tel"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Message</span>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="admin-input mt-1 w-full resize-y min-h-[120px]"
                placeholder="Tell me about your goals, age/level, or scheduling…"
                maxLength={2000}
              />
            </label>
            <label className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden">
              Company
              <input
                tabIndex={-1}
                autoComplete="off"
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full disabled:opacity-60"
            >
              {isSubmitting ? "Sending…" : "Send message"}
            </button>
            {statusMessage ? (
              <p
                className={`text-sm ${statusOk ? "text-ink-soft" : "text-accent"}`}
                role="status"
              >
                {statusMessage}
              </p>
            ) : null}
          </form>

          <div className="space-y-6">
            <div className="border border-line bg-white px-5 py-5">
              <h3 className="font-display text-xl text-ink mb-1">Location</h3>
              <p className="text-ink-soft">
                Bowan Village area · {contactInfo.city}, {contactInfo.state}
              </p>
              <p className="text-sm text-muted mt-1">
                In-person or online — greater {contactInfo.area}
              </p>
            </div>
            <div className="border border-line bg-white px-5 py-5">
              <h3 className="font-display text-xl text-ink mb-1">Email</h3>
              <a
                href={`mailto:${contactInfo.email}`}
                className="text-sky-deep hover:underline"
              >
                {contactInfo.email}
              </a>
              <p className="text-sm text-muted mt-1">
                Typically within 24 hours
              </p>
            </div>
            <div className="border border-line bg-white px-5 py-5">
              <h3 className="font-display text-xl text-ink mb-1">Phone</h3>
              <a
                href={`tel:${contactInfo.phone.replace(/\D/g, "")}`}
                className="text-sky-deep hover:underline"
              >
                {contactInfo.phone}
              </a>
              <p className="text-sm text-muted mt-1">Call or text</p>
            </div>
            <div className="border border-line bg-paper-muted/50 px-5 py-5">
              <h3 className="font-display text-xl text-ink mb-2">
                ${PUBLIC_TRIAL_PRICE} trial · 30 minutes
              </h3>
              <p className="text-ink-soft text-sm leading-relaxed mb-3">
                Prefer to pick a time now? Book a trial — home studio or online.
              </p>
              <Link href="/trial" className="btn-primary inline-flex text-sm">
                Book a trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
