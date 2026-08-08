import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Reserve a weekly lesson",
  description:
    "Reserve your weekly violin or viola lesson slot and start a monthly subscription at Battery String Studio.",
};

/** Legacy /subscribe → home pricing section (Stripe cancel used to land here). */
export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const params = await searchParams;
  if (params.canceled === "1") {
    redirect("/?canceled_sub=1#lessons");
  }
  redirect("/#lessons");
}
