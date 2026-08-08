// Funnel analytics — prefer Cloudflare Zaraz, fall back to gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    zaraz?: {
      track?: (eventName: string, properties?: Record<string, unknown>) => void;
    };
  }
}

function dualTrack(
  eventName: string,
  properties: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;

  try {
    if (window.zaraz?.track) {
      window.zaraz.track(eventName, properties);
      return;
    }
  } catch {
    /* fall through */
  }

  if (window.gtag) {
    window.gtag("event", eventName, {
      event_category: String(properties.category || "Funnel"),
      event_label: properties.label,
      value: properties.value,
      ...properties,
    });
  }
}

export const trackEvent = (
  eventName: string,
  eventCategory: string,
  eventLabel?: string,
  value?: number
) => {
  dualTrack(eventName, {
    category: eventCategory,
    label: eventLabel,
    value,
  });
};

export const analytics = {
  bookingModalOpened: (location: string) => {
    trackEvent("booking_modal_opened", "Booking", location);
  },
  bookingCompleted: () => {
    trackEvent("booking_completed", "Booking", "Studio booking");
  },

  contactFormSubmitted: () => {
    trackEvent("contact_form_submit", "Contact", "Main Contact Form");
  },
  expressInterestClicked: () => {
    trackEvent("express_interest_clicked", "Contact", "Group Classes Interest");
  },

  learnMoreClicked: (location: string) => {
    trackEvent("learn_more_clicked", "Navigation", location);
  },
  navLinkClicked: (section: string) => {
    trackEvent("nav_link_clicked", "Navigation", section);
  },

  socialMediaClicked: (platform: string) => {
    trackEvent("social_media_clicked", "Engagement", platform);
  },

  subscribeOpened: () => dualTrack("subscribe_opened", { category: "Subscribe" }),
  subscribeStep: (step: number | string) =>
    dualTrack("subscribe_step", { category: "Subscribe", step }),
  subscribeCheckoutStart: (duration?: number) =>
    dualTrack("subscribe_checkout_start", {
      category: "Subscribe",
      duration,
    }),
  subscribeCancel: () =>
    dualTrack("subscribe_cancel", { category: "Subscribe" }),
  subscribeComplete: () =>
    dualTrack("subscribe_complete", { category: "Subscribe" }),

  trialOpened: () => dualTrack("trial_opened", { category: "Trial" }),
  trialStep: (step: number | string) =>
    dualTrack("trial_step", { category: "Trial", step }),
  trialCheckoutStart: () =>
    dualTrack("trial_checkout_start", { category: "Trial" }),
  trialCancel: () => dualTrack("trial_cancel", { category: "Trial" }),
  trialComplete: () => dualTrack("trial_complete", { category: "Trial" }),

  leadFormSubmit: (flyer?: string) =>
    dualTrack("lead_form_submit", {
      category: "Lead",
      flyer: flyer || undefined,
    }),
};
