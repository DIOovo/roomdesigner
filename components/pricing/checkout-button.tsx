"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/events";

export function CheckoutButton({ plan, children, featured = false }: { plan: "starter" | "pro" | "credits"; children: React.ReactNode; featured?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const checkoutEnabled = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true";
  useEffect(() => { fetch("/api/entitlements", { cache: "no-store" }).then((response) => response.json()).then((data: { authenticated?: boolean }) => setAuthenticated(Boolean(data.authenticated))).catch(() => setAuthenticated(false)); }, []);
  return (
    <button
      type="button"
      disabled={loading || !checkoutEnabled}
      onClick={async () => {
        track("upgrade_clicked", { plan, authenticated: authenticated === true });
        if (authenticated === false) {
          window.location.assign(`/signup?next=${encodeURIComponent("/#pricing")}`);
          return;
        }
        setLoading(true);
        track("checkout", { plan });
        const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
        const data = (await response.json()) as { url?: string; error?: string };
        if (data.url) window.location.assign(data.url);
        else if (response.status === 401) window.location.assign(`/login?next=${encodeURIComponent("/#pricing")}`);
        else { window.alert(data.error ?? "Checkout is not configured yet."); setLoading(false); }
      }}
      className={`focus-ring mt-7 w-full whitespace-nowrap rounded-xl px-4 py-3 text-sm font-black transition-transform active:scale-[.98] disabled:opacity-60 ${featured ? "bg-[var(--accent)] text-[var(--on-accent)]" : "border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]"}`}
    >
      {!checkoutEnabled ? "Checkout coming soon" : loading ? "Opening checkout..." : authenticated === false ? "Get started" : children}
    </button>
  );
}
