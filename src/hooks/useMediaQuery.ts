"use client";

import { useEffect, useState } from "react";

/** Client matchMedia with sync initial value (CRA CSR). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Tailwind `md` — desktop booking modal vs mobile full-screen. */
export function useIsDesktopBooking(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
