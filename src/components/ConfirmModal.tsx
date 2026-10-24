"use client";

import React, { useEffect } from "react";
import { lockBodyScroll, unlockBodyScroll } from "../lib/scrollLock";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Emphasize destructive actions */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Shared admin “are you sure?” dialog. */
export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="bg-white border border-line w-full max-w-md p-5 sm:p-6 space-y-4 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-modal-title"
          className="font-display text-2xl leading-tight"
        >
          {title}
        </h2>
        <div className="text-sm text-ink/90 leading-relaxed space-y-2">
          {body}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className={
              danger
                ? "btn-primary text-sm bg-accent border-accent hover:opacity-90"
                : "btn-primary text-sm"
            }
            disabled={busy}
            onClick={onConfirm}
            autoFocus
          >
            {busy ? "Working…" : confirmLabel}
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
