import type { Metadata } from "next";
import Admin from "@/views/Admin";

export const metadata: Metadata = {
  title: "Studio admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <Admin />;
}
