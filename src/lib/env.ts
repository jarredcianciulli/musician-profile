/** Public env — baked at build time (NEXT_PUBLIC_*). */

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WEBSITE_DOMAIN ||
    process.env.WEBSITE_DOMAIN ||
    "https://batterystringstudio.com"
  ).replace(/\/$/, "");
}

/** Marketing / public site (may differ from account portal host). */
export function marketingSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MARKETING_DOMAIN ||
    siteUrl()
  ).replace(/\/$/, "");
}

/**
 * Student portal base URL.
 * Prefer NEXT_PUBLIC_ACCOUNT_DOMAIN (e.g. https://account.batterystringstudio.com).
 * Falls back to /account on the marketing site until DNS is live.
 */
export function accountPortalUrl(): string {
  const dedicated = (
    process.env.NEXT_PUBLIC_ACCOUNT_DOMAIN || ""
  ).replace(/\/$/, "");
  if (dedicated) return dedicated;
  return `${siteUrl()}/account`;
}

export function isAccountHost(hostname: string): boolean {
  const h = (hostname || "").toLowerCase().split(":")[0];
  return h.startsWith("account.") || h.startsWith("account-staging.");
}

export function studioApiBase(): string {
  return (process.env.NEXT_PUBLIC_STUDIO_API || "").replace(/\/$/, "");
}

export function contactEndpoint(): string {
  return (
    process.env.NEXT_PUBLIC_CONTACT_ENDPOINT ||
    "https://api.jarredcianciulli.com/contact"
  );
}

export function studioEmail(): string {
  return (
    process.env.NEXT_PUBLIC_STUDIO_EMAIL || "jarred@batterystringstudio.com"
  );
}

export function labUrl(): string {
  return process.env.NEXT_PUBLIC_LAB_URL || "https://lab.batterystringstudio.com";
}

export function methodUrl(): string {
  return (
    process.env.NEXT_PUBLIC_METHOD_URL || "https://method.batterystringstudio.com"
  );
}
