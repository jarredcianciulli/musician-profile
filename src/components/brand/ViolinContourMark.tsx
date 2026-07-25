import React from "react";

type Props = {
  className?: string;
  title?: string;
  /** Locked Bold default (~4). Override only for tiny favicon use. */
  strokeWidth?: number;
};

/**
 * Bold closed-contour violin mark (no f-hole).
 * The frame/outline IS the logo — weight locked to Bold.
 */
const ViolinContourMark: React.FC<Props> = ({
  className = "w-10 h-10",
  title = "Battery String Studio",
  strokeWidth = 4,
}) => {
  return (
    <svg
      className={className}
      viewBox="0 0 64 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        d="M32 8c4.2 0 7.2 2.6 7.2 6.2 0 3.4-2.4 5.4-5.4 6.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="32"
        cy="12.5"
        r="2.4"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.65}
      />
      <path
        d="M32 20.5v21"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M32 41.5
           c10.5 0 18.5 5.8 18.5 15
           0 6.6-4.3 10.4-9.8 12.4
           7 2.9 11.8 9 11.8 16.6
           0 12.8-9.5 21-20.5 21
           s-20.5-8.2-20.5-21
           c0-7.6 4.8-13.7 11.8-16.6
           C17.8 66.9 13.5 63.1 13.5 56.5
           c0-9.2 8-15 18.5-15z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ViolinContourMark;
