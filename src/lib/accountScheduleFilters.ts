/** Client-side schedule filtering for the student account portal. */

export type ScheduleKindFilter = "all" | "lessons" | "closed";

export type ScheduleFilterRow = {
  type: string;
  start: string;
  end?: string;
  title?: string;
};

const TZ = "America/New_York";

/** YYYY-MM-DD in America/New_York for a row start ISO. */
export function rowLocalDateKey(iso: string, timeZone = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function isStudioClosedType(type: string): boolean {
  return type === "holiday" || type === "break";
}

export function filterSchedule<T extends ScheduleFilterRow>(
  rows: T[],
  options: {
    kind?: ScheduleKindFilter;
    from?: string;
    to?: string;
  }
): T[] {
  const kind = options.kind || "all";
  const from = options.from || "";
  const to = options.to || "";

  return (rows || []).filter((row) => {
    if (!row?.start) return false;
    const key = rowLocalDateKey(row.start);

    if (from && key < from) return false;
    if (to && key > to) return false;

    if (kind === "lessons" && row.type !== "lesson") return false;
    if (kind === "closed" && !isStudioClosedType(row.type)) return false;

    return true;
  });
}

/** Default from/to spanning the loaded schedule (local dates). */
export function scheduleDateBounds(
  rows: ScheduleFilterRow[]
): { from: string; to: string } {
  if (!rows.length) {
    const today = rowLocalDateKey(new Date().toISOString());
    return { from: today, to: today };
  }
  const keys = rows.map((r) => rowLocalDateKey(r.start)).sort();
  return { from: keys[0], to: keys[keys.length - 1] };
}

export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number
): { pageRows: T[]; total: number; page: number; pageCount: number } {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    pageRows: rows.slice(start, start + pageSize),
    total,
    page: safePage,
    pageCount,
  };
}

export const SCHEDULE_PAGE_SIZE = 10;
