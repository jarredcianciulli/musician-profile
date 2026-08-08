import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { studioApiBase } from "@/lib/env";

type Props = { params: Promise<{ code: string }> };

async function hitFlyer(code: string) {
  const base = studioApiBase();
  if (!base) {
    return { ok: true as const, code, label: code };
  }
  const res = await fetch(`${base}/studio/flyers/hit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const };
  const data = (await res.json().catch(() => ({}))) as {
    flyer?: { code: string; label: string };
  };
  return {
    ok: true as const,
    code,
    label: data.flyer?.label || code,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: raw } = await params;
  const code = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const label = code.replace(/[-_]/g, " ");
  return {
    title: `Lesson offer — ${label}`,
    description:
      "Battery String Studio campaign link — private violin and viola lessons in Charleston. Continues to the $35 trial booking page.",
    robots: { index: false, follow: true },
  };
}

export default async function FlyerRedirectPage({ params }: Props) {
  const { code: raw } = await params;
  const code = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!code) notFound();

  const result = await hitFlyer(code);
  if (!result.ok) notFound();

  redirect(`/trial?f=${encodeURIComponent(code)}`);
}
