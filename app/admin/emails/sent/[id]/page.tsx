import type { Metadata } from "next";
import AdminEmailSent from "@/views/AdminEmailSent";

export const metadata: Metadata = {
  title: "Sent email",
  robots: { index: false, follow: false },
};

export default function AdminEmailSentPage() {
  return <AdminEmailSent />;
}
