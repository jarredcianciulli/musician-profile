"use client";

import React from "react";
import { useStudioPolicy } from "@/hooks/useStudioPolicy";

type Props = {
  /** Compact scroll box (forms) vs full article sections */
  variant?: "scroll" | "article";
  className?: string;
  showTitle?: boolean;
};

/** Renders the current KV-backed studio policy (falls back to seed). */
export default function StudioPolicyBody({
  variant = "article",
  className = "",
  showTitle = true,
}: Props) {
  const { policy, effectiveLabel, loading } = useStudioPolicy();

  if (variant === "scroll") {
    return (
      <div className={className}>
        {showTitle ? (
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h3 className="font-display text-xl text-ink">{policy.title}</h3>
          </div>
        ) : null}
        {effectiveLabel ? (
          <p className="text-xs text-muted mb-2">
            {loading ? "Loading policy…" : effectiveLabel}
          </p>
        ) : null}
        <div className="max-h-48 overflow-y-auto border border-line bg-paper px-3 py-3 space-y-3 text-sm text-ink-soft">
          {policy.sections.map((s) => (
            <div key={s.heading}>
              <p className="font-semibold text-ink">{s.heading}</p>
              <p className="mt-1 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showTitle ? (
        <h1 className="font-display text-4xl text-ink mt-2 mb-2">
          {policy.title}
        </h1>
      ) : null}
      {effectiveLabel ? (
        <p className="text-sm text-muted mb-8">
          {loading ? "Loading…" : effectiveLabel}
        </p>
      ) : (
        <div className="mb-8" />
      )}
      <div className="space-y-8">
        {policy.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-2xl text-ink mb-2">{s.heading}</h2>
            <p className="text-ink-soft leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
