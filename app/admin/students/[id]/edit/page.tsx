import type { Metadata } from "next";
import AdminStudentEdit from "@/views/AdminStudentEdit";

export const metadata: Metadata = {
  title: "Edit student",
  robots: { index: false, follow: false },
};

export default function AdminStudentEditPage() {
  return <AdminStudentEdit />;
}
