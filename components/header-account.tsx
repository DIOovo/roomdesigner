"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { RoomFaceliftPlan, UserEntitlements } from "@/lib/entitlements/types";
import { readApiResponse } from "@/lib/http/client-response";

type HeaderAccountState = {
  email: string | null;
  plan: RoomFaceliftPlan | null;
};

export function HeaderAccount() {
  const [account, setAccount] = useState<HeaderAccountState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => readApiResponse<{ email: string | null }>(response, "Sign-in status could not be loaded."))
      .then(async (me) => {
        if (cancelled) return;
        if (!me.email) {
          setAccount({ email: null, plan: null });
          return;
        }
        try {
          const entitlements = await readApiResponse<UserEntitlements>(await fetch("/api/entitlements", { cache: "no-store" }), "Account could not be loaded.");
          if (!cancelled) setAccount({ email: me.email, plan: entitlements.plan });
        } catch {
          if (!cancelled) setAccount({ email: me.email, plan: null });
        }
      })
      .catch(() => {
        if (!cancelled) setAccount({ email: null, plan: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!account?.email) {
    return <Link href="/login?next=%2F%23generator" className="focus-ring hidden rounded-sm text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)] sm:block">Sign in</Link>;
  }

  return (
    <>
      <Link href="/my-designs" className="whitespace-nowrap text-sm font-bold text-[var(--muted)] focus-ring rounded-sm hover:text-[var(--ink)]">My designs</Link>
      <Link href="/account" className="focus-ring hidden max-w-40 truncate rounded-sm text-sm font-bold text-[var(--muted)] sm:block">{account.email}</Link>
      {account.plan ? <PlanBadge plan={account.plan} /> : null}
      <SignOutButton />
    </>
  );
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