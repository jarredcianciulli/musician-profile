"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import BowStringMark from "../components/brand/BowStringMark";
import { brand } from "../config/brand";
import {
  clearAdminToken,
  getAdminToken,
  isUsingRemoteApi,
  loadStudio,
  newId,
  removeEvent,
  removeHoliday,
  saveStudio,
  updateAvailability,
  upsertEvent,
  upsertHoliday,
  verifyAdminToken,
} from "../lib/studioApi";
import { formatSlotDay, formatSlotTime } from "../lib/slots";
import {
  DayHours,
  FlyerCampaign,
  HolidayWeek,
  LeadStatus,
  LessonFormat,
  StudioEvent,
  StudioPayload,
  Weekday,
} from "../types/studio";
import { siteUrl } from "../lib/env";
import {
  fetchSubscriptionSlots,
  inviteStudent,
  resendStudentMagicLink,
  updateLeadStatus,
  type StudentInviteResult,
} from "../lib/bookingApi";
import {
  DEFAULT_SUBSCRIPTION_MINUTES,
  SUBSCRIPTION_DURATIONS,
  type SubscriptionDuration,
} from "../lib/bookingPolicy";

const DAY_LABELS: { day: Weekday; label: string }[] = [
  { day: 0, label: "Sunday" },
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
];

type AdminTab = "students" | "bookings" | "schedule" | "marketing";

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "students", label: "Students" },
  { id: "bookings", label: "Bookings" },
  { id: "schedule", label: "Schedule" },
  { id: "marketing", label: "Marketing" },
];

const emptyHoliday = (): HolidayWeek => ({
  id: newId("holiday"),
  title: "",
  startDate: "",
  endDate: "",
  publicNote: "Skipped for holiday — no lessons this week.",
  syncToGoogle: false,
});

const emptyEvent = (): StudioEvent => ({
  id: newId("event"),
  title: "",
  startsAt: "",
  venue: "",
  description: "",
  visibility: "public",
  infoUrl: "",
  syncToGoogle: false,
});

const Admin: React.FC = () => {
  const [authed, setAuthed] = useState(Boolean(getAdminToken()));
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [payload, setPayload] = useState<StudioPayload | null>(null);
  const [status, setStatus] = useState("");
  const [holidayForm, setHolidayForm] = useState<HolidayWeek>(emptyHoliday());
  const [eventForm, setEventForm] = useState<StudioEvent>(emptyEvent());
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [flyerCode, setFlyerCode] = useState("");
  const [flyerLabel, setFlyerLabel] = useState("");

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDuration, setInviteDuration] = useState<SubscriptionDuration>(
    DEFAULT_SUBSCRIPTION_MINUTES
  );
  const [inviteFormat, setInviteFormat] = useState<LessonFormat>("in_person");
  const [inviteBilling, setInviteBilling] = useState<"manual" | "auto">(
    "manual"
  );
  const [inviteScheduleMonths, setInviteScheduleMonths] = useState(12);
  const [inviteSlots, setInviteSlots] = useState<
    { start: string; end: string; label: string }[]
  >([]);
  const [inviteSlotStart, setInviteSlotStart] = useState("");
  const [inviteUseCustomTime, setInviteUseCustomTime] = useState(true);
  const [inviteCustomLocal, setInviteCustomLocal] = useState("");
  const [inviteLoadingSlots, setInviteLoadingSlots] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<StudentInviteResult | null>(
    null
  );
  const [inviteError, setInviteError] = useState("");
  const [resendBusyId, setResendBusyId] = useState("");
  const [adminTab, setAdminTab] = useState<AdminTab>("students");

  useEffect(() => {
    if (!authed) return;
    loadStudio({ includePrivate: true }).then(setPayload);
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setInviteLoadingSlots(true);
    setInviteError("");
    fetchSubscriptionSlots(inviteDuration)
      .then((result) => {
        if (cancelled) return;
        const tz = result.availability?.timezone || "America/New_York";
        const opts = (result.slots || []).map((s) => ({
          start: s.start,
          end: s.end,
          label: `${formatSlotDay(s.start, tz)} · ${formatSlotTime(s.start, tz)}`,
        }));
        setInviteSlots(opts);
        setInviteSlotStart((prev) =>
          opts.some((o) => o.start === prev) ? prev : opts[0]?.start || ""
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setInviteSlots([]);
          setInviteSlotStart("");
          setInviteError(
            err instanceof Error ? err.message : "Could not load open slots."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setInviteLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authed, inviteDuration]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const ok = await verifyAdminToken(tokenInput);
    if (!ok) {
      setAuthError("Invalid admin token.");
      return;
    }
    setAuthed(true);
  };

  const handleLogout = () => {
    clearAdminToken();
    setAuthed(false);
    setPayload(null);
  };

  const persist = async (next: StudioPayload) => {
    setStatus("Saving…");
    const saved = await saveStudio(next);
    setPayload(saved);
    setStatus(
      isUsingRemoteApi()
        ? "Saved to API."
        : "Saved locally (browser). Deploy studio-api + set NEXT_PUBLIC_STUDIO_API for production."
    );
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteResult(null);
    const token = getAdminToken();
    if (!token) {
      setInviteError("Re-login required.");
      return;
    }
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError("Name and email are required.");
      return;
    }

    let start = "";
    let end = "";
    if (inviteUseCustomTime) {
      if (!inviteCustomLocal) {
        setInviteError("Enter the weekly lesson date and time.");
        return;
      }
      const startDate = new Date(inviteCustomLocal);
      if (Number.isNaN(startDate.getTime())) {
        setInviteError("Invalid date/time.");
        return;
      }
      start = startDate.toISOString();
      end = new Date(
        startDate.getTime() + inviteDuration * 60 * 1000
      ).toISOString();
    } else {
      const slot = inviteSlots.find((s) => s.start === inviteSlotStart);
      if (!slot) {
        setInviteError("Pick an open weekly time.");
        return;
      }
      start = slot.start;
      end = slot.end;
    }

    setInviteSubmitting(true);
    try {
      const result = await inviteStudent(
        {
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          durationMinutes: inviteDuration,
          start,
          end,
          format: inviteFormat,
          billingMode: inviteBilling,
          scheduleMonths: inviteScheduleMonths,
        },
        token
      );
      setInviteResult(result);
      setStatus(result.summary);
      const refreshed = await loadStudio({ includePrivate: true });
      setPayload(refreshed);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not send invite.";
      setInviteError(msg);
      setStatus(msg);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Could not copy — select the URL manually.");
    }
  };

  const resendInvite = async (enrollmentId: string) => {
    const token = getAdminToken();
    if (!token) {
      setStatus("Re-login required.");
      return;
    }
    setResendBusyId(enrollmentId);
    try {
      const result = await resendStudentMagicLink(enrollmentId, token);
      if (result.magicUrl) {
        try {
          await navigator.clipboard.writeText(result.magicUrl);
          setStatus("Magic link resent and copied.");
        } catch {
          setStatus("Magic link resent.");
        }
      } else {
        setStatus("Magic link resent.");
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Resend failed.");
    } finally {
      setResendBusyId("");
    }
  };

  const setLeadStatus = async (id: string, status: LeadStatus) => {
    if (!payload) return;
    const token = getAdminToken();
    if (!token) {
      setStatus("Re-login required to update leads.");
      return;
    }
    try {
      await updateLeadStatus(id, status, token);
      setPayload({
        ...payload,
        leads: (payload.leads || []).map((l) =>
          l.id === id ? { ...l, status } : l
        ),
      });
      setStatus(`Lead marked ${status}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not update lead.");
    }
  };

  const addFlyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload) return;
    const code = flyerCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    if (!code) {
      setStatus("Flyer needs a code (letters, numbers, - or _).");
      return;
    }
    const existing = payload.flyers || [];
    if (existing.some((f) => f.code === code)) {
      setStatus(`Flyer “${code}” already exists.`);
      return;
    }
    const flyer: FlyerCampaign = {
      code,
      label: flyerLabel.trim() || code,
      views: 0,
      trials: 0,
      createdAt: new Date().toISOString(),
    };
    await persist({ ...payload, flyers: [...existing, flyer] });
    setFlyerCode("");
    setFlyerLabel("");
  };

  const saveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload || !holidayForm.title || !holidayForm.startDate || !holidayForm.endDate) {
      setStatus("Holiday needs title, start, and end.");
      return;
    }
    const next = upsertHoliday(payload, holidayForm);
    await persist(next);
    setHolidayForm(emptyHoliday());
    setEditingHolidayId(null);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload || !eventForm.title || !eventForm.startsAt) {
      setStatus("Event needs title and start time.");
      return;
    }
    const next = upsertEvent(payload, eventForm);
    await persist(next);
    setEventForm(emptyEvent());
    setEditingEventId(null);
  };

  const patchDayHours = (day: Weekday, patch: Partial<DayHours>) => {
    if (!payload) return;
    const weeklyHours = payload.availability.weeklyHours.map((h) =>
      h.day === day ? { ...h, ...patch } : h
    );
    // Ensure all 7 days exist
    for (const d of DAY_LABELS) {
      if (!weeklyHours.some((h) => h.day === d.day)) {
        weeklyHours.push({
          day: d.day,
          start: "15:00",
          end: "20:00",
          enabled: false,
        });
      }
    }
    weeklyHours.sort((a, b) => a.day - b.day);
    setPayload({
      ...payload,
      availability: { ...payload.availability, weeklyHours },
    });
  };

  const saveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload) return;
    await persist(updateAvailability(payload, payload.availability));
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-ink text-paper flex items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md border border-white/10 p-8 bg-ink-soft"
        >
          <div className="flex items-center gap-3 mb-6 text-gold">
            <BowStringMark className="w-8 h-14 text-sky" />
            <div>
              <p className="text-xs uppercase tracking-widest text-gold/80">
                Admin
              </p>
              <h1 className="font-display text-xl">{brand.studioName}</h1>
            </div>
          </div>
          <label className="block text-sm text-paper/70 mb-2">
            Admin token
            {!isUsingRemoteApi() && (
              <span className="block text-xs text-paper/40 mt-1">
                Local mode: any non-empty token works until the API is connected.
              </span>
            )}
          </label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full bg-ink border border-white/15 px-3 py-2 text-paper mb-4 focus:outline-none focus:border-gold"
            autoComplete="current-password"
          />
          {authError && <p className="text-red-300 text-sm mb-3">{authError}</p>}
          <button type="submit" className="btn-primary w-full">
            Enter
          </button>
          <Link
            href="/"
            className="block text-center text-sm text-paper/50 mt-6 hover:text-gold"
          >
            ← Back to site
          </Link>
        </form>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-muted">
        Loading studio data…
      </div>
    );
  }

  const tz = payload.availability.timezone;
  const upcoming = [...payload.bookings]
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white sticky top-0 z-10">
        <div className="section-container py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BowStringMark className="w-7 h-12 text-sky-deep" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">
                Studio admin
              </p>
              <h1 className="font-display text-lg sm:text-xl">
                Hours, bookings &amp; calendar
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-muted hover:text-ink">
              View site
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-accent hover:text-accent-hover"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="section-container py-10 space-y-12">
        {status && (
          <p className="text-sm bg-white border border-line px-4 py-3 text-muted">
            {status}
          </p>
        )}

        <nav
          className="flex flex-wrap gap-1 border-b border-line -mb-6"
          aria-label="Admin sections"
        >
          {ADMIN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAdminTab(t.id)}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                adminTab === t.id
                  ? "border-sky-ink text-ink font-medium"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Teaching hours */}
        {adminTab === "schedule" ? (
        <section>
          <h2 className="font-display text-2xl mb-2">Teaching hours</h2>
          <p className="text-sm text-muted mb-6">
            Weekly availability used by the booking form ({tz}). Holiday weeks
            automatically block slots.
          </p>
          <form
            onSubmit={saveHours}
            className="bg-white border border-line p-5 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Timezone
                </span>
                <input
                  className="admin-input mt-1"
                  value={payload.availability.timezone}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      availability: {
                        ...payload.availability,
                        timezone: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Slot interval (min)
                </span>
                <input
                  type="number"
                  min={15}
                  step={15}
                  className="admin-input mt-1"
                  value={payload.availability.slotIntervalMinutes}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      availability: {
                        ...payload.availability,
                        slotIntervalMinutes: Number(e.target.value) || 30,
                      },
                    })
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Default length (min)
                </span>
                <input
                  type="number"
                  min={15}
                  step={15}
                  className="admin-input mt-1"
                  value={payload.availability.defaultDurationMinutes}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      availability: {
                        ...payload.availability,
                        defaultDurationMinutes: Number(e.target.value) || 30,
                      },
                    })
                  }
                />
                <p className="text-xs text-muted mt-1">
                  Public site books the $35 / 30-min trial. Slot starts every 15
                  minutes inside your published windows (Google free/busy when
                  configured).
                </p>
              </label>
            </div>

            <div className="divide-y divide-line border border-line">
              {DAY_LABELS.map(({ day, label }) => {
                const hours =
                  payload.availability.weeklyHours.find((h) => h.day === day) ||
                  ({
                    day,
                    start: "15:00",
                    end: "20:00",
                    enabled: false,
                  } as DayHours);
                return (
                  <div
                    key={day}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3"
                  >
                    <label className="flex items-center gap-2 sm:w-36 shrink-0">
                      <input
                        type="checkbox"
                        checked={hours.enabled}
                        onChange={(e) =>
                          patchDayHours(day, { enabled: e.target.checked })
                        }
                      />
                      <span className="font-medium text-sm">{label}</span>
                    </label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        className="admin-input"
                        disabled={!hours.enabled}
                        value={hours.start}
                        onChange={(e) =>
                          patchDayHours(day, { start: e.target.value })
                        }
                      />
                      <span className="text-muted text-sm">to</span>
                      <input
                        type="time"
                        className="admin-input"
                        disabled={!hours.enabled}
                        value={hours.end}
                        onChange={(e) =>
                          patchDayHours(day, { end: e.target.value })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="submit" className="btn-primary">
              Save teaching hours
            </button>
          </form>
        </section>
        ) : null}

        {/* Leads */}
        {adminTab === "bookings" ? (
        <section>
          <h2 className="font-display text-2xl mb-2">Leads</h2>
          <p className="text-sm text-muted mb-6">
            Abandoned checkouts and{" "}
            <Link href="/lead" className="text-sky-deep hover:underline">
              /lead
            </Link>{" "}
            form submissions. PII stays here — not in analytics.
          </p>
          {(payload.leads || []).length === 0 ? (
            <p className="text-sm text-muted bg-white border border-line px-4 py-6">
              No leads yet.
            </p>
          ) : (
            <div className="overflow-x-auto border border-line bg-white">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Slot</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(payload.leads || []).slice(0, 80).map((l) => (
                    <tr key={l.id} className="border-b border-line/70 align-top">
                      <td className="px-3 py-2 whitespace-nowrap text-muted">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{l.name || "—"}</p>
                        {l.email ? (
                          <p className="text-muted">{l.email}</p>
                        ) : null}
                        {l.phone ? (
                          <p className="text-muted">{l.phone}</p>
                        ) : null}
                        {l.flyer ? (
                          <p className="text-xs text-sky-deep">f={l.flyer}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs uppercase tracking-wider">
                          {l.source}
                        </span>
                        {l.notes ? (
                          <p className="text-xs text-muted mt-1">{l.notes}</p>
                        ) : null}
                        {l.utmSource || l.utmCampaign ? (
                          <p className="text-xs text-muted mt-1">
                            {[l.utmSource, l.utmMedium, l.utmCampaign]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {l.slotStart
                          ? `${formatSlotDay(l.slotStart, tz)} · ${formatSlotTime(l.slotStart, tz)}`
                          : "—"}
                        {l.durationMinutes
                          ? ` (${l.durationMinutes}m)`
                          : ""}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="admin-input text-xs py-1"
                          value={l.status}
                          onChange={(e) =>
                            setLeadStatus(l.id, e.target.value as LeadStatus)
                          }
                        >
                          <option value="new">new</option>
                          <option value="contacted">contacted</option>
                          <option value="closed">closed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        ) : null}

        {/* Invite student */}
        {adminTab === "students" ? (
        <section>
          <h2 className="font-display text-2xl mb-2">Invite student</h2>
          <p className="text-sm text-muted mb-6">
            Email a magic link to their account. You set billing on the invite;
            they see their schedule and pay (or set up auto-charge).
          </p>
          <form
            onSubmit={sendInvite}
            className="bg-white border border-line p-5 space-y-4 max-w-xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm block">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Name
                </span>
                <input
                  className="admin-input mt-1"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm block">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Email
                </span>
                <input
                  type="email"
                  className="admin-input mt-1"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="text-sm block">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Length
                </span>
                <select
                  className="admin-input mt-1"
                  value={inviteDuration}
                  onChange={(e) =>
                    setInviteDuration(
                      Number(e.target.value) as SubscriptionDuration
                    )
                  }
                >
                  {SUBSCRIPTION_DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm block">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Format
                </span>
                <select
                  className="admin-input mt-1"
                  value={inviteFormat}
                  onChange={(e) =>
                    setInviteFormat(e.target.value as LessonFormat)
                  }
                >
                  <option value="in_person">In person</option>
                  <option value="online">Online</option>
                </select>
              </label>
              <label className="text-sm block">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Billing
                </span>
                <select
                  className="admin-input mt-1"
                  value={inviteBilling}
                  onChange={(e) =>
                    setInviteBilling(e.target.value as "manual" | "auto")
                  }
                >
                  <option value="manual">Pay by link (manual)</option>
                  <option value="auto">Auto-charge monthly</option>
                </select>
              </label>
              <label className="text-sm block">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Schedule horizon
                </span>
                <select
                  className="admin-input mt-1"
                  value={inviteScheduleMonths}
                  onChange={(e) =>
                    setInviteScheduleMonths(Number(e.target.value))
                  }
                >
                  {[3, 6, 9, 12, 18, 24].map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-muted text-xs uppercase tracking-wider">
                Weekly lesson time
              </legend>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={inviteUseCustomTime}
                  onChange={() => setInviteUseCustomTime(true)}
                />
                Custom date/time (past OK — sets weekday + time)
              </label>
              {inviteUseCustomTime ? (
                <label className="text-sm block">
                  <span className="text-muted text-xs uppercase tracking-wider">
                    First lesson (local time)
                  </span>
                  <input
                    type="datetime-local"
                    className="admin-input mt-1"
                    value={inviteCustomLocal}
                    onChange={(e) => setInviteCustomLocal(e.target.value)}
                    required={inviteUseCustomTime}
                  />
                  <span className="block text-xs text-muted mt-1">
                    Example: today&apos;s Friday time even if it already
                    started. Proration counts remaining lessons from now.
                  </span>
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={!inviteUseCustomTime}
                  onChange={() => setInviteUseCustomTime(false)}
                />
                Pick from open future slots
              </label>
              {!inviteUseCustomTime ? (
                <select
                  className="admin-input"
                  value={inviteSlotStart}
                  onChange={(e) => setInviteSlotStart(e.target.value)}
                  disabled={inviteLoadingSlots || inviteSlots.length === 0}
                  required={!inviteUseCustomTime}
                >
                  {inviteLoadingSlots ? (
                    <option value="">Loading times…</option>
                  ) : inviteSlots.length === 0 ? (
                    <option value="">No open slots</option>
                  ) : (
                    inviteSlots.map((s) => (
                      <option key={s.start} value={s.start}>
                        {s.label}
                      </option>
                    ))
                  )}
                </select>
              ) : null}
            </fieldset>
            {inviteError ? (
              <p className="text-sm text-accent" role="alert">
                {inviteError}
              </p>
            ) : null}
            <button
              type="submit"
              className="btn-primary"
              disabled={
                inviteSubmitting ||
                (inviteUseCustomTime ? !inviteCustomLocal : !inviteSlotStart)
              }
            >
              {inviteSubmitting ? "Sending…" : "Send invite"}
            </button>
            {inviteResult ? (
              <div className="border border-line bg-paper-muted/40 px-4 py-3 space-y-3 text-sm">
                <p className="text-ink-soft">{inviteResult.summary}</p>
                {inviteResult.emailWarning ? (
                  <p className="text-accent text-xs" role="alert">
                    Email: {inviteResult.emailWarning}
                  </p>
                ) : null}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted mb-1">
                    {inviteResult.emailWarning
                      ? "Magic link (email failed — copy & send manually)"
                      : "Magic link (also emailed)"}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      className="admin-input flex-1 text-xs"
                      readOnly
                      value={inviteResult.magicUrl}
                    />
                    <button
                      type="button"
                      className="btn-secondary shrink-0"
                      onClick={() => copyText(inviteResult.magicUrl)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </form>

          {(payload.enrollments || []).length > 0 ? (
            <div className="mt-8 max-w-2xl">
              <h3 className="font-display text-xl mb-3">Enrolled students</h3>
              <ul className="space-y-2">
                {[...(payload.enrollments || [])]
                  .sort((a, b) =>
                    (b.createdAt || "").localeCompare(a.createdAt || "")
                  )
                  .map((enr) => (
                    <li
                      key={enr.id}
                      className="bg-white border border-line px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{enr.name}</p>
                        <p className="text-muted">
                          {enr.email} · {enr.durationMinutes} min ·{" "}
                          {enr.billingMode || "unset"}
                          {typeof enr.amountDueCents === "number"
                            ? ` · due $${(enr.amountDueCents / 100).toFixed(
                                enr.amountDueCents % 100 === 0 ? 0 : 2
                              )}`
                            : ""}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {formatSlotDay(enr.slotStart, tz)} ·{" "}
                          {formatSlotTime(enr.slotStart, tz)} · {enr.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary shrink-0 text-xs"
                        disabled={resendBusyId === enr.id}
                        onClick={() => resendInvite(enr.id)}
                      >
                        {resendBusyId === enr.id
                          ? "Sending…"
                          : "Resend magic link"}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </section>
        ) : null}

        {/* Bookings */}
        {adminTab === "bookings" ? (
        <section>
          <h2 className="font-display text-2xl mb-2">Upcoming bookings</h2>
          <p className="text-sm text-muted mb-6">
            Lessons reserved through the site booking form.
          </p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted bg-white border border-line px-4 py-6">
              No bookings yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((b) => (
                <li
                  key={b.id}
                  className="bg-white border border-line px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-sm text-muted">
                      {formatSlotDay(b.start, tz)} ·{" "}
                      {formatSlotTime(b.start, tz)} ({b.durationMinutes} min)
                      {b.lessonType === "trial"
                        ? " · trial"
                        : b.lessonType
                          ? ` · ${b.lessonType}`
                          : ""}
                      {b.format === "online"
                        ? " · online"
                        : b.format === "in_person"
                          ? " · in person"
                          : ""}
                    </p>
                    <p className="text-sm text-muted">{b.email}</p>
                    {b.notes ? (
                      <p className="text-sm text-ink-soft mt-1">{b.notes}</p>
                    ) : null}
                    {b.emailsSentAt ? (
                      <p className="text-xs text-muted mt-1">
                        Confirmation emailed {new Date(b.emailsSentAt).toLocaleString()}
                      </p>
                    ) : null}
                    {b.emailError ? (
                      <p className="text-xs text-accent mt-1">
                        Email error: {b.emailError}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs uppercase tracking-wider text-sky-deep">
                      {b.status}
                      {b.status === "pending_payment" ? " (awaiting Stripe)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        ) : null}

        {/* Subscriptions */}
        {adminTab === "students" ? (
        <section>
          <h2 className="font-display text-2xl mb-2">Subscriptions</h2>
          <p className="text-sm text-muted mb-6">
            Weekly spots after Stripe subscription checkout.
          </p>
          {(payload.subscriptions || []).length === 0 ? (
            <p className="text-sm text-muted bg-white border border-line px-4 py-6">
              No subscriptions yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {[...(payload.subscriptions || [])]
                .sort((a, b) =>
                  (b.createdAt || "").localeCompare(a.createdAt || "")
                )
                .map((s) => (
                  <li
                    key={s.id}
                    className="bg-white border border-line px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-muted">
                        {s.slotStart
                          ? `${formatSlotDay(s.slotStart, tz)} · ${formatSlotTime(s.slotStart, tz)}`
                          : "Slot TBD"}{" "}
                        ({s.durationMinutes} min)
                        {s.format === "online"
                          ? " · online"
                          : s.format === "in_person"
                            ? " · in person"
                            : ""}
                      </p>
                      <p className="text-sm text-muted">{s.email}</p>
                      <p className="text-xs text-muted mt-1">
                        Billing:{" "}
                        {s.billingMode === "manual" ? "manual (link)" : "auto"}
                      </p>
                      {s.monthlyPaymentLinkUrl ? (
                        <p className="text-xs mt-1">
                          <button
                            type="button"
                            className="text-sky-deep hover:underline"
                            onClick={() =>
                              copyText(s.monthlyPaymentLinkUrl || "")
                            }
                          >
                            Copy monthly pay link
                          </button>
                        </p>
                      ) : null}
                      {s.emailsSentAt ? (
                        <p className="text-xs text-muted mt-1">
                          Confirmation emailed{" "}
                          {new Date(s.emailsSentAt).toLocaleString()}
                        </p>
                      ) : null}
                      {s.emailError ? (
                        <p className="text-xs text-accent mt-1">
                          Email error: {s.emailError}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-sky-deep">
                      {s.status}
                      {s.billingMode === "manual" ? " · manual" : ""}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
        ) : null}

        {adminTab === "schedule" ? (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* Holidays */}
          <div>
            <h2 className="font-display text-2xl mb-2">Holiday weeks</h2>
            <p className="text-sm text-muted mb-6">
              These weeks block booking slots and show as “skipped for holiday”
              on the public site.
            </p>

            <ul className="space-y-3 mb-8">
              {payload.holidays.map((h) => (
                <li
                  key={h.id}
                  className="bg-white border border-line px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{h.title}</p>
                    <p className="text-sm text-muted">
                      {h.startDate} → {h.endDate}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button
                      type="button"
                      className="text-sky-deep hover:underline"
                      onClick={() => {
                        setHolidayForm(h);
                        setEditingHolidayId(h.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={async () => {
                        await persist(removeHoliday(payload, h.id));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <form
              onSubmit={saveHoliday}
              className="bg-white border border-line p-5 space-y-3"
            >
              <h3 className="font-semibold">
                {editingHolidayId ? "Edit holiday" : "Add holiday week"}
              </h3>
              <input
                className="admin-input"
                placeholder="Title (e.g. Christmas Week)"
                value={holidayForm.title}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, title: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="admin-input"
                  value={holidayForm.startDate}
                  onChange={(e) =>
                    setHolidayForm({ ...holidayForm, startDate: e.target.value })
                  }
                />
                <input
                  type="date"
                  className="admin-input"
                  value={holidayForm.endDate}
                  onChange={(e) =>
                    setHolidayForm({ ...holidayForm, endDate: e.target.value })
                  }
                />
              </div>
              <textarea
                className="admin-input min-h-[80px]"
                placeholder="Public note"
                value={holidayForm.publicNote}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, publicNote: e.target.value })
                }
              />
              <div className="flex gap-3">
                <button type="submit" className="btn-primary">
                  {editingHolidayId ? "Update holiday" : "Add holiday"}
                </button>
                {editingHolidayId && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setHolidayForm(emptyHoliday());
                      setEditingHolidayId(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Events */}
          <div>
            <h2 className="font-display text-2xl mb-2">
              Performances &amp; events
            </h2>
            <p className="text-sm text-muted mb-6">
              Recitals, showcases, and other studio events.
            </p>

            <ul className="space-y-3 mb-8">
              {payload.events.map((ev) => (
                <li
                  key={ev.id}
                  className="bg-white border border-line px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-sm text-muted">
                      {ev.startsAt}
                      {ev.visibility === "students_only"
                        ? " · students only"
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button
                      type="button"
                      className="text-sky-deep hover:underline"
                      onClick={() => {
                        setEventForm(ev);
                        setEditingEventId(ev.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={async () => {
                        await persist(removeEvent(payload, ev.id));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <form
              onSubmit={saveEvent}
              className="bg-white border border-line p-5 space-y-3"
            >
              <h3 className="font-semibold">
                {editingEventId ? "Edit event" : "Add event"}
              </h3>
              <input
                className="admin-input"
                placeholder="Title"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
              />
              <input
                type="datetime-local"
                className="admin-input"
                value={eventForm.startsAt ? eventForm.startsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    startsAt: e.target.value || "",
                  })
                }
              />
              <input
                className="admin-input"
                placeholder="Venue"
                value={eventForm.venue || ""}
                onChange={(e) =>
                  setEventForm({ ...eventForm, venue: e.target.value })
                }
              />
              <textarea
                className="admin-input min-h-[80px]"
                placeholder="Description"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
              />
              <input
                className="admin-input"
                placeholder="Info URL (optional)"
                value={eventForm.infoUrl || ""}
                onChange={(e) =>
                  setEventForm({ ...eventForm, infoUrl: e.target.value })
                }
              />
              <select
                className="admin-input"
                value={eventForm.visibility}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    visibility: e.target.value as StudioEvent["visibility"],
                  })
                }
              >
                <option value="public">Public</option>
                <option value="students_only">Students only</option>
              </select>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary">
                  {editingEventId ? "Update event" : "Add event"}
                </button>
                {editingEventId && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEventForm(emptyEvent());
                      setEditingEventId(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
        ) : null}

        {/* Flyer campaigns */}
        {adminTab === "marketing" ? (
        <section>
          <h2 className="font-display text-2xl mb-2">Flyer URLs</h2>
          <p className="text-sm text-muted mb-6">
            Share <code className="text-xs">/f/&#123;code&#125;</code> on print
            materials. Hits redirect to the trial page with attribution.
          </p>
          <div className="bg-white border border-line overflow-x-auto mb-6">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Trials</th>
                  <th className="px-4 py-3">QR URL</th>
                </tr>
              </thead>
              <tbody>
                {(payload.flyers || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-muted">
                      No flyers yet — add one below (or hit a{" "}
                      <code>/f/…</code> URL once).
                    </td>
                  </tr>
                )}
                {(payload.flyers || []).map((f) => (
                  <tr key={f.code} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{f.code}</td>
                    <td className="px-4 py-3">{f.label}</td>
                    <td className="px-4 py-3">{f.views ?? 0}</td>
                    <td className="px-4 py-3">{f.trials ?? 0}</td>
                    <td className="px-4 py-3">
                      <a
                        className="text-sky-deep underline break-all"
                        href={`${siteUrl()}/f/${f.code}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {siteUrl()}/f/{f.code}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form
            onSubmit={addFlyer}
            className="bg-white border border-line p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <label className="text-sm">
              <span className="text-muted text-xs uppercase tracking-wider">
                Code
              </span>
              <input
                className="admin-input mt-1"
                placeholder="bowan-qr-01"
                value={flyerCode}
                onChange={(e) => setFlyerCode(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted text-xs uppercase tracking-wider">
                Label
              </span>
              <input
                className="admin-input mt-1"
                placeholder="Bowan Village flyer"
                value={flyerLabel}
                onChange={(e) => setFlyerLabel(e.target.value)}
              />
            </label>
            <button type="submit" className="btn-primary">
              Add flyer
            </button>
          </form>
        </section>
        ) : null}

        <p className="text-xs text-muted pb-8">
          Last updated: {payload.updatedAt}
          {" · "}
          Tip: set a real <code>ADMIN_TOKEN</code> secret on the worker before
          going live.
        </p>
      </main>
    </div>
  );
};

export default Admin;
