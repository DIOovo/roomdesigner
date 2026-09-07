import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GenerationHistory } from "@/components/account/generation-history";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getUserEntitlements } from "@/lib/entitlements/server";
import type { UserEntitlements } from "@/lib/entitlements/types";
import { getGenerationHistory } from "@/lib/generation/history";
import { getSupabaseServer } from "@/lib/supabase/server";
import { privatePageRobots } from "@/lib/seo";

export const metadata: Metadata = { title: "Your Account", description: "Manage RoomFacelift generations, credits, and plan entitlements.", robots: privatePageRobots };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!user) redirect("/login?next=%2Faccount");
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const [entitlement, history] = await Promise.all([
    getUserEntitlements(user.id),
    getGenerationHistory(user.id, requestedPage),
  ]);
  const facts = [
    ["Current plan", title(entitlement.plan)],
    ["Free previews", entitlement.freeCreditsRemaining],
    ["Subscription credits", entitlement.subscriptionCreditsRemaining],
    ["Credit-pack credits", entitlement.creditPackCreditsRemaining],
    ["Total available", entitlement.totalCreditsRemaining],
    ["Commercial license", entitlement.commercialLicense ? "Included" : "Not included"],
    ["Priority queue", entitlement.priorityQueue ? "Included" : "Standard queue"],
    ["Subscription status", entitlement.subscriptionStatus ?? "No active subscription"],
  ] as const;
  return (
    <main className="shell py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black text-[var(--accent)]">Account</p><h1 className="mt-2 text-5xl font-black tracking-[-0.05em]">Your RoomFacelift access.</h1><p className="mt-4 text-[var(--muted)]">Signed in as <strong className="text-[var(--ink)]">{user.email}</strong></p></div><SignOutButton /></div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{facts.map(([label, value]) => <div key={label} className="surface p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">{label}</p><p className="mt-3 text-xl font-black">{value}</p></div>)}</div>
        <section className="surface mt-6 flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">Current plan</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.04em]">{title(entitlement.plan)}</h2>
          </div>
          <ul className="grid max-w-xl flex-1 gap-2.5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
            {planCapabilities(entitlement).map((capability) => <li key={capability} className="flex items-start gap-2.5 text-sm font-semibold text-[var(--ink)]"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />{capability}</li>)}
          </ul>
        </section>
        <div className="surface mt-6 flex flex-wrap items-center justify-between gap-4 p-6"><div><h2 className="text-xl font-black">Ready for the next room?</h2><p className="mt-1 text-sm text-[var(--muted)]">Credits are reserved when a job starts and restored automatically if generation fails.</p></div><div className="flex gap-3"><Link href="/#generator" className="focus-ring rounded-xl bg-[var(--accent)] px-5 py-3 font-black text-[var(--on-accent)]">Create a video</Link>{entitlement.totalCreditsRemaining === 0 ? <Link href="/#pricing" className="focus-ring rounded-xl border border-[var(--line)] px-5 py-3 font-black">View plans</Link> : null}</div></div>
        <GenerationHistory history={history} />
      </div>
    </main>
  );
}

function title(value: string) { return value[0].toUpperCase() + value.slice(1); }

function planCapabilities(entitlement: UserEntitlements) {
  return [
    `${entitlement.totalCreditsRemaining} generation${entitlement.totalCreditsRemaining === 1 ? "" : "s"} left`,
    entitlement.resolution === "768p" ? "768p HD exports" : "480p exports",
    entitlement.watermarkRequired ? "Watermarked videos" : "No watermark",
    entitlement.commercialLicense ? "Commercial use" : "Personal use",
    entitlement.priorityQueue ? "Priority generation" : "Standard queue",
  ];
}
