"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  impersonateStudent,
  resendStudentMagicLink,
} from "../lib/bookingApi";
import type {
  HolidayWeek,
  StudentEnrollment,
  StudioEmailLog,
  StudioPayload,
  StudioSubscription,
} from "../types/studio";

const TZ = "America/New_York";

type NavId = "account" | "subscription" | "custom" | "emails";

const NAV: { id: NavId; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "subscription", label: "Subscription" },
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
  const { confirm, confirmProps } = useConfirmModal();
  const id = String(params?.id || "");
  const [payload, setPayload] = useState<StudioPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [section, setSection] = useState<NavId>("account");

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
