import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { HeaderAccount } from "@/components/header-account";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)]/85 bg-[color:var(--bg)]/88 backdrop-blur-xl">
      <div className="shell flex h-[4.5rem] items-center justify-between gap-5">
        <Link href="/" aria-label="RoomFacelift home" className="focus-ring group shrink-0 rounded-[10px]">
          <BrandLogo />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-semibold text-[var(--muted)] md:flex">
          <Link href="/#examples" className="focus-ring rounded-sm hover:text-[var(--ink)]">Examples</Link>
          <Link href="/#how-it-works" className="focus-ring rounded-sm hover:text-[var(--ink)]">How it works</Link>
          <Link href="/#pricing" className="focus-ring rounded-sm hover:text-[var(--ink)]">Pricing</Link>
          <Link href="/blog" className="focus-ring rounded-sm hover:text-[var(--ink)]">Guides</Link>
        </nav>
        <div className="flex items-center gap-3">
          <HeaderAccount />
          <Link href="/#generator" className="focus-ring whitespace-nowrap rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--on-accent)] shadow-[0_8px_20px_rgba(18,75,55,.18)] hover:bg-[var(--accent-strong)] active:scale-[.98]">Create video</Link>
        </div>
      </div>
    </header>
  );
}