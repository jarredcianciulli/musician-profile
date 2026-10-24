import type { Metadata } from "next";
import AdminEmailTemplate from "@/views/AdminEmailTemplate";

export const metadata: Metadata = {
  title: "Email template",
  robots: { index: false, follow: false },
};

export default function AdminEmailTemplatePage() {
  return <AdminEmailTemplate />;
}
