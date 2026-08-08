import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const entries: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/trial", priority: 0.9, changeFrequency: "monthly" },
    { path: "/violin-lessons-charleston", priority: 0.85, changeFrequency: "monthly" },
    { path: "/viola-lessons", priority: 0.85, changeFrequency: "monthly" },
    { path: "/lead", priority: 0.7, changeFrequency: "monthly" },
    { path: "/policy", priority: 0.5, changeFrequency: "yearly" },
  ];
  return entries.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
