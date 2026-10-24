"use client";

import { useCallback, useRef, useState } from "react";
import type { AdminConfirmAction, AdminConfirmVars } from "../lib/adminConfirmCopy";
import { getAdminConfirmCopy } from "../lib/adminConfirmCopy";

type Pending = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
};

/** Promise-based confirm for admin actions. */
export function useConfirmModal() {
  const [pending, setPending] = useState<Pending | null>(null);
  const busyRef = useRef(false);

  const confirm = useCallback(
    (
      actionOrOpts:
        | AdminConfirmAction
        | {
            title: string;
            body: string;
            confirmLabel?: string;
            danger?: boolean;
          },
      vars?: AdminConfirmVars
    ) => {
      const copy =
        typeof actionOrOpts === "string"
          ? getAdminConfirmCopy(actionOrOpts, vars)
          : {
              title: actionOrOpts.title,
              body: actionOrOpts.body,
              confirmLabel: actionOrOpts.confirmLabel || "Confirm",
              danger: actionOrOpts.danger,
            };

      return new Promise<boolean>((resolve) => {
        setPending({
          title: copy.title,
          body: copy.body,
          confirmLabel: copy.confirmLabel,
          danger: copy.danger,
          resolve,
        });
      });
    },
    []
  );

  const onConfirm = useCallback(() => {
    if (!pending || busyRef.current) return;
    pending.resolve(true);
    setPending(null);
  }, [pending]);

  const onCancel = useCallback(() => {
    if (!pending || busyRef.current) return;
    pending.resolve(false);
    setPending(null);
  }, [pending]);

  return {
    confirm,
    confirmProps: pending
      ? {
          open: true as const,
          title: pending.title,
          body: pending.body,
          confirmLabel: pending.confirmLabel,
          danger: pending.danger,
          onConfirm,
          onCancel,
        }
      : { open: false as const, title: "", body: "", onConfirm, onCancel },
  };
}
