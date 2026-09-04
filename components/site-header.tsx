import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function SiteHeader() {
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  return (
    <header className="border-b border-[var(--line)] bg-[color:var(--bg)]/90 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Link href="/" className="focus-ring text-xl font-black tracking-[-0.04em]">
          Roomorphic<span className="text-[var(--accent)]">.</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-semibold text-[var(--muted)] md:flex">
          <Link href="/#examples" className="hover:text-[var(--ink)]">Examples</Link>
          <Link href="/#how-it-works" className="hover:text-[var(--ink)]">How it works</Link>
          <Link href="/#pricing" className="hover:text-[var(--ink)]">Pricing</Link>
          <Link href="/blog" className="hover:text-[var(--ink)]">Guides</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? <><Link href="/account" className="hidden max-w-40 truncate text-sm font-bold text-[var(--muted)] sm:block">{user.email}</Link><SignOutButton /></> : <Link href="/login?next=%2F%23generator" className="text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">Sign in</Link>}
          <Link href="/#generator" className="focus-ring whitespace-nowrap rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--on-accent)] transition-transform active:scale-[.98]">Create video</Link>
        </div>
      </div>
    </header>
  );
}
