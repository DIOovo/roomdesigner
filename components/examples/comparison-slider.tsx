"use client";

import Image from "next/image";
import { useRef } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";

export function ComparisonSlider({ before, after, label }: { before: string; after: string; label: string }) {
  const frame = useRef<HTMLDivElement>(null);
  return (
    <div ref={frame} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--surface-2)] [--reveal:52%]">
      <Image src={before} alt={`${label} before AI room design`} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
      <div className="absolute inset-0 overflow-hidden [clip-path:inset(0_calc(100%-var(--reveal))_0_0)]">
        <Image src={after} alt={`${label} after AI room design`} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-[var(--reveal)] w-px -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.15)]">
        <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#15201b] shadow-lg"><ArrowsLeftRight size={19} weight="bold" /></span>
      </div>
      <span className="absolute left-3 top-3 rounded-lg bg-[rgba(10,18,14,.72)] px-2.5 py-1.5 text-xs font-bold text-white">After</span>
      <span className="absolute right-3 top-3 rounded-lg bg-[rgba(10,18,14,.72)] px-2.5 py-1.5 text-xs font-bold text-white">Before</span>
      <input
        type="range"
        min="8"
        max="92"
        defaultValue="52"
        aria-label={`Compare before and after for ${label}`}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        onInput={(event) => frame.current?.style.setProperty("--reveal", `${event.currentTarget.value}%`)}
      />
    </div>
  );
}
