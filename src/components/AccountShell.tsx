"use client";

import React from "react";
import BowStringMark from "./brand/BowStringMark";

/** Minimal chrome for the student portal — no marketing nav. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="section-container py-3 flex items-center gap-2.5">
          <BowStringMark className="w-6 h-10 text-sky-deep shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Student account
            </p>
            <p className="font-account text-lg leading-tight truncate font-semibold tracking-tight">
              Battery String Studio
            </p>
          </div>
        </div>
      </header>
      <main className="flex-grow [&_.font-display]:font-account">
        {children}
      </main>
      <footer className="border-t border-line py-6">
        <div className="section-container text-xs text-muted">
          Questions? Use Menu → Contact, or reply to your invite email.
        </div>
      </footer>
    </div>
  );
}
