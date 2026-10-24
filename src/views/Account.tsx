"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  clearAccountSessionToken,
  exchangeAccountMagicToken,
  fetchAccountMe,
  getAccountSessionToken,
  requestAccountMagicLink,
  startAccountCheckout,
  type AccountPortalData,
} from "../lib/bookingApi";
import {
  buildLessonsIcs,
  downloadIcs,
  googleCalendarUrlForLesson,
} from "../lib/accountCalendar";
import {
  filterSchedule,
  paginateRows,
  scheduleDateBounds,
  SCHEDULE_PAGE_SIZE,
  type ScheduleKindFilter,
} from "../lib/accountScheduleFilters";
import { formatSlotDay, formatSlotTime } from "../lib/slots";
import { marketingSiteUrl, studioEmail } from "../lib/env";

const SCHEDULE_COLLAPSE_KEY = "bss_account_schedule_open";

const TZ = "America/New_York";

function formatMoney(cents: number) {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Paid";
    case "due":
      return "Due now";
    case "upcoming":
      return "Scheduled";
    case "scheduled":
      return "Scheduled";
    case "holiday":
      return "Holiday";
    case "break":
      return "Break";
    default:
      return status;
  }
}

const Account: React.FC = () => {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AccountPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState<"auto" | "manual" | null>(
    null
  );
  const [kindFilter, setKindFilter] = useState<ScheduleKindFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const paidBanner = searchParams.get("paid") === "1";
  const canceledBanner = searchParams.get("canceled") === "1";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SCHEDULE_COLLAPSE_KEY);
      if (raw === "0") setScheduleOpen(false);
      if (raw === "1") setScheduleOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SCHEDULE_COLLAPSE_KEY, scheduleOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [scheduleOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!data?.enrollment?.id || !data.schedule) return;
    const bounds = scheduleDateBounds(data.schedule);
    setDateFrom(bounds.from);
    setDateTo(bounds.to);
    setKindFilter("all");
    setSchedulePage(1);
  }, [data?.enrollment?.id]);

  useEffect(() => {
    setSchedulePage(1);
  }, [kindFilter, dateFrom, dateTo]);

  const scheduleRows = useMemo(
    () => data?.schedule || [],
    [data?.schedule]
  );

  const filteredSchedule = useMemo(
    () =>
      filterSchedule(scheduleRows, {
        kind: kindFilter,
        from: dateFrom,
        to: dateTo,
      }),
    [scheduleRows, kindFilter, dateFrom, dateTo]
  );

  const {
    pageRows: pagedSchedule,
    total: filteredCount,
    page: safePage,
    pageCount,
  } = useMemo(
    () => paginateRows(filteredSchedule, schedulePage, SCHEDULE_PAGE_SIZE),
    [filteredSchedule, schedulePage]
  );

  const exportLessons = useMemo(
    () =>
      filterSchedule(scheduleRows, {
        kind: "lessons",
        from: dateFrom,
        to: dateTo,
      })
        .filter((row) => row.start && row.end)
        .map((row) => ({
          start: row.start,
          end: row.end as string,
          title: row.title,
        })),
    [scheduleRows, dateFrom, dateTo]
  );

  useEffect(() => {
    let cancelled = false;
    const token = searchParams.get("token");

    async function boot() {
      setLoading(true);
      setError("");
      try {
        if (token) {
          const next = await exchangeAccountMagicToken(token);
          if (!cancelled) {
            setData(next);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("token");
              window.history.replaceState({}, "", url.pathname + url.search);
            }
          }
          return;
        }
        if (getAccountSessionToken()) {
          const next = await fetchAccountMe();
          if (!cancelled) setData(next);
          return;
        }
        if (!cancelled) setData(null);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Could not sign in.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const refresh = async () => {
    try {
      const next = await fetchAccountMe();
      setData(next);
      setError("");
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Session expired.");
    }
  };

  useEffect(() => {
    if (!paidBanner || !getAccountSessionToken()) return;
    const t = window.setTimeout(() => {
      void refresh();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [paidBanner]);

  const onRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    setError("");
    setLinkSent(false);
    try {
      await requestAccountMagicLink(email.trim());
      setLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send link.");
    } finally {
      setRequesting(false);
    }
  };

  const onCheckout = async (mode: "auto" | "manual") => {
    setCheckoutBusy(mode);
    setError("");
    try {
      const { url } = await startAccountCheckout(mode);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setCheckoutBusy(null);
    }
  };

  const signOut = () => {
    clearAccountSessionToken();
    setData(null);
  };

  if (loading) {
    return (
      <div className="section-container py-20 max-w-2xl">
        <p className="text-muted text-sm">Loading your account…</p>
      </div>
    );
  }

  if (!data?.enrollment) {
    return (
      <div className="section-container py-16 max-w-md">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
          Student account
        </p>
        <h1 className="font-display text-4xl text-ink mt-2 mb-3">
          Need a sign-in link?
        </h1>
        <p className="text-ink-soft mb-6 leading-relaxed">
          Open the magic link from your invite email, or email the studio for a
          fresh one — we&apos;ll resend it from Admin.
        </p>
        <p className="mb-8">
          <a
            className="btn-primary inline-flex"
            href={`mailto:${studioEmail()}?subject=${encodeURIComponent(
              "Please resend my Battery String Studio account link"
            )}`}
          >
            Email {studioEmail()}
          </a>
        </p>
        {error ? (
          <p className="text-sm text-accent mb-4" role="alert">
            {error}
          </p>
        ) : null}
        {linkSent ? (
          <p className="text-sm text-ink-soft mb-4 border border-line bg-paper-muted/50 px-4 py-3">
            If that email is on file, a sign-in link is on its way. Check your
            inbox (and spam).
          </p>
        ) : null}
        <details className="text-sm text-muted">
          <summary className="cursor-pointer hover:text-ink">
            Already invited? Request a link to this email
          </summary>
          <form onSubmit={onRequestLink} className="space-y-4 mt-4">
            <label className="block text-sm text-ink">
              <span className="text-muted text-xs uppercase tracking-wider">
                Email
              </span>
              <input
                type="email"
                className="admin-input mt-1 w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <button
              type="submit"
              className="btn-secondary w-full"
              disabled={requesting || !email.trim()}
            >
              {requesting ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        </details>
      </div>
    );
  }

  const { enrollment, billingItems, payments } = data;
  const due = enrollment.amountDueCents || 0;
  const mode = enrollment.billingMode || "manual";
  const autoReady = mode === "auto" && Boolean(enrollment.stripeSubscriptionId);
  const showAutoSetup = mode === "auto" && !enrollment.stripeSubscriptionId;
  const showManualPay = mode === "manual" || mode === "unset";
  const showChoice = mode === "unset";
  const scheduleBounds = scheduleDateBounds(scheduleRows);
  const lessonTitle = `Lesson — ${enrollment.name}`;
  const billingRows = billingItems || [];
  const filtersActive =
    kindFilter !== "all" ||
    dateFrom !== scheduleBounds.from ||
    dateTo !== scheduleBounds.to;

  const clearScheduleFilters = () => {
    setKindFilter("all");
    setDateFrom(scheduleBounds.from);
    setDateTo(scheduleBounds.to);
    setSchedulePage(1);
  };

  const downloadAllCalendars = () => {
    const ics = buildLessonsIcs(exportLessons, {
      name: enrollment.name,
      calendarName: `BSS — ${enrollment.name}`,
    });
    downloadIcs(
      `bss-lessons-${enrollment.name.replace(/\s+/g, "-").toLowerCase()}.ics`,
      ics
    );
  };

  const billingLabel =
    enrollment.billingMode === "auto"
      ? "Auto-charge monthly"
      : enrollment.billingMode === "manual"
        ? "Pay by link"
        : "Not set";

  return (
    <div className="section-container py-12 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold">
            Your account
          </p>
          <h1 className="font-display text-4xl text-ink mt-2">
            {enrollment.name}
          </h1>
          <p className="text-muted text-sm mt-1">{enrollment.email}</p>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            className="btn-secondary text-xs"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            Menu
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 border border-line bg-white shadow-sm z-20 py-1 text-sm"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full text-left px-4 py-2.5 hover:bg-paper-muted"
                onClick={() => {
                  setInfoOpen(true);
                  setMenuOpen(false);
                }}
              >
                Account info
              </button>
              <a
                role="menuitem"
                className="block px-4 py-2.5 hover:bg-paper-muted text-ink"
                href={marketingSiteUrl()}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
              >
                Studio website
              </a>
              <button
                type="button"
                role="menuitem"
                className="w-full text-left px-4 py-2.5 hover:bg-paper-muted text-muted"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {infoOpen ? (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-ink/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-info-title"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="bg-white border border-line w-full max-w-md p-5 space-y-4 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="account-info-title"
                className="font-display text-2xl"
              >
                Account info
              </h2>
              <button
                type="button"
                className="text-xs text-muted underline underline-offset-2"
                onClick={() => setInfoOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="text-xs text-muted">
              Read-only — contact the studio to change these.
            </p>
            <dl className="text-sm space-y-3">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Name
                </dt>
                <dd>{enrollment.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Email
                </dt>
                <dd>{enrollment.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Lesson
                </dt>
                <dd>
                  {enrollment.durationMinutes} min ·{" "}
                  {enrollment.format === "online" ? "Online" : "In person"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Weekly time
                </dt>
                <dd>
                  {formatSlotDay(enrollment.slotStart, TZ)} ·{" "}
                  {formatSlotTime(enrollment.slotStart, TZ)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Billing
                </dt>
                <dd>{billingLabel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Schedule shown
                </dt>
                <dd>{enrollment.scheduleMonths || 12} months ahead</dd>
              </div>
            </dl>
            <p className="text-xs text-muted pt-1">
              Need a change?{" "}
              <a
                className="underline underline-offset-2"
                href={`mailto:${studioEmail()}`}
              >
                {studioEmail()}
              </a>
            </p>
          </div>
        </div>
      ) : null}

      {paidBanner ? (
        <p className="text-sm border border-line bg-paper-muted/50 px-4 py-3 mb-6">
          Payment received — thank you.
        </p>
      ) : null}
      {canceledBanner ? (
        <p className="text-sm text-muted mb-6">
          Checkout canceled. You can try again anytime.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-accent mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mb-10">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <button
            type="button"
            className="text-left group"
            aria-expanded={scheduleOpen}
            onClick={() => setScheduleOpen((o) => !o)}
          >
            <h2 className="font-display text-2xl group-hover:text-sky-ink">
              Schedule{" "}
              <span className="text-sm font-sans text-muted font-normal">
                {scheduleOpen ? "▾" : "▸"}
              </span>
            </h2>
            <p className="text-sm text-muted mt-1">
              {enrollment.durationMinutes}-minute{" "}
              {enrollment.format === "online" ? "online" : "in-person"} · next{" "}
              {enrollment.scheduleMonths || 12} months
              {!scheduleOpen ? " · collapsed" : ""}
            </p>
          </button>
          {scheduleOpen && exportLessons.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={downloadAllCalendars}
              >
                Apple Calendar (.ics)
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={downloadAllCalendars}
              >
                Google Calendar (.ics)
              </button>
              {exportLessons[0] ? (
                <a
                  className="btn-secondary text-xs inline-flex items-center"
                  href={googleCalendarUrlForLesson(
                    exportLessons[0],
                    lessonTitle
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Next lesson → Google
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {scheduleOpen ? (
          <>
        <p className="text-xs text-muted mb-4">
          Download .ics for lessons in the date range below (Apple Calendar or
          Google Calendar → Settings → Import).
        </p>

        {scheduleRows.length === 0 ? (
          <p className="text-sm text-ink-soft">No upcoming times listed yet.</p>
        ) : (
          <>
            <div className="border border-line bg-white p-4 mb-3 space-y-3">
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Schedule kind"
              >
                {(
                  [
                    { id: "all" as const, label: "All dates" },
                    { id: "lessons" as const, label: "Lessons" },
                    { id: "closed" as const, label: "Studio closed" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`px-3 py-1.5 text-xs border transition-colors ${
                      kindFilter === opt.id
                        ? "border-sky-ink bg-paper-muted text-ink font-medium"
                        : "border-line text-muted hover:text-ink"
                    }`}
                    onClick={() => setKindFilter(opt.id)}
                    aria-pressed={kindFilter === opt.id}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm block">
                  <span className="text-muted text-xs uppercase tracking-wider">
                    From
                  </span>
                  <input
                    type="date"
                    className="admin-input mt-1 w-full"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label className="text-sm block">
                  <span className="text-muted text-xs uppercase tracking-wider">
                    To
                  </span>
                  <input
                    type="date"
                    className="admin-input mt-1 w-full"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>
                  {filteredCount} matching
                  {filtersActive ? " (filtered)" : ""}
                </span>
                {filtersActive ? (
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-ink"
                    onClick={clearScheduleFilters}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>

            {filteredCount === 0 ? (
              <p className="text-sm text-ink-soft border border-line bg-white px-4 py-6">
                No dates match these filters.
              </p>
            ) : (
              <>
                <div className="border border-line bg-white overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Time / note</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedSchedule.map((row) => {
                        const isOff =
                          row.type === "holiday" || row.type === "break";
                        return (
                          <tr
                            key={`${row.type}-${row.start}`}
                            className={`border-b border-line/70 last:border-0 ${
                              isOff ? "bg-paper-muted/40" : ""
                            }`}
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatSlotDay(row.start, TZ)}
                            </td>
                            <td className="px-3 py-2 capitalize">
                              {row.type === "lesson"
                                ? "Lesson"
                                : row.type === "break"
                                  ? "Break"
                                  : "Holiday"}
                            </td>
                            <td className="px-3 py-2 text-ink-soft">
                              {isOff
                                ? row.title ||
                                  (row.holidayStart && row.holidayEnd
                                    ? `${row.holidayStart} → ${row.holidayEnd}`
                                    : "Studio closed")
                                : `${formatSlotTime(row.start, TZ)}${
                                    row.end
                                      ? ` – ${formatSlotTime(row.end, TZ)}`
                                      : ""
                                  }`}
                            </td>
                            <td className="px-3 py-2">
                              {statusLabel(row.status || row.type)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-sm text-muted">
                  <span>
                    Showing{" "}
                    {(safePage - 1) * SCHEDULE_PAGE_SIZE + 1}
                    –
                    {Math.min(safePage * SCHEDULE_PAGE_SIZE, filteredCount)} of{" "}
                    {filteredCount}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={safePage <= 1}
                      onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={safePage >= pageCount}
                      onClick={() =>
                        setSchedulePage((p) => Math.min(pageCount, p + 1))
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
          </>
        ) : null}
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl mb-2">Billing</h2>
        {autoReady ? (
          <div className="border border-line bg-white px-4 py-4 text-sm space-y-1 mb-4">
            <p className="font-medium">Auto-charge monthly</p>
            <p className="text-ink-soft">
              Card on file
              {enrollment.nextDueAt
                ? ` · renews around ${formatSlotDay(enrollment.nextDueAt, TZ)}`
                : ""}
            </p>
          </div>
        ) : showAutoSetup ? (
          <div className="border border-line bg-white px-4 py-4 text-sm space-y-3 mb-4">
            <p className="font-medium">Set up monthly auto-charge</p>
            <p className="text-ink-soft">
              First period: {formatMoney(due)} (proration if mid-month), then
              monthly tuition on your card.
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={Boolean(checkoutBusy)}
              onClick={() => onCheckout("auto")}
            >
              {checkoutBusy === "auto" ? "Redirecting…" : "Continue to Stripe"}
            </button>
          </div>
        ) : (
          <div className="border border-line bg-white px-4 py-4 text-sm space-y-3 mb-4">
            {showChoice ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={Boolean(checkoutBusy)}
                  onClick={() => onCheckout("auto")}
                >
                  {checkoutBusy === "auto"
                    ? "Redirecting…"
                    : "Auto-charge monthly"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={Boolean(checkoutBusy) || due <= 0}
                  onClick={() => onCheckout("manual")}
                >
                  {checkoutBusy === "manual"
                    ? "Redirecting…"
                    : `Pay ${formatMoney(due)} this period`}
                </button>
              </div>
            ) : showManualPay && due > 0 ? (
              <button
                type="button"
                className="btn-primary"
                disabled={Boolean(checkoutBusy)}
                onClick={() => onCheckout("manual")}
              >
                {checkoutBusy === "manual"
                  ? "Redirecting…"
                  : `Pay ${formatMoney(due)} due now`}
              </button>
            ) : (
              <p className="text-muted">You&apos;re paid up for this period.</p>
            )}
          </div>
        )}

        {billingRows.length > 0 ? (
          <div className="border border-line bg-white overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {billingRows.map((item) => (
                  <tr
                    key={item.periodKey}
                    className={`border-b border-line/70 last:border-0 ${
                      item.status === "due" ? "bg-paper-muted/50" : ""
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                      {item.periodKey}
                    </td>
                    <td className="px-3 py-2 text-ink-soft">{item.label}</td>
                    <td className="px-3 py-2">
                      {formatMoney(item.amountCents)}
                    </td>
                    <td className="px-3 py-2">{statusLabel(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {(payments || []).some((p) => p.status === "paid") ? (
        <section>
          <h2 className="font-display text-xl mb-3">Payment history</h2>
          <ul className="text-sm divide-y divide-line border border-line bg-white">
            {payments
              .filter((p) => p.status === "paid")
              .slice(0, 12)
              .map((p) => (
                <li
                  key={p.id}
                  className="px-4 py-2.5 flex justify-between gap-2"
                >
                  <span className="text-ink-soft">
                    {p.kind}
                    {p.periodKey ? ` · ${p.periodKey}` : ""}
                  </span>
                  <span>{formatMoney(p.amountCents)}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default Account;
