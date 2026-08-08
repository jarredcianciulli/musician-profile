import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";

const site = siteUrl();
const isStaging = /staging/i.test(site);

const ogImage = {
  url: "/brand/bss-nav-lockup.png",
  width: 1200,
  height: 630,
  alt: "Battery String Studio",
};

export function buildRootMetadata(): Metadata {
  return {
    metadataBase: new URL(site),
    title: {
      default: "Battery String Studio | Violin & Viola Lessons",
      template: "%s | Battery String Studio",
    },
    description:
      "Private violin and viola lessons in the Bowan Village / Charleston area. $35 trial lessons and weekly subscriptions with Jarred Cianciulli.",
    applicationName: "Battery String Studio",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: ["/favicon-32.png"],
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      title: "Battery String Studio",
      statusBarStyle: "default",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Battery String Studio",
      title: "Battery String Studio | Violin & Viola Lessons",
      description:
        "Private violin and viola lessons near Charleston. Book a $35 trial.",
      url: site,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: "Battery String Studio",
      description: "Violin & viola lessons — Bowan Village / Charleston area.",
      images: [ogImage.url],
    },
    robots: isStaging
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
