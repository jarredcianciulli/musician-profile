"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import BowStringMark from "../components/brand/BowStringMark";
import { EmailHtmlFrame } from "../components/admin/EmailHtmlFrame";
import { emailTemplateById } from "../content/emailTemplates";
import { getAdminToken, loadStudio } from "../lib/studioApi";
import type { StudioEmailLog, StudioPayload } from "../types/studio";

const AdminEmailSent: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const [payload, setPayload] = useState<StudioPayload | null>(null);
  const [error, setError] = useState("");

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

  const email: StudioEmailLog | null = useMemo(() => {
    if (!payload) return null;
    return (payload.emails || []).find((e) => e.id === id) || null;
  }, [payload, id]);

  const tmpl = email ? emailTemplateById(email.templateId) : null;

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

  if (!email) {
    return (
      <div className="min-h-screen bg-paper text-ink section-container py-16 space-y-4">
        <p className="text-sm text-muted">
          {error || "Sent email not found."}
        </p>
        <Link href="/admin" className="btn-secondary text-sm">
          Back to admin
        </Link>
      </div>
    );
  }

  const backHref = email.enrollmentId
    ? `/admin/students/${email.enrollmentId}`
    : "/admin";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white sticky top-0 z-10">
        <div className="section-container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BowStringMark className="w-6 h-10 text-sky-deep shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                Sent email
              </p>
              <p className="font-display text-xl truncate">
                {tmpl?.name || email.templateId}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {email.enrollmentId ? (
              <Link
                href={`/admin/students/${email.enrollmentId}`}
                className="btn-secondary text-xs"
              >
                Student
              </Link>
            ) : null}
            <Link href={backHref} className="btn-secondary text-xs">
              Back
            </Link>
          </div>
        </div>
      </header>

      <div className="section-container py-8 max-w-3xl space-y-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">
              Status
            </dt>
            <dd
              className={
                email.status === "failed"
                  ? "text-accent"
                  : email.status === "sent"
                    ? "text-sky-deep"
                    : ""
              }
            >
              {email.status}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">
              Sent
            </dt>
            <dd>
              {email.createdAt
                ? new Date(email.createdAt).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">To</dt>
            <dd>
              {email.toName ? `${email.toName} · ` : ""}
              {email.to}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">
              Template
            </dt>
            <dd>
              <Link
                href={`/admin/emails/templates/${email.templateId}`}
                className="text-sky-deep hover:underline"
              >
                {tmpl?.name || email.templateId}
              </Link>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-muted">
              Subject
            </dt>
            <dd>{email.subject}</dd>
          </div>
          {email.error ? (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider text-muted">
                Error
              </dt>
              <dd className="text-accent">{email.error}</dd>
            </div>
          ) : null}
        </dl>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">
            What was sent
          </p>
          {email.html ? (
            <EmailHtmlFrame html={email.html} title={email.subject} />
          ) : (
            <div className="border border-line bg-white px-4 py-6 text-sm text-muted space-y-2">
              <p>
                Full HTML wasn’t stored for this send (logged before we kept
                bodies). Preview text only:
              </p>
              <p className="text-ink-soft">{email.preview || "—"}</p>
              <Link
                href={`/admin/emails/templates/${email.templateId}`}
                className="text-sky-deep hover:underline inline-block"
              >
                View current template sample →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEmailSent;
