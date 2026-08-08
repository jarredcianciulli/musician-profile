/**
 * Battery String Studio — sky brand lock.
 */

import { labUrl, methodUrl, siteUrl } from "@/lib/env";

const websiteUrl = siteUrl();

export const brand = {
  studioName: "Battery String Studio",
  instructorName: "Jarred Cianciulli",
  tagline: "Classical Violin & Viola",
  shortTagline: "Private instruction in Charleston, SC",
  website: websiteUrl.replace(/^https?:\/\//, ""),
  websiteUrl,
  labUrl: labUrl(),
  methodUrl: methodUrl(),
};

/** Sky lock — black + #9DB7D4 */
export const palette = {
  ink: "#0A0A0A",
  inkSoft: "#1A1A1C",
  paper: "#F4F6F8",
  paperMuted: "#E8EEF4",
  sky: "#9DB7D4",
  skyDeep: "#7A9BBF",
  gold: "#9DB7D4",
  goldDeep: "#7A9BBF",
  accent: "#0A0A0A",
  accentHover: "#1A1A1C",
  line: "#C5D4E4",
  muted: "#5C6570",
} as const;
