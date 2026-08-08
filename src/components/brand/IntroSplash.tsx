"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import BowStringMark from "./BowStringMark";
import { brand } from "../../config/brand";
import { contactInfo } from "../../config/contactInfo";

type Props = {
  onComplete: () => void;
};

const INTRO_KEY = "bss_intro_seen_v2";

/**
 * Poster intro using exact v3 viola-frame artwork (sky recolor),
 * then fades into the site.
 */
const IntroSplash: React.FC<Props> = ({ onComplete }) => {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"playing" | "exit" | "done">("playing");

  useEffect(() => {
    if (reduceMotion) {
      onComplete();
      setPhase("done");
      return;
    }

    const t1 = window.setTimeout(() => setPhase("exit"), 2800);
    const t2 = window.setTimeout(() => {
      sessionStorage.setItem(INTRO_KEY, "1");
      setPhase("done");
      onComplete();
    }, 3600);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onComplete, reduceMotion]);

  if (phase === "done") return null;

  return (
    <AnimatePresence>
      <motion.div
        className="bss-intro fixed inset-0 z-[100] flex items-center justify-center bg-ink"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "exit" ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden={phase === "exit"}
      >
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(INTRO_KEY, "1");
            setPhase("done");
            onComplete();
          }}
          className="absolute top-5 right-5 z-10 text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white/90"
        >
          Skip
        </button>

        <div className="relative w-full max-w-md mx-auto px-6 aspect-[2/3] max-h-[92vh] overflow-hidden">
          {/* Exact v3 frame geometry, sky-colored */}
          <motion.img
            src="/brand/bss-intro-sky-base.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Soft vignette so overlays read cleanly */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/25 via-transparent to-transparent" />

          {/* Contact — top right (matches poster) */}
          <motion.div
            className="absolute top-6 right-6 text-right text-white"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <p className="text-[10px] sm:text-[11px] tracking-[0.14em] uppercase font-medium">
              Violin &amp; Viola Lessons
            </p>
            <p className="text-[10px] tracking-[0.1em] uppercase text-white/80 mt-1">
              Charleston, SC
            </p>
            <p className="text-[10px] tracking-[0.06em] uppercase text-white/80 mt-2">
              {contactInfo.website}
            </p>
            <p className="text-[10px] text-white/70 mt-0.5">{contactInfo.email}</p>
          </motion.div>

          {/* Watermark — mark only + stacked type (once) */}
          <motion.div
            className="absolute top-6 left-6 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.5 }}
          >
            <BowStringMark className="w-7 h-12 text-white" />
            <div className="mt-1 text-[9px] tracking-[0.18em] font-display font-semibold leading-snug">
              <div>BATTERY</div>
              <div>STRING</div>
              <div className="tracking-[0.28em] font-sans font-medium mt-0.5 opacity-90">
                STUDIO
              </div>
            </div>
          </motion.div>

          <span className="sr-only">
            {brand.studioName}. Violin and viola lessons in Charleston, SC.
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export function shouldPlayIntro(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return sessionStorage.getItem(INTRO_KEY) !== "1";
}

export default IntroSplash;
