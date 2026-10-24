"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import BowStringMark from "../components/brand/BowStringMark";
import { EmailHtmlFrame } from "../components/admin/EmailHtmlFrame";
import {
  emailTemplateById,
} from "../content/emailTemplates";
import { sampleHtmlForTemplate } from "../lib/emailSampleHtml";
import { getAdminToken } from "../lib/studioApi";

const AdminEmailTemplate: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const tmpl = emailTemplateById(id);

  useEffect(() => {
    if (!getAdminToken()) router.replace("/admin");
  }, [router]);

  if (!getAdminToken()) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">
        Redirecting…
      </div>
    );
  }

  if (!tmpl) {
    return (
      <div className="min-h-screen bg-paper text-ink section-container py-16">
        <p className="text-sm text-muted mb-4">Template not found.</p>
        <Link href="/admin" className="btn-secondary text-sm">
          Back to admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white sticky top-0 z-10">
        <div className="section-container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BowStringMark className="w-6 h-10 text-sky-deep shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                Email template
              </p>
              <p className="font-display text-xl truncate">{tmpl.name}</p>
            </div>
          </div>
          <Link href="/admin?tab=emails" className="btn-secondary text-xs">
            Back to Emails
          </Link>
        </div>
      </header>

      <div className="section-container py-8 max-w-3xl space-y-6">
        <div className="space-y-2 text-sm">
          <p className="text-xs font-mono text-muted">{tmpl.id}</p>
          <p>
            <span className="text-muted">Audience:</span> {tmpl.audience}
          </p>
          <p>
            <span className="text-muted">Subject:</span> {tmpl.subject}
          </p>
          <p className="text-ink-soft leading-relaxed">{tmpl.description}</p>
          <p className="text-xs text-muted">
            Sample preview with placeholder data — not a live send.
          </p>
        </div>
        <EmailHtmlFrame
          html={sampleHtmlForTemplate(tmpl.id)}
          title={tmpl.name}
        />
      </div>
    </div>
  );
};

export default AdminEmailTemplate;
