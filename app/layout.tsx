import type { Metadata } from "next";
import "../src/index.css";
import { buildRootMetadata } from "@/lib/siteMetadata";

export const metadata: Metadata = buildRootMetadata();

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
