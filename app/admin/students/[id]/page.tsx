import type { Metadata } from "next";
import AdminStudentDetail from "@/views/AdminStudentDetail";

export const metadata: Metadata = {
  title: "Student",
  robots: { index: false, follow: false },
};

export default function AdminStudentPage() {
  return <AdminStudentDetail />;
}
