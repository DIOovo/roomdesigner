"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { track } from "@/lib/analytics/events";

export function DownloadLink({ href, watermarked, compact = false }: { href: string; watermarked: boolean; compact?: boolean }) {
  return <a href={href} download onClick={() => track("download", { watermarked })} className={`focus-ring flex items-center gap-2 rounded-xl bg-[var(--accent)] font-black text-[var(--on-accent)] ${compact ? "px-4 py-2.5 text-sm" : "px-5 py-3"}`}><DownloadSimple size={18} weight="bold" /> {compact ? "Download again" : `Download ${watermarked ? "protected" : "clean"} video`}</a>;
}
