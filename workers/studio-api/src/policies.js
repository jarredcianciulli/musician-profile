/**
 * Studio policy versions stored on the studio payload.
 * expiresAt null = currently in force. If several are null, the newest startDate wins.
 */

import { STUDIO_POLICY_SEED } from "./policySeed.js";

export function defaultPolicies() {
  return [
    {
      id: "policy-2026-10-01",
      title: STUDIO_POLICY_SEED.title,
      startDate: "2026-10-01",
      expiresAt: null,
      sections: STUDIO_POLICY_SEED.sections,
      createdAt: "2026-10-01T00:00:00.000Z",
    },
  ];
}

export function normalizePolicies(list) {
  if (!Array.isArray(list) || !list.length) return defaultPolicies();
  return list
    .filter((p) => p && p.id && Array.isArray(p.sections))
    .map((p) => ({
      id: String(p.id),
      title: String(p.title || STUDIO_POLICY_SEED.title),
      startDate: String(p.startDate || "").slice(0, 10),
      expiresAt: p.expiresAt ? String(p.expiresAt).slice(0, 10) : null,
      sections: p.sections
        .filter((s) => s && s.heading && s.body)
        .map((s) => ({
          heading: String(s.heading),
          body: String(s.body),
        })),
      createdAt: p.createdAt || undefined,
    }))
    .filter((p) => p.startDate && p.sections.length);
}

/**
 * Active policy: expiresAt is null/empty; among those, newest startDate.
 * Fallback: in-window versions (started, not yet expired).
 */
export function selectCurrentPolicy(policies) {
  const list = normalizePolicies(policies);
  const open = list.filter((p) => !p.expiresAt);
  if (open.length) {
    return [...open].sort((a, b) =>
      b.startDate.localeCompare(a.startDate)
    )[0];
  }
  const today = new Date().toISOString().slice(0, 10);
  const inWindow = list.filter(
    (p) =>
      p.startDate <= today && (!p.expiresAt || p.expiresAt > today)
  );
  if (inWindow.length) {
    return [...inWindow].sort((a, b) =>
      b.startDate.localeCompare(a.startDate)
    )[0];
  }
  return list.sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;
}

/** Public shape for GET /studio/policy */
export function publicCurrentPolicy(policies) {
  const current = selectCurrentPolicy(policies);
  if (!current) return null;
  return {
    id: current.id,
    title: current.title,
    startDate: current.startDate,
    expiresAt: current.expiresAt,
    sections: current.sections,
  };
}
