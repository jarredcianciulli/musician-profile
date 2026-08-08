/** Public env — baked at build time (NEXT_PUBLIC_*). */

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WEBSITE_DOMAIN ||
    process.env.WEBSITE_DOMAIN ||
    "https://batterystringstudio.com"
  ).replace(/\/$/, "");
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
