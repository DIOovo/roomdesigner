import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/about", "/contact", "/privacy", "/terms", "/refund", "/pricing", "/blog"];
  const siteUpdated = new Date("2026-09-07T00:00:00Z");
  return [
    ...staticRoutes.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: siteUpdated, changeFrequency: path === "" ? "weekly" as const : "monthly" as const, priority: path === "" ? 1 : 0.6 })),
    ...posts.map((post) => ({ url: `${siteConfig.url}/blog/${post.slug}`, lastModified: new Date(post.date), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
