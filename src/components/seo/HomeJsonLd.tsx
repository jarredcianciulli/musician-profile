import { contactInfo } from "@/config/contactInfo";
import { brand } from "@/config/brand";
import {
  PUBLIC_TRIAL_MINUTES,
  PUBLIC_TRIAL_PRICE,
  SUBSCRIPTION_MONTHLY_RATES,
} from "@/lib/bookingPolicy";
import { siteUrl } from "@/lib/env";

/** JSON-LD for local / voice-style discovery (MusicSchool + FAQ + Offer). */
export function HomeJsonLd() {
  const base = siteUrl();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["MusicSchool", "LocalBusiness"],
        "@id": `${base}/#school`,
        name: brand.studioName,
        description:
          "Private violin and viola lessons in the Bowan Village / Charleston area with Jarred Cianciulli. $35 trial lessons and weekly subscriptions.",
        url: base,
        telephone: contactInfo.phone,
        email: contactInfo.email,
        image: `${base}/brand/bss-nav-lockup.png`,
        areaServed: [
          { "@type": "City", name: "Charleston", containedInPlace: "South Carolina" },
          { "@type": "Place", name: "Bowan Village" },
        ],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Charleston",
          addressRegion: "SC",
          addressCountry: "US",
        },
        sameAs: [
          contactInfo.social.facebook,
          contactInfo.social.instagram,
        ].filter(
          (u) =>
            u &&
            !u.endsWith("facebook.com") &&
            !u.endsWith("instagram.com")
        ),
        employee: {
          "@type": "Person",
          name: "Jarred Cianciulli",
          jobTitle: "Violin and viola instructor",
        },
        makesOffer: [
          {
            "@type": "Offer",
            name: "Trial lesson",
            price: String(PUBLIC_TRIAL_PRICE),
            priceCurrency: "USD",
            description: `${PUBLIC_TRIAL_MINUTES}-minute violin or viola trial`,
            url: `${base}/trial`,
          },
          {
            "@type": "Offer",
            name: "Weekly 30-minute lessons",
            price: String(SUBSCRIPTION_MONTHLY_RATES[30]),
            priceCurrency: "USD",
            description: "Monthly subscription for weekly 30-minute lessons",
          },
          {
            "@type": "Offer",
            name: "Weekly 45-minute lessons",
            price: String(SUBSCRIPTION_MONTHLY_RATES[45]),
            priceCurrency: "USD",
            description: "Monthly subscription for weekly 45-minute lessons",
          },
          {
            "@type": "Offer",
            name: "Weekly 60-minute lessons",
            price: String(SUBSCRIPTION_MONTHLY_RATES[60]),
            priceCurrency: "USD",
            description: "Monthly subscription for weekly 60-minute lessons",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${base}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "How much is a trial violin lesson?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `A trial lesson at Battery String Studio is $${PUBLIC_TRIAL_PRICE} for ${PUBLIC_TRIAL_MINUTES} minutes. Book online at ${base}/trial.`,
            },
          },
          {
            "@type": "Question",
            name: "Do you offer violin lessons near me in Charleston?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Battery String Studio offers private violin and viola lessons in the Bowan Village area of Charleston, South Carolina, plus online video lessons.",
            },
          },
          {
            "@type": "Question",
            name: "When are weekly lessons scheduled?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Weekly lesson times are typically Monday evening and Saturday morning. You reserve one recurring slot when you subscribe.",
            },
          },
          {
            "@type": "Question",
            name: "Can I take lessons online or in person?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Choose in-person at the home studio in the Bowan Village area or online video lessons at the same rates.",
            },
          },
          {
            "@type": "Question",
            name: "How does mid-month subscription billing work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "If you start mid-month, you pay for the remaining Monday or Saturday lessons in the current month at a flat per-lesson rate, then the regular monthly rate starting the first of the next month.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
