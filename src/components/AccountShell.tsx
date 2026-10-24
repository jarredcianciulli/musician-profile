"use client";

import React from "react";
import Link from "next/link";
import BowStringMark from "./brand/BowStringMark";
import { marketingSiteUrl } from "@/lib/env";

/** Minimal chrome for the student portal — no marketing nav/footer. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const marketing = marketingSiteUrl();

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="section-container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <BowStringMark className="w-6 h-10 text-sky-deep shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                Student account
              </p>
              <p className="font-display text-lg leading-tight truncate">
                Battery String Studio
              </p>
            </div>
          </div>
          <a
            href={marketing}
            className="text-xs text-muted hover:text-ink underline underline-offset-2 shrink-0"
          >
            Studio website
          </a>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="border-t border-line py-6">
        <div className="section-container text-xs text-muted flex flex-wrap gap-x-4 gap-y-2 justify-between">
          <span>Questions? Reply to your invite email.</span>
          <Link href="/account" className="hover:text-ink">
            Account home
          </Link>
        </div>
      </footer>
    </div>
  );
}
