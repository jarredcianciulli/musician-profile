import { brand } from "./brand";

const email =
  process.env.REACT_APP_STUDIO_EMAIL || "hello@batterystringstudio.com";

export const contactInfo = {
  email,
  emailPersonal:
    process.env.REACT_APP_STUDIO_EMAIL_PERSONAL ||
    "jarred@batterystringstudio.com",
  phone: process.env.REACT_APP_STUDIO_PHONE || "(610) 340-8827",
  city: "Charleston",
  state: "SC",
  area: "Charleston",
  website: brand.website,
  websiteUrl: brand.websiteUrl,
  /** In-site booking modal — Google Appointments deprecated (Phase 2). */
  bookingLink: "#book",
  social: {
    facebook: process.env.REACT_APP_FACEBOOK_URL || "https://facebook.com",
    instagram: process.env.REACT_APP_INSTAGRAM_URL || "https://instagram.com",
  },
};
