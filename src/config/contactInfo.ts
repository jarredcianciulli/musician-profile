import { brand } from "./brand";
import { studioEmail } from "@/lib/env";

const email = studioEmail();

/**
 * Public location copy only — never put a street address here.
 * Full street is a Worker secret and returned only after an in-person booking.
 */
export const contactInfo = {
  email,
  emailPersonal:
    process.env.NEXT_PUBLIC_STUDIO_EMAIL_PERSONAL ||
    "jarred@batterystringstudio.com",
  phone: process.env.NEXT_PUBLIC_STUDIO_PHONE || "(610) 340-8827",
  city: "Charleston",
  state: "SC",
  area: "Charleston",
  /** Public neighborhood — safe to show on the site */
  neighborhood: "Bowan Village area",
  website: brand.website,
  websiteUrl: brand.websiteUrl,
  bookingLink: "#book",
  social: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com",
  },
};
