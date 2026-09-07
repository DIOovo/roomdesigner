import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getUserEntitlements } from "@/lib/entitlements/server";
import type { RoomFaceliftPlan } from "@/lib/entitlements/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function SiteHeader() {
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  const plan = user ? await resolvePlan(user.id) : null;
  return (
    <header className="border-b border-[var(--line)] bg-[color:var(--bg)]/90 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Link href="/" className="focus-ring text-xl font-black tracking-[-0.04em]">
          RoomFacelift<span className="text-[var(--accent)]">.</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-semibold text-[var(--muted)] md:flex">
          <Link href="/#examples" className="hover:text-[var(--ink)]">Examples</Link>
          <Link href="/#how-it-works" className="hover:text-[var(--ink)]">How it works</Link>
          <Link href="/#pricing" className="hover:text-[var(--ink)]">Pricing</Link>
          <Link href="/blog" className="hover:text-[var(--ink)]">Guides</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? <><Link href="/my-designs" className="whitespace-nowrap text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">My designs</Link><Link href="/account" className="hidden max-w-40 truncate text-sm font-bold text-[var(--muted)] sm:block">{user.email}</Link>{plan ? <PlanBadge plan={plan} /> : null}<SignOutButton /></> : <Link href="/login?next=%2F%23generator" className="text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">Sign in</Link>}
          <Link href="/#generator" className="focus-ring whitespace-nowrap rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--on-accent)] transition-transform active:scale-[.98]">Create video</Link>
        </div>
      </div>
    </header>
  );
}

async function resolvePlan(userId: string): Promise<RoomFaceliftPlan | null> {
  try {
    return (await getUserEntitlements(userId)).plan;
  } catch {
    return null;
  }
}

function PlanBadge({ plan }: { plan: RoomFaceliftPlan }) {
  const label = plan === "free" ? "Free" : plan === "starter" ? "Starter" : "Pro";
  const className = plan === "pro"
    ? "bg-[var(--accent)] text-[var(--on-accent)]"
    : plan === "starter"
      ? "border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]"
      : "border border-[var(--line)] text-[var(--muted)]";
  return <span className={`hidden shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-black tracking-wide sm:inline-flex ${className}`}>{label}</span>;
}
