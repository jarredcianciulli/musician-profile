/** Allowlisted landing params preserved through Stripe success/cancel URLs. */
const RETURN_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "f",
  "flyer",
];

const VALUE_RE = /^[a-zA-Z0-9._%-]{1,80}$/;

/**
 * Sanitize client-supplied return query object.
 * @param {unknown} input
 * @returns {Record<string, string>}
 */
export function sanitizeReturnQuery(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const key of RETURN_QUERY_KEYS) {
    const raw = String(input[key] ?? "").trim();
    if (!raw || !VALUE_RE.test(raw)) continue;
    out[key] = raw;
  }
  return out;
}

/**
 * Merge allowlisted query into a URL that may include ?query and #hash.
 * @param {string} url
 * @param {Record<string, string>} returnQuery
 */
export function appendReturnQuery(url, returnQuery) {
  const keys = Object.keys(returnQuery || {});
  if (!keys.length) return url;

  const hashIdx = url.indexOf("#");
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : "";

  const qIdx = base.indexOf("?");
  const path = qIdx >= 0 ? base.slice(0, qIdx) : base;
  const existing = qIdx >= 0 ? base.slice(qIdx + 1) : "";
  const sp = new URLSearchParams(existing);
  for (const key of RETURN_QUERY_KEYS) {
    if (returnQuery[key]) sp.set(key, returnQuery[key]);
  }
  const qs = sp.toString();
  return `${path}${qs ? `?${qs}` : ""}${hash}`;
}
