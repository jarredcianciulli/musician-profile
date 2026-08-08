import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import Lessons from "@/components/Lessons";

export const metadata: Metadata = {
  title: "Reserve a weekly lesson",
  description:
    "Reserve your weekly violin or viola lesson slot and start a monthly subscription at Battery String Studio.",
};

export default function SubscribePage() {
  return (
    <PublicShell>
      <div className="pt-8">
        <Lessons />
      </div>
    </PublicShell>
  );
}
