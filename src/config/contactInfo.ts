import { brand } from "./brand";

const email =
  process.env.REACT_APP_STUDIO_EMAIL || "jarred@batterystringstudio.com";

/**
 * Public location copy only — never put a street address here.
 * Full street is a Worker secret and returned only after an in-person booking.
 */
export const contactInfo = {
  email,
  emailPersonal:
    process.env.REACT_APP_STUDIO_EMAIL_PERSONAL ||
    "jarred@batterystringstudio.com",
  phone: process.env.REACT_APP_STUDIO_PHONE || "(610) 340-8827",
  city: "Charleston",
  state: "SC",
  area: "Charleston",
  /** Public neighborhood — safe to show on the site */
  neighborhood: "Bowan Village area",
  website: brand.website,
  websiteUrl: brand.websiteUrl,
  bookingLink: "#book",
  social: {
    facebook: process.env.REACT_APP_FACEBOOK_URL || "https://facebook.com",
    instagram: process.env.REACT_APP_INSTAGRAM_URL || "https://instagram.com",
  },
};
