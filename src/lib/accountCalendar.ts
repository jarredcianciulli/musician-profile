/** Build a multi-event .ics for lesson schedule (Apple + Google import). */

export type CalendarLesson = {
  start: string;
  end: string;
  title?: string;
};

function icsDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcs(text: string): string {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildLessonsIcs(
  lessons: CalendarLesson[],
  options?: { name?: string; calendarName?: string }
): string {
  const calName = options?.calendarName || "Battery String Studio lessons";
  const stamp = icsDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Battery String Studio//Account//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calName)}`,
  ];

  lessons.forEach((lesson, i) => {
    const title =
      lesson.title ||
      (options?.name
        ? `Lesson — ${options.name}`
        : "Violin / viola lesson");
    const uid = `bss-lesson-${icsDate(lesson.start)}-${i}@batterystringstudio.com`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(lesson.start)}`,
      `DTEND:${icsDate(lesson.end)}`,
      `SUMMARY:${escapeIcs(title)}`,
      "DESCRIPTION:Battery String Studio weekly lesson",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, icsBody: string) {
  const blob = new Blob([icsBody], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Google Calendar “create event” for the next single lesson (quick add). */
export function googleCalendarUrlForLesson(lesson: CalendarLesson, title: string): string {
  const start = icsDate(lesson.start).replace(/Z$/, "");
  const end = icsDate(lesson.end).replace(/Z$/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: "Battery String Studio weekly lesson",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
