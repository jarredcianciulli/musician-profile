"use client";

import React, { useCallback, useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import IntroSplash, { shouldPlayIntro } from "./brand/IntroSplash";
import { BookingProvider } from "@/context/BookingContext";
import "@/lib/scrollLock";

const INTRO_KEY = "bss_intro_seen_v2";

const BOOKING_QUERY_KEYS = [
  "book",
  "success",
  "canceled",
  "canceled_sub",
  "session_id",
  "bid",
];

function hasBookingIntent(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return BOOKING_QUERY_KEYS.some((key) => {
    const v = params.get(key);
    if (key === "book") return v === "1";
    return Boolean(v);
  });
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasBookingIntent()) {
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* ignore */
      }
      setShowIntro(false);
      setReady(true);
      return;
    }
    const play = shouldPlayIntro();
    setShowIntro(play);
    setReady(!play);
  }, []);

  const finishIntro = useCallback(() => {
    setShowIntro(false);
    setReady(true);
  }, []);

  return (
    <BookingProvider>
      <div className="App min-h-screen flex flex-col bg-paper">
        {showIntro && <IntroSplash onComplete={finishIntro} />}
        <div
          className={`flex flex-col min-h-screen flex-grow transition-opacity duration-500 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <Navbar visible={ready} />
          <main className="flex-grow">{children}</main>
          <Footer />
        </div>
      </div>
    </BookingProvider>
  );
}
