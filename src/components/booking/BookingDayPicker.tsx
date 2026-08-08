"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

type Props = {
  selectedDay: string;
  availableDayKeys: Set<string>;
  dayLabels: { key: string; label: string }[];
  onSelectDay: (key: string) => void;
};

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Compact day trigger + DayPicker popover (only available lesson days). */
const BookingDayPicker: React.FC<Props> = ({
  selectedDay,
  availableDayKeys,
  dayLabels,
  onSelectDay,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedDate = useMemo(() => {
    if (!selectedDay) return undefined;
    return parseDayKey(selectedDay);
  }, [selectedDay]);

  const label =
    dayLabels.find((d) => d.key === selectedDay)?.label || "Choose a day";

  const disabledMatcher = (date: Date) => !availableDayKeys.has(toDayKey(date));

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const bounds = useMemo(() => {
    const keys = Array.from(availableDayKeys).sort();
    if (!keys.length) {
      return { start: undefined as Date | undefined, end: undefined as Date | undefined };
    }
    return {
      start: parseDayKey(keys[0]),
      end: parseDayKey(keys[keys.length - 1]),
    };
  }, [availableDayKeys]);

  return (
    <div ref={rootRef} className="relative">
      <span className="text-muted uppercase tracking-wider text-[11px] font-semibold">
        Day
      </span>
      <button
        type="button"
        className="mt-1.5 w-full flex items-center justify-between gap-3 border border-line bg-white px-3 py-3 text-left text-ink text-base focus:outline-none focus:border-sky-deep"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <svg
          className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          role="dialog"
          aria-label="Choose a day"
          className="bss-daypicker absolute left-0 right-0 z-20 mt-2 border border-line bg-paper shadow-lg p-3"
        >
          <DayPicker
            mode="single"
            animate
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              const key = toDayKey(date);
              if (!availableDayKeys.has(key)) return;
              onSelectDay(key);
              setOpen(false);
            }}
            disabled={disabledMatcher}
            startMonth={bounds.start}
            endMonth={bounds.end}
            defaultMonth={selectedDate || bounds.start}
          />
        </div>
      ) : null}
    </div>
  );
};

export default BookingDayPicker;
