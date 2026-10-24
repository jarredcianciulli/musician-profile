/** Allowlisted landing params preserved through Stripe success/cancel URLs. */
export const RETURN_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "f",
  "flyer",
] as const;

const VALUE_RE = /^[a-zA-Z0-9._%-]{1,80}$/;

export type ReturnQuery = Partial<
  Record<(typeof RETURN_QUERY_KEYS)[number], string>
>;

export function collectReturnQuery(
  search: string | URLSearchParams | null | undefined
): ReturnQuery {
  const params =
    typeof search === "string"
      ? new URLSearchParams(
          search.startsWith("?") ? search.slice(1) : search
        )
      : search instanceof URLSearchParams
        ? search
        : new URLSearchParams();

  const out: ReturnQuery = {};
  for (const key of RETURN_QUERY_KEYS) {
    const raw = (params.get(key) || "").trim();
    if (!raw || !VALUE_RE.test(raw)) continue;
    out[key] = raw;
  }
  return out;
}
