// Google Analytics Event Tracking Helper
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const trackEvent = (
  eventName: string,
  eventCategory: string,
  eventLabel?: string,
  value?: number
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, {
      event_category: eventCategory,
      event_label: eventLabel,
      value: value,
    });
  }
};

// Predefined events for easy tracking
export const analytics = {
  // Booking events
  bookingModalOpened: (location: string) => {
    trackEvent("booking_modal_opened", "Booking", location);
  },
  bookingCompleted: () => {
    trackEvent("booking_completed", "Booking", "Studio booking");
  },

  // Contact events
  contactFormSubmitted: () => {
    trackEvent("contact_form_submit", "Contact", "Main Contact Form");
  },
  expressInterestClicked: () => {
    trackEvent("express_interest_clicked", "Contact", "Group Classes Interest");
  },

  // Navigation events
  learnMoreClicked: (location: string) => {
    trackEvent("learn_more_clicked", "Navigation", location);
  },
  navLinkClicked: (section: string) => {
    trackEvent("nav_link_clicked", "Navigation", section);
  },

  // Social media clicks
  socialMediaClicked: (platform: string) => {
    trackEvent("social_media_clicked", "Engagement", platform);
  },
};




