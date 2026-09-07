import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

const socialImage = "/og-image.png";

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteConfig.url}/`).toString();
}

export function publicPageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      siteName: siteConfig.name,
      title,
      description,
      url,
      images: [{ url: absoluteUrl(socialImage), width: 1200, height: 630, alt: "RoomFacelift AI room design before and after video" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(socialImage)],
    },
  };
}

export const privatePageRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};
