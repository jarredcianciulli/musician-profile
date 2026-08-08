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
  StudioEvent,
  StudioPayload,
  Weekday,
} from "../types/studio";
import { siteUrl } from "../lib/env";

const DAY_LABELS: { day: Weekday; label: string }[] = [
  { day: 0, label: "Sunday" },
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
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

  useEffect(() => {
    if (!authed) return;
    loadStudio({ includePrivate: true }).then(setPayload);
  }, [authed]);

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

        {/* Teaching hours */}
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

        {/* Bookings */}
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

        {/* Flyer campaigns */}
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
