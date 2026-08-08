"use client";

import React, { useEffect, useMemo, useState } from "react";
import { loadStudio } from "../../lib/studioApi";
import { HolidayWeek, StudioEvent } from "../../types/studio";

function formatDateRange(start: string, end: string) {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(
    undefined,
    opts
  )}`;
}

function formatEventWhen(startsAt: string) {
  const normalized =
    startsAt.length === 16 ? `${startsAt}:00` : startsAt;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return startsAt;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const StudioCalendar: React.FC = () => {
  const [holidays, setHolidays] = useState<HolidayWeek[]>([]);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadStudio().then((payload) => {
      if (!active) return;
      setHolidays(payload.holidays || []);
      setEvents(
        (payload.events || []).filter((e) => e.visibility === "public")
      );
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return holidays
      .filter((h) => h.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [holidays]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.startsAt).getTime() >= now - 86400000)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [events]);

  return (
    <section id="calendar" className="relative py-20 bg-paper">
      <div className="section-container">
        <div className="max-w-2xl mb-12">
          <p className="text-gold-deep font-semibold text-sm tracking-wide uppercase mb-3">
            Studio calendar
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-ink mb-4">
            Holidays &amp; performances
          </h2>
          <p className="text-muted text-lg leading-relaxed">
            Holiday weeks are skipped up front — no lessons those weeks. Monthly
            tuition already accounts for them. Performances and studio events
            live here too.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          <div>
            <h3 className="font-display text-xl text-ink mb-5">
              Skipped for holiday
            </h3>
            {!loaded && (
              <p className="text-muted text-sm">Loading calendar…</p>
            )}
            {loaded && upcomingHolidays.length === 0 && (
              <p className="text-muted">No upcoming holiday weeks posted yet.</p>
            )}
            <ul className="space-y-4">
              {upcomingHolidays.map((h) => (
                <li key={h.id} className="border-l-2 border-gold pl-4 py-1">
                  <p className="font-semibold text-ink">{h.title}</p>
                  <p className="text-sm text-muted mt-0.5">
                    {formatDateRange(h.startDate, h.endDate)}
                  </p>
                  <p className="text-sm text-ink-soft/80 mt-1">{h.publicNote}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-xl text-ink mb-5">
              Performances &amp; events
            </h3>
            {loaded && upcomingEvents.length === 0 && (
              <p className="text-muted">No upcoming performances posted yet.</p>
            )}
            <ul className="space-y-5">
              {upcomingEvents.map((e) => (
                <li
                  key={e.id}
                  className="bg-white/70 border border-line px-5 py-4"
                >
                  <p className="font-semibold text-ink text-lg">{e.title}</p>
                  <p className="text-sm text-gold-deep mt-1">
                    {formatEventWhen(e.startsAt)}
                  </p>
                  {e.venue && (
                    <p className="text-sm text-muted mt-1">{e.venue}</p>
                  )}
                  <p className="text-ink-soft/90 mt-2 leading-relaxed">
                    {e.description}
                  </p>
                  {e.infoUrl && (
                    <a
                      href={e.infoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-sm font-medium text-accent hover:text-accent-hover"
                    >
                      More info →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StudioCalendar;
