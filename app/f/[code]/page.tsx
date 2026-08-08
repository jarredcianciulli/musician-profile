import { redirect, notFound } from "next/navigation";
import { studioApiBase } from "@/lib/env";

type Props = { params: Promise<{ code: string }> };

async function hitFlyer(code: string) {
  const base = studioApiBase();
  if (!base) {
    return { ok: true as const, code };
  }
  const res = await fetch(`${base}/studio/flyers/hit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const };
  return { ok: true as const, code };
}

export default async function FlyerRedirectPage({ params }: Props) {
  const { code: raw } = await params;
  const code = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!code) notFound();

  const result = await hitFlyer(code);
  if (!result.ok) notFound();

  redirect(`/trial?f=${encodeURIComponent(code)}`);
}
