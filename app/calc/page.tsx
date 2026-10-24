import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import TuitionCalc from "@/views/TuitionCalc";

export const metadata: Metadata = {
  title: "Tuition calculator — monthly rate & mid-month proration",
  description:
    "See how Battery String Studio monthly lesson rates work, and calculate a mid-month first-period total from your first lesson date.",
  robots: { index: true, follow: true },
};

export default function CalcPage() {
  return (
    <PublicShell>
      <article className="section-container pt-10 pb-16">
        <TuitionCalc />
      </article>
    </PublicShell>
  );
}
