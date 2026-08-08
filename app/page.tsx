import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import HomePage from "@/views/Home";
import { HomeJsonLd } from "@/components/seo/HomeJsonLd";

export const metadata: Metadata = {
  title: "Violin & Viola Lessons in Charleston",
  description:
    "Battery String Studio — private violin and viola lessons near Bowan Village / Charleston. Book a $35 trial or reserve a weekly lesson slot.",
  openGraph: {
    title: "Battery String Studio | Violin & Viola Lessons",
    description:
      "Private lessons near Charleston. $35 trial · weekly subscriptions.",
  },
};

export default function Page() {
  return (
    <PublicShell>
      <HomeJsonLd />
      <HomePage />
    </PublicShell>
  );
}
