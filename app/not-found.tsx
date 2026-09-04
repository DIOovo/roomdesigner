import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { privatePageRobots } from "@/lib/seo";

export const metadata: Metadata = { title: "Page Not Found", robots: privatePageRobots };

export default function NotFound() {
  return (
    <main className="shell grid min-h-[70dvh] place-items-center py-16 text-center">
      <div>
        <p className="text-sm font-black text-[var(--accent)]">404</p>
        <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] md:text-7xl">This room is not here.</h1>
        <p className="mx-auto mt-5 max-w-lg leading-7 text-[var(--muted)]">The page may have moved, or the private result link is unavailable.</p>
        <Link href="/#generator" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-black text-[var(--on-accent)]"><ArrowLeft size={18} weight="bold" /> Back to Room Designer</Link>
      </div>
    </main>
  );
}
