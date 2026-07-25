/**
 * Battery String Studio — sky brand lock.
 * Poster people see → same colors/voice on the site.
 * URLs come from CRA env (REACT_APP_*) so staging/prod can differ.
 */

const websiteUrl = (
  process.env.REACT_APP_WEBSITE_DOMAIN || "https://batterystringstudio.com"
).replace(/\/$/, "");

export const brand = {
  studioName: "Battery String Studio",
  instructorName: "Jarred Cianciulli",
  tagline: "Classical Violin & Viola",
  shortTagline: "Private instruction in Charleston, SC",
  website: websiteUrl.replace(/^https?:\/\//, ""),
  websiteUrl,
  labUrl: process.env.REACT_APP_LAB_URL || "https://lab.batterystringstudio.com",
  scalesUrl:
    process.env.REACT_APP_SCALES_URL || "https://scales.batterystringstudio.com",
};

/** Sky lock — black + #9DB7D4 */
export const palette = {
  ink: "#0A0A0A",
  inkSoft: "#1A1A1C",
  paper: "#F4F6F8",
  paperMuted: "#E8EEF4",
  sky: "#9DB7D4",
  skyDeep: "#7A9BBF",
  gold: "#9DB7D4", // alias for existing lockup props
  goldDeep: "#7A9BBF",
  accent: "#0A0A0A",
  accentHover: "#1A1A1C",
  line: "#C5D4E4",
  muted: "#5C6570",
} as const;
