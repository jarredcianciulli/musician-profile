"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { submitLead } from "@/lib/bookingApi";
import { analytics } from "@/utils/analytics";
import { PUBLIC_TRIAL_PRICE } from "@/lib/bookingPolicy";

export default function LeadForm() {
  const searchParams = useSearchParams();
  const flyer = useMemo(
    () =>
      (searchParams.get("f") || searchParams.get("flyer") || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, ""),
    [searchParams]
  );
  const utmSource = searchParams.get("utm_source") || "";
  const utmMedium = searchParams.get("utm_medium") || "";
  const utmCampaign = searchParams.get("utm_campaign") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() && !phone.trim()) {
      setError("Add an email or phone number so we can reach you.");
      return;
    }
    setSubmitting(true);
    try {
      await submitLead({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        source: flyer ? "flyer" : "lead_form",
        flyer: flyer || undefined,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
        path:
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/lead",
        company,
      });
      analytics.leadFormSubmit(flyer || undefined);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl text-ink">Thanks — we got it.</h1>
        <p className="text-ink-soft leading-relaxed">
          Jarred will follow up soon. Prefer to pick a time now? Book a $
          {PUBLIC_TRIAL_PRICE} trial in a minute.
        </p>
        <Link href="/trial" className="btn-primary inline-flex">
          Book a ${PUBLIC_TRIAL_PRICE} trial
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          Battery String Studio
        </p>
        <h1 className="font-display text-4xl text-ink mt-2">
          Interested in lessons?
        </h1>
        <p className="text-ink-soft mt-3 leading-relaxed max-w-xl">
          Private violin and viola lessons in the Bowan Village / Charleston
          area. Leave your details and we&apos;ll reach out — or{" "}
          <Link href="/trial" className="text-sky-deep hover:underline">
            book a ${PUBLIC_TRIAL_PRICE} trial
          </Link>{" "}
          now.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <label className="block">
          <span className="text-sm text-muted">Name</span>
          <input
            className="admin-input mt-1 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Email</span>
          <input
            type="email"
            className="admin-input mt-1 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Phone</span>
          <input
            type="tel"
            className="admin-input mt-1 w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Anything we should know?</span>
          <textarea
            className="admin-input mt-1 w-full min-h-[88px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </label>
        {/* Honeypot */}
        <label className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden">
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
