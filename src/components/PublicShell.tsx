"use client";

import React, { useCallback, useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import IntroSplash, { shouldPlayIntro } from "./brand/IntroSplash";
import { BookingProvider } from "@/context/BookingContext";
import "@/lib/scrollLock";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
