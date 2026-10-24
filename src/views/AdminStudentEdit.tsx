"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import BowStringMark from "../components/brand/BowStringMark";
import { getAdminToken, loadStudio } from "../lib/studioApi";
import {
  clearStudentEditAccess,
  consumeStudentEditAccess,
} from "../lib/adminStudentEditGate";
import { updateStudentEnrollment } from "../lib/bookingApi";
import type { StudentEnrollment, StudioPayload } from "../types/studio";

const AdminStudentEdit: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [payload, setPayload] = useState<StudioPayload | null>(null);
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [format, setFormat] = useState<"in_person" | "online">("in_person");
  const [billingMode, setBillingMode] = useState<"auto" | "manual" | "unset">(
    "manual"
  );
  const [scheduleMonths, setScheduleMonths] = useState(12);
  const [durationMinutes, setDurationMinutes] = useState<30 | 45 | 60>(45);
  const [adminNotes, setAdminNotes] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [clearAmount, setClearAmount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/admin");
      return;
    }
    const ok = consumeStudentEditAccess(id);
    setAllowed(ok);
    if (!ok) return;
    loadStudio({ includePrivate: true })
      .then((data) => {
        setPayload(data);
        const enr = (data.enrollments || []).find((e) => e.id === id) || null;
        setEnrollment(enr);
        if (enr) {
          setName(enr.name || "");
          setEmail(enr.email || "");
          setFormat(enr.format === "online" ? "online" : "in_person");
          setBillingMode(
            enr.billingMode === "auto" || enr.billingMode === "manual"
              ? enr.billingMode
              : "unset"
          );
          setScheduleMonths(enr.scheduleMonths || 12);
          setDurationMinutes(
            enr.durationMinutes === 30 || enr.durationMinutes === 60
              ? enr.durationMinutes
              : 45
          );
          setAdminNotes(enr.adminNotes || "");
          setAmountDollars(
            typeof enr.amountDueCents === "number"
              ? String(
                  enr.amountDueCents % 100 === 0
                    ? enr.amountDueCents / 100
                    : (enr.amountDueCents / 100).toFixed(2)
                )
              : ""
          );
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load.")
      );
  }, [id, router]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token || !enrollment) return;
    setSaving(true);
    setError("");
    try {
      const patch: Parameters<typeof updateStudentEnrollment>[1] = {
        name: name.trim(),
        email: email.trim(),
        format,
        billingMode,
        scheduleMonths,
        durationMinutes,
        adminNotes,
      };
      if (clearAmount) {
        patch.clearAmountDue = true;
      } else if (amountDollars.trim() !== "") {
        patch.amountDollars = Number(amountDollars);
      }
      await updateStudentEnrollment(enrollment.id, patch, token);
      clearStudentEditAccess();
      router.push(`/admin/students/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaving(false);
    }
  };

  if (allowed === false) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="section-container py-16 max-w-md space-y-4">
          <h1 className="font-display text-3xl">Edit locked</h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            Open the student page and use the Edit button. Direct links to this
            URL are blocked.
          </p>
          <Link href={`/admin/students/${id}`} className="btn-primary inline-flex">
            Back to student
          </Link>
        </div>
      </div>
    );
  }

  if (allowed === null || !payload) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">
        Loading…
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="section-container py-16">
        <p className="text-sm text-muted mb-4">Student not found.</p>
        <Link href="/admin" className="btn-secondary text-sm">
          Back to admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="section-container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BowStringMark className="w-6 h-10 text-sky-deep" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                Edit student
              </p>
              <p className="font-display text-xl">{enrollment.name}</p>
            </div>
          </div>
          <Link
            href={`/admin/students/${id}`}
            className="btn-secondary text-xs"
            onClick={() => clearStudentEditAccess()}
          >
            Cancel
          </Link>
        </div>
      </header>

      <form
        onSubmit={onSave}
        className="section-container py-8 max-w-xl space-y-5"
      >
        {error ? (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wider text-muted">
            Name
          </span>
          <input
            className="admin-input mt-1 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wider text-muted">
            Email
          </span>
          <input
            type="email"
            className="admin-input mt-1 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-muted">
              Duration
            </span>
            <select
              className="admin-input mt-1 w-full"
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(Number(e.target.value) as 30 | 45 | 60)
              }
            >
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-muted">
              Format
            </span>
            <select
              className="admin-input mt-1 w-full"
              value={format}
              onChange={(e) =>
                setFormat(e.target.value as "in_person" | "online")
              }
            >
              <option value="in_person">In person</option>
              <option value="online">Online</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-muted">
              Billing
            </span>
            <select
              className="admin-input mt-1 w-full"
              value={billingMode}
              onChange={(e) =>
                setBillingMode(e.target.value as "auto" | "manual" | "unset")
              }
            >
              <option value="auto">Auto-charge</option>
              <option value="manual">Pay by link</option>
              <option value="unset">Unset</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-muted">
              Schedule months
            </span>
            <input
              type="number"
              min={1}
              max={24}
              className="admin-input mt-1 w-full"
              value={scheduleMonths}
              onChange={(e) => setScheduleMonths(Number(e.target.value) || 12)}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-muted">
              First-period amount ($)
            </span>
            <input
              className="admin-input mt-1 w-full"
              inputMode="decimal"
              value={amountDollars}
              onChange={(e) => {
                setAmountDollars(e.target.value);
                setClearAmount(false);
              }}
              disabled={clearAmount}
            />
          </label>
          <label className="flex items-center gap-2 mt-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={clearAmount}
              onChange={(e) => setClearAmount(e.target.checked)}
            />
            Reset to calculated proration
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wider text-muted">
            Custom info (private notes)
          </span>
          <textarea
            className="admin-input mt-1 w-full min-h-[120px]"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Preferences, family details, quoted rate notes…"
          />
        </label>

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/admin/students/${id}`}
            className="btn-secondary"
            onClick={() => clearStudentEditAccess()}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AdminStudentEdit;
