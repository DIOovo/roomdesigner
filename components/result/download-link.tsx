"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { track } from "@/lib/analytics/events";

export function DownloadLink({ href, watermarked }: { href: string; watermarked: boolean }) {
  return <a href={href} download onClick={() => track("download", { watermarked })} className="focus-ring flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-black text-[var(--on-accent)]"><DownloadSimple size={18} weight="bold" /> Download {watermarked ? "protected" : "clean"} video</a>;
}
