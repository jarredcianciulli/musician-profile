import { seedStudio } from "../data/seedStudio";
import {
  AvailabilityConfig,
  HolidayWeek,
  StudioEvent,
  StudioPayload,
} from "../types/studio";
import { normalizeStudioPayload } from "./normalizeStudio";

const LOCAL_KEY = "bss_studio_payload_v2";
const TOKEN_KEY = "bss_admin_token";

const apiBase = (process.env.REACT_APP_STUDIO_API || "").replace(/\/$/, "");

function cloneSeed(): StudioPayload {
  return structuredClone(seedStudio);
}

function readLocal(): StudioPayload {
  try {
    const raw =
      localStorage.getItem(LOCAL_KEY) ||
      localStorage.getItem("bss_studio_payload_v1");
    if (!raw) return cloneSeed();
    return normalizeStudioPayload(JSON.parse(raw) as StudioPayload);
  } catch {
    return cloneSeed();
  }
}

function writeLocal(payload: StudioPayload) {
  localStorage.setItem(
    LOCAL_KEY,
    JSON.stringify({ ...payload, updatedAt: new Date().toISOString() })
  );
}

export function getAdminToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setAdminToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function fetchRemote(includePrivate = false): Promise<StudioPayload | null> {
  if (!apiBase) return null;
  try {
    const token = getAdminToken();
    const useAdmin = includePrivate && Boolean(token);
    const res = await fetch(`${apiBase}/studio${useAdmin ? "/admin" : ""}`, {
      headers: useAdmin ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return null;
    return normalizeStudioPayload((await res.json()) as StudioPayload);
  } catch {
    return null;
  }
}

async function saveRemote(payload: StudioPayload): Promise<boolean> {
  if (!apiBase) return false;
  const token = getAdminToken();
  const res = await fetch(`${apiBase}/studio`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function loadStudio(options?: {
  includePrivate?: boolean;
}): Promise<StudioPayload> {
  const remote = await fetchRemote(Boolean(options?.includePrivate));
  if (remote) return remote;
  return readLocal();
}

export async function saveStudio(payload: StudioPayload): Promise<StudioPayload> {
  const next = normalizeStudioPayload({
    ...payload,
    updatedAt: new Date().toISOString(),
  });
  const savedRemote = await saveRemote(next);
  if (!savedRemote) {
    writeLocal(next);
  }
  return next;
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  if (!apiBase) {
    if (!token.trim()) return false;
    setAdminToken(token.trim());
    return true;
  }
  const res = await fetch(`${apiBase}/studio/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return false;
  setAdminToken(token.trim());
  return true;
}

export function upsertHoliday(
  payload: StudioPayload,
  holiday: HolidayWeek
): StudioPayload {
  const idx = payload.holidays.findIndex((h) => h.id === holiday.id);
  const holidays = [...payload.holidays];
  if (idx >= 0) holidays[idx] = holiday;
  else holidays.push(holiday);
  holidays.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { ...payload, holidays };
}

export function removeHoliday(
  payload: StudioPayload,
  id: string
): StudioPayload {
  return {
    ...payload,
    holidays: payload.holidays.filter((h) => h.id !== id),
  };
}

export function upsertEvent(
  payload: StudioPayload,
  event: StudioEvent
): StudioPayload {
  const idx = payload.events.findIndex((e) => e.id === event.id);
  const events = [...payload.events];
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { ...payload, events };
}

export function removeEvent(payload: StudioPayload, id: string): StudioPayload {
  return {
    ...payload,
    events: payload.events.filter((e) => e.id !== id),
  };
}

export function updateAvailability(
  payload: StudioPayload,
  availability: AvailabilityConfig
): StudioPayload {
  return { ...payload, availability };
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function isUsingRemoteApi() {
  return Boolean(apiBase);
}
