import type { Metadata } from "next";
import "../src/index.css";

const siteUrl =
  process.env.WEBSITE_DOMAIN ||
  process.env.NEXT_PUBLIC_WEBSITE_DOMAIN ||
  "https://batterystringstudio.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Battery String Studio | Violin & Viola Lessons",
    template: "%s | Battery String Studio",
  },
  description:
    "Private violin and viola lessons in the Bowan Village / Charleston area. $35 trial lessons and weekly subscriptions with Jarred Cianciulli.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Battery String Studio",
    title: "Battery String Studio | Violin & Viola Lessons",
    description:
      "Private violin and viola lessons near Charleston. Book a $35 trial.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Battery String Studio",
    description: "Violin & viola lessons — Bowan Village / Charleston area.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
