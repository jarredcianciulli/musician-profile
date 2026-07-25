import React from "react";
import { brand } from "../../config/brand";
import BowStringMark from "./BowStringMark";

type Props = {
  variant?: "horizontal" | "stacked";
  tone?: "light" | "dark";
  showTagline?: boolean;
  showInstructor?: boolean;
  className?: string;
  markClassName?: string;
};

/**
 * Official lockup: bow-on-string mark + wordmark.
 */
const LogoLockup: React.FC<Props> = ({
  variant = "horizontal",
  tone = "light",
  showTagline = false,
  showInstructor = false,
  className = "",
  markClassName,
}) => {
  const ink = tone === "light" ? "text-ink" : "text-paper";
  const accent = tone === "light" ? "text-sky-deep" : "text-sky";
  const muted = tone === "light" ? "text-muted" : "text-paper/55";
  const rule = tone === "light" ? "bg-sky-deep" : "bg-sky";

  const mark =
    markClassName ||
    (variant === "stacked" ? `w-8 h-14 ${accent}` : `w-6 h-11 ${accent}`);

  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <BowStringMark className={mark} />
        <div className="mt-3.5">
          <p
            className={`font-display font-semibold tracking-[-0.02em] uppercase ${ink} text-2xl leading-none`}
          >
            Battery String
          </p>
          <div className={`mx-auto mt-2.5 mb-2 h-px w-[72%] ${rule}`} />
          <p
            className={`font-sans text-[0.7rem] font-medium uppercase tracking-[0.35em] ${accent}`}
          >
            Studio
          </p>
          {showTagline && (
            <p className={`mt-2 text-xs ${muted}`}>{brand.tagline}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BowStringMark className={`${mark} shrink-0`} />
      <div className="min-w-0 leading-none">
        <p
          className={`font-display font-semibold tracking-[-0.02em] uppercase ${ink} text-lg sm:text-xl truncate`}
        >
          Battery String
        </p>
        <div className={`mt-1.5 mb-1.5 h-px w-full max-w-[9.5rem] ${rule}`} />
        <p
          className={`font-sans text-[0.65rem] font-medium uppercase tracking-[0.35em] ${accent}`}
        >
          Studio
        </p>
        {showInstructor && (
          <p className={`mt-1.5 text-[11px] tracking-wide ${muted} truncate`}>
            {brand.instructorName}
          </p>
        )}
        {showTagline && (
          <p className={`mt-1 text-[11px] ${muted}`}>{brand.tagline}</p>
        )}
      </div>
    </div>
  );
};

export default LogoLockup;
