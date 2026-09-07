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
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)]/85 bg-[color:var(--bg)]/88 backdrop-blur-xl">
      <div className="shell flex h-[4.5rem] items-center justify-between gap-5">
        <Link href="/" className="focus-ring rounded-sm text-xl font-black tracking-[-0.025em]">
          RoomFacelift<span className="text-[var(--accent)]">.</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-semibold text-[var(--muted)] md:flex">
          <Link href="/#examples" className="focus-ring rounded-sm hover:text-[var(--ink)]">Examples</Link>
          <Link href="/#how-it-works" className="focus-ring rounded-sm hover:text-[var(--ink)]">How it works</Link>
          <Link href="/#pricing" className="focus-ring rounded-sm hover:text-[var(--ink)]">Pricing</Link>
          <Link href="/blog" className="focus-ring rounded-sm hover:text-[var(--ink)]">Guides</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? <><Link href="/my-designs" className="whitespace-nowrap text-sm font-bold text-[var(--muted)] focus-ring rounded-sm hover:text-[var(--ink)]">My designs</Link><Link href="/account" className="focus-ring hidden max-w-40 truncate rounded-sm text-sm font-bold text-[var(--muted)] sm:block">{user.email}</Link>{plan ? <PlanBadge plan={plan} /> : null}<SignOutButton /></> : <Link href="/login?next=%2F%23generator" className="focus-ring hidden rounded-sm text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)] sm:block">Sign in</Link>}
          <Link href="/#generator" className="focus-ring whitespace-nowrap rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--on-accent)] shadow-[0_8px_20px_rgba(18,75,55,.18)] hover:bg-[var(--accent-strong)] active:scale-[.98]">Create video</Link>
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
