"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BowStringMark from "../components/brand/BowStringMark";
import { ConfirmModal } from "../components/ConfirmModal";
import { useConfirmModal } from "../hooks/useConfirmModal";
import { emailTemplateById } from "../content/emailTemplates";
import {
  clearAdminToken,
  getAdminToken,
  loadStudio,
} from "../lib/studioApi";
import { formatSlotDay, formatSlotTime } from "../lib/slots";
import { nextLessonStartIso } from "../lib/studentSchedule";
import { grantStudentEditAccess } from "../lib/adminStudentEditGate";
import {
  cancelStudentInvite,
  completeTrialBooking,
  impersonateStudent,
  recordTrialForStudent,
  resendStudentMagicLink,
} from "../lib/bookingApi";
import type {
  HolidayWeek,
  LessonBooking,
  LessonFormat,
  StudentEnrollment,
  StudioEmailLog,
  StudioPayload,
  StudioSubscription,
} from "../types/studio";

const TZ = "America/New_York";

type NavId = "account" | "subscription" | "custom" | "trial" | "emails";

const NAV: { id: NavId; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "subscription", label: "Subscription" },
  { id: "trial", label: "Record trial" },
  { id: "custom", label: "Custom info" },
  { id: "emails", label: "Emails" },
];

function isPendingInvite(e: StudentEnrollment) {
  if (e.status === "cancelled") return false;
  if (e.status === "invited") return true;
  if (e.stripeSubscriptionId) return false;
  if (e.paidThroughPeriodKey) return false;
  return true;
}

const AdminStudentDetail: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, confirmProps } = useConfirmModal();
  const id = String(params?.id || "");
  const [payload, setPayload] = useState<StudioPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [section, setSection] = useState<NavId>("account");

  useEffect(() => {
    const s = searchParams.get("section");
    if (
      s === "account" ||
      s === "subscription" ||
      s === "custom" ||
      s === "trial" ||
      s === "emails"
    ) {
      setSection(s);
    }
  }, [searchParams]);
  const [trialLocal, setTrialLocal] = useState("");
  const [trialDuration, setTrialDuration] = useState<30 | 45>(30);
  const [trialFormat, setTrialFormat] = useState<LessonFormat>("in_person");
  const [trialAmount, setTrialAmount] = useState("35");
  const [trialWaive, setTrialWaive] = useState(false);
  const [trialMarkPaid, setTrialMarkPaid] = useState(true);
  const [trialMarkComplete, setTrialMarkComplete] = useState(true);
  const [trialSendEmail, setTrialSendEmail] = useState(false);
  const [trialSummary, setTrialSummary] = useState("");

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/admin");
      return;
    }
    loadStudio({ includePrivate: true })
      .then(setPayload)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load.")
      );
  }, [router]);

  const enrollment = useMemo(
    () => (payload?.enrollments || []).find((e) => e.id === id) || null,
    [payload, id]
  );

  const holidays: HolidayWeek[] = payload?.holidays || [];
  const nextLesson = enrollment
    ? nextLessonStartIso(enrollment.slotStart, holidays)
    : null;

  const subscription: StudioSubscription | null = useMemo(() => {
    if (!enrollment || !payload) return null;
    const subs = payload.subscriptions || [];
    return (
      subs.find((s) => s.enrollmentId === enrollment.id) ||
      subs.find(
        (s) =>
          s.email?.toLowerCase() === enrollment.email.toLowerCase() &&
          s.status !== "cancelled"
      ) ||
      null
    );
  }, [enrollment, payload]);

  const peers = useMemo(() => {
    const list = (payload?.enrollments || []).filter(
      (e) => e.status !== "cancelled"
    );
    return [...list].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [payload]);

  const onEdit = () => {
    grantStudentEditAccess(id);
    router.push(`/admin/students/${id}/edit`);
  };

  const studentEmails: StudioEmailLog[] = useMemo(() => {
    if (!enrollment || !payload) return [];
    const email = (enrollment.email || "").toLowerCase();
    return (payload.emails || []).filter(
      (em) =>
        em.enrollmentId === enrollment.id ||
        (email && em.to?.toLowerCase() === email)
    );
  }, [enrollment, payload]);

  const studentTrials: LessonBooking[] = useMemo(() => {
    if (!enrollment || !payload) return [];
    return (payload.bookings || [])
      .filter(
        (b) =>
          b.lessonType === "trial" &&
          b.status !== "cancelled" &&
          (b.enrollmentId === enrollment.id ||
            b.id === enrollment.trialBookingId ||
            (b.email || "").toLowerCase() ===
              (enrollment.email || "").toLowerCase())
      )
      .sort((a, b) => (b.start || "").localeCompare(a.start || ""));
  }, [enrollment, payload]);

  const onResend = async () => {
    const token = getAdminToken();
    if (!token || !enrollment) return;
    const ok = await confirm("resendMagicLink", {
      name: enrollment.name,
      email: enrollment.email,
    });
    if (!ok) return;
    setBusy("resend");
    setError("");
    try {
      await resendStudentMagicLink(enrollment.id, token);
      const refreshed = await loadStudio({ includePrivate: true });
      setPayload(refreshed);
      setBusy("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resend failed.");
      setBusy("");
      try {
        setPayload(await loadStudio({ includePrivate: true }));
      } catch {
        /* ignore */
      }
    }
  };

  const onCancelInvite = async () => {
    const token = getAdminToken();
    if (!token || !enrollment) return;
    const ok = await confirm("cancelInvite", {
      name: enrollment.name,
      email: enrollment.email,
    });
    if (!ok) return;
    setBusy("cancel");
    setError("");
    try {
      await cancelStudentInvite(enrollment.id, token);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
      setBusy("");
    }
  };

  const onOpenAsStudent = async () => {
    const token = getAdminToken();
    if (!token || !enrollment) return;
    const ok = await confirm("openAsStudent", {
      name: enrollment.name,
      email: enrollment.email,
    });
    if (!ok) return;
    setBusy("impersonate");
    setError("");
    try {
      const result = await impersonateStudent(enrollment.id, token);
      window.open(result.url, "_blank", "noopener,noreferrer");
      setBusy("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open student portal."
      );
      setBusy("");
    }
  };

  const onRecordTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token || !enrollment) return;
    setError("");
    setTrialSummary("");
    if (!trialLocal) {
      setError("Choose the trial date and time.");
      return;
    }
    const startDate = new Date(trialLocal);
    if (Number.isNaN(startDate.getTime())) {
      setError("Invalid date/time.");
      return;
    }
    const start = startDate.toISOString();
    const end = new Date(
      startDate.getTime() + trialDuration * 60 * 1000
    ).toISOString();
    const amountDollars = trialWaive ? undefined : Number(trialAmount);
    if (
      !trialWaive &&
      (!Number.isFinite(amountDollars) || (amountDollars as number) < 0)
    ) {
      setError("Enter a valid trial price, or check Waive.");
      return;
    }

    const whenLabel = `${formatSlotDay(start, TZ)} · ${formatSlotTime(start, TZ)}`;
    const paid = trialWaive || trialMarkPaid;
    const complete = paid && trialMarkComplete;
    const ok = await confirm("recordTrial", {
      name: enrollment.name,
      email: enrollment.email,
      waived: trialWaive,
      amountLabel: trialWaive ? undefined : `$${trialAmount}`,
      whenLabel,
    });
    if (!ok) return;

    setBusy("trial");
    try {
      const result = await recordTrialForStudent(
        {
          enrollmentId: enrollment.id,
          start,
          end,
          format: trialFormat,
          durationMinutes: trialDuration,
          amountDollars: trialWaive ? undefined : amountDollars,
          waive: trialWaive,
          markPaid: trialWaive ? true : trialMarkPaid,
          markComplete: complete,
          sendEmail: trialSendEmail,
        },
        token
      );
      setTrialSummary(result.summary);
      setPayload(await loadStudio({ includePrivate: true }));
      setBusy("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record trial.");
      setBusy("");
    }
  };

  const onCompleteTrial = async (booking: LessonBooking) => {
    const token = getAdminToken();
    if (!token || !enrollment) return;
    const whenLabel = `${formatSlotDay(booking.start, TZ)} · ${formatSlotTime(booking.start, TZ)}`;
    const ok = await confirm("completeTrial", {
      name: enrollment.name,
      email: enrollment.email,
      whenLabel,
    });
    if (!ok) return;
    setBusy(`complete-${booking.id}`);
    setError("");
    try {
      const result = await completeTrialBooking({ bookingId: booking.id }, token);
      setTrialSummary(result.summary);
      setPayload(await loadStudio({ includePrivate: true }));
      setBusy("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not mark trial complete."
      );
      setBusy("");
    }
  };

  if (!getAdminToken()) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">
        Redirecting…
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">
        Loading…
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="section-container py-16 max-w-lg">
          <p className="text-sm text-muted mb-4">Student not found.</p>
          <Link href="/admin" className="btn-secondary text-sm">
            Back to admin
          </Link>
        </div>
      </div>
    );
  }

  const pending = isPendingInvite(enrollment);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white sticky top-0 z-10">
        <div className="section-container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BowStringMark className="w-6 h-10 text-sky-deep shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                Student
              </p>
              <p className="font-display text-xl truncate">{enrollment.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="btn-primary text-xs" onClick={onEdit}>
              Edit
            </button>
            <Link href="/admin" className="btn-secondary text-xs">
              All students
            </Link>
            <button
              type="button"
              className="text-xs text-muted underline underline-offset-2"
              onClick={() => {
                clearAdminToken();
                router.push("/admin");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="section-container py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <aside className="space-y-6">
          <nav className="border border-line bg-white">
            <p className="text-[10px] uppercase tracking-wider text-muted px-3 py-2 border-b border-line">
              This student
            </p>
            <ul>
              {NAV.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-line/70 last:border-0 ${
                      section === item.id
                        ? "bg-paper-muted font-medium text-sky-ink"
                        : "hover:bg-paper-muted/50 text-ink-soft"
                    }`}
                    onClick={() => setSection(item.id)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border border-line bg-white">
            <p className="text-[10px] uppercase tracking-wider text-muted px-3 py-2 border-b border-line">
              Active students
            </p>
            <ul className="max-h-64 overflow-y-auto">
              {peers.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/students/${p.id}`}
                    className={`block px-3 py-2 text-sm border-b border-line/70 last:border-0 truncate ${
                      p.id === id
                        ? "bg-paper-muted font-medium"
                        : "hover:bg-paper-muted/50 text-ink-soft"
                    }`}
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="space-y-4 min-w-0">
          {error ? (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={busy === "impersonate"}
              onClick={onOpenAsStudent}
            >
              {busy === "impersonate" ? "Opening…" : "Open as student"}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy === "resend"}
              onClick={onResend}
            >
              {busy === "resend" ? "Sending…" : "Resend magic link"}
            </button>
            {pending ? (
              <button
                type="button"
                className="btn-secondary text-xs text-accent"
                disabled={busy === "cancel"}
                onClick={onCancelInvite}
              >
                {busy === "cancel" ? "Cancelling…" : "Cancel invite"}
              </button>
            ) : null}
          </div>

          {section === "account" ? (
            <section className="border border-line bg-white px-5 py-5 space-y-4">
              <h2 className="font-display text-2xl">Account info</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
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
                  <dd className="break-all">{enrollment.email}</dd>
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
                    Status
                  </dt>
                  <dd>{enrollment.status}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Start date
                  </dt>
                  <dd>
                    {formatSlotDay(enrollment.slotStart, TZ)} ·{" "}
                    {formatSlotTime(enrollment.slotStart, TZ)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Next lesson
                  </dt>
                  <dd>
                    {nextLesson
                      ? `${formatSlotDay(nextLesson, TZ)} · ${formatSlotTime(nextLesson, TZ)}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Schedule horizon
                  </dt>
                  <dd>{enrollment.scheduleMonths || 12} months</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Policy accepted
                  </dt>
                  <dd>
                    {enrollment.policyAcceptedAt
                      ? new Date(enrollment.policyAcceptedAt).toLocaleString()
                      : "Not yet"}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {section === "subscription" ? (
            <section className="border border-line bg-white px-5 py-5 space-y-4">
              <h2 className="font-display text-2xl">Subscription info</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Billing mode
                  </dt>
                  <dd>
                    {enrollment.billingMode === "auto"
                      ? "Auto-charge"
                      : enrollment.billingMode === "manual"
                        ? "Pay by link"
                        : enrollment.billingMode || "unset"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Auto-charge on file
                  </dt>
                  <dd>
                    {enrollment.billingMode === "auto" &&
                    enrollment.stripeSubscriptionId
                      ? "Yes"
                      : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Amount due
                  </dt>
                  <dd>
                    ${((enrollment.amountDueCents || 0) / 100).toFixed(
                      (enrollment.amountDueCents || 0) % 100 === 0 ? 0 : 2
                    )}
                    {enrollment.amountDueLocked ? " (custom)" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Paid through
                  </dt>
                  <dd>{enrollment.paidThroughPeriodKey || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Next billing
                  </dt>
                  <dd>
                    {enrollment.nextDueAt
                      ? formatSlotDay(enrollment.nextDueAt, TZ)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Start date
                  </dt>
                  <dd>{formatSlotDay(enrollment.slotStart, TZ)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Next lesson
                  </dt>
                  <dd>
                    {nextLesson
                      ? `${formatSlotDay(nextLesson, TZ)} · ${formatSlotTime(nextLesson, TZ)}`
                      : "—"}
                  </dd>
                </div>
                {subscription ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      Stripe subscription record
                    </dt>
                    <dd className="text-ink-soft">
                      {subscription.status}
                      {subscription.billingMode
                        ? ` · ${subscription.billingMode}`
                        : ""}
                      {subscription.createdAt
                        ? ` · created ${new Date(subscription.createdAt).toLocaleDateString()}`
                        : ""}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {section === "trial" ? (
            <section className="border border-line bg-white px-5 py-5 space-y-4">
              <h2 className="font-display text-2xl">Record trial lesson</h2>
              <p className="text-sm text-muted max-w-xl">
                Attach a trial to this existing account — including past dates —
                so it appears on their schedule and payment history. Does not
                change their weekly lesson slot when they already have one. No
                email unless you check the option below.
              </p>
              <form onSubmit={onRecordTrial} className="space-y-4 max-w-xl">
                <label className="text-sm block">
                  <span className="text-muted text-xs uppercase tracking-wider">
                    Trial date &amp; time
                  </span>
                  <input
                    type="datetime-local"
                    className="admin-input mt-1"
                    value={trialLocal}
                    onChange={(e) => setTrialLocal(e.target.value)}
                    required
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-sm block">
                    <span className="text-muted text-xs uppercase tracking-wider">
                      Length
                    </span>
                    <select
                      className="admin-input mt-1"
                      value={trialDuration}
                      onChange={(e) =>
                        setTrialDuration(Number(e.target.value) as 30 | 45)
                      }
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                    </select>
                  </label>
                  <label className="text-sm block">
                    <span className="text-muted text-xs uppercase tracking-wider">
                      Format
                    </span>
                    <select
                      className="admin-input mt-1"
                      value={trialFormat}
                      onChange={(e) =>
                        setTrialFormat(e.target.value as LessonFormat)
                      }
                    >
                      <option value="in_person">In person</option>
                      <option value="online">Online</option>
                    </select>
                  </label>
                  <label className="text-sm block">
                    <span className="text-muted text-xs uppercase tracking-wider">
                      Price ($)
                    </span>
                    <input
                      className="admin-input mt-1"
                      inputMode="decimal"
                      value={trialAmount}
                      onChange={(e) => setTrialAmount(e.target.value)}
                      disabled={trialWaive}
                      placeholder="35"
                    />
                  </label>
                </div>
                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={trialWaive}
                    onChange={(e) => setTrialWaive(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">Waive trial fee</span>
                    <span className="block text-muted text-xs mt-0.5">
                      Record as complimentary ($0) in payment history.
                    </span>
                  </span>
                </label>
                {!trialWaive ? (
                  <label className="flex items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={trialMarkPaid}
                      onChange={(e) => {
                        const paid = e.target.checked;
                        setTrialMarkPaid(paid);
                        if (!paid) setTrialMarkComplete(false);
                      }}
                    />
                    <span>
                      <span className="font-medium">Mark as paid</span>
                      <span className="block text-muted text-xs mt-0.5">
                        For past / cash / already collected. Uncheck to create a
                        Stripe pay link instead.
                      </span>
                    </span>
                  </label>
                ) : null}
                <label
                  className={`flex items-start gap-3 text-sm ${
                    trialWaive || trialMarkPaid
                      ? "cursor-pointer"
                      : "opacity-50 pointer-events-none"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={trialMarkComplete && (trialWaive || trialMarkPaid)}
                    onChange={(e) => setTrialMarkComplete(e.target.checked)}
                    disabled={!trialWaive && !trialMarkPaid}
                  />
                  <span>
                    <span className="font-medium">Mark as completed</span>
                    <span className="block text-muted text-xs mt-0.5">
                      Lesson happened — shows as completed on their schedule.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={trialSendEmail}
                    onChange={(e) => setTrialSendEmail(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">Also send email</span>
                    <span className="block text-muted text-xs mt-0.5">
                      Optional — leave off when backfilling a past lesson.
                    </span>
                  </span>
                </label>
                {trialSummary ? (
                  <p className="text-sm border border-line bg-paper-muted/40 px-3 py-2">
                    {trialSummary}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy === "trial"}
                >
                  {busy === "trial" ? "Saving…" : "Record trial"}
                </button>
              </form>

              {studentTrials.length > 0 ? (
                <div className="border-t border-line pt-5 space-y-3">
                  <h3 className="font-display text-xl">Existing trials</h3>
                  <ul className="space-y-2">
                    {studentTrials.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-line px-3 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {formatSlotDay(b.start, TZ)} ·{" "}
                            {formatSlotTime(b.start, TZ)}
                          </p>
                          <p className="text-muted text-xs mt-0.5">
                            {b.durationMinutes} min
                            {b.format === "online" ? " · online" : " · in person"}
                            {" · "}
                            {b.status === "completed"
                              ? "completed"
                              : b.status === "pending_payment"
                                ? "awaiting payment"
                                : "scheduled"}
                            {typeof b.amountCents === "number"
                              ? ` · $${(b.amountCents / 100).toFixed(
                                  b.amountCents % 100 === 0 ? 0 : 2
                                )}`
                              : ""}
                          </p>
                        </div>
                        {b.status !== "completed" &&
                        b.status !== "pending_payment" ? (
                          <button
                            type="button"
                            className="btn-secondary text-xs shrink-0"
                            disabled={busy === `complete-${b.id}`}
                            onClick={() => onCompleteTrial(b)}
                          >
                            {busy === `complete-${b.id}`
                              ? "Saving…"
                              : "Mark complete"}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {section === "custom" ? (
            <section className="border border-line bg-white px-5 py-5 space-y-3">
              <h2 className="font-display text-2xl">Custom info</h2>
              <p className="text-sm text-muted">
                Private studio notes — not shown to the student.
              </p>
              {enrollment.adminNotes?.trim() ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed border border-line bg-paper-muted/40 px-4 py-3">
                  {enrollment.adminNotes}
                </p>
              ) : (
                <p className="text-sm text-muted">No notes yet. Use Edit to add some.</p>
              )}
            </section>
          ) : null}

          {section === "emails" ? (
            <section className="border border-line bg-white px-5 py-5 space-y-4">
              <h2 className="font-display text-2xl">Emails</h2>
              <p className="text-sm text-muted">
                Messages sent to this student (including invites before they
                finish signup), with delivery status.
              </p>
              {studentEmails.length === 0 ? (
                <p className="text-sm text-muted">No emails logged yet.</p>
              ) : (
                <ul className="space-y-3">
                  {studentEmails.map((em) => {
                    const tmpl = emailTemplateById(em.templateId);
                    return (
                      <li
                        key={em.id}
                        className="border border-line px-3 py-3 text-sm space-y-1"
                      >
                        <div className="flex flex-wrap justify-between gap-2 items-start">
                          <p className="font-medium">
                            {tmpl?.name || em.templateId}
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs uppercase tracking-wider ${
                                em.status === "sent"
                                  ? "text-sky-deep"
                                  : em.status === "failed"
                                    ? "text-accent"
                                    : "text-muted"
                              }`}
                            >
                              {em.status}
                            </span>
                            <Link
                              href={`/admin/emails/sent/${em.id}`}
                              className="btn-secondary text-xs"
                            >
                              Open
                            </Link>
                          </div>
                        </div>
                        <p className="text-muted">{em.subject}</p>
                        <p className="text-xs text-muted">
                          {em.createdAt
                            ? new Date(em.createdAt).toLocaleString()
                            : ""}{" "}
                          · {em.to}
                        </p>
                        {em.error ? (
                          <p className="text-xs text-accent">{em.error}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>
      <ConfirmModal {...confirmProps} />
    </div>
  );
};

export default AdminStudentDetail;
