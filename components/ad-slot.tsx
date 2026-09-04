"use client";

import { useEffect, useState } from "react";
import { CONSENT_EVENT, CONSENT_KEY, type ConsentChoice } from "@/lib/analytics/consent";

export function AdSlot({ label = "Advertisement" }: { label?: string }) {
  const [consent, setConsent] = useState<ConsentChoice>("unknown");
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    setConsent(stored === "accepted" || stored === "essential" ? stored : "unknown");
    const update = (event: Event) => setConsent((event as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, update);
    return () => window.removeEventListener(CONSENT_EVENT, update);
  }, []);
  if (process.env.NODE_ENV !== "production" && !clientId) {
    return <aside aria-label={label} className="my-10 grid min-h-28 place-items-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--muted)]">Ad placeholder</aside>;
  }
  if (!clientId || consent !== "accepted") return null;
  return <aside aria-label={label} data-adsense-client={clientId} className="my-10 min-h-28 w-full overflow-hidden" />;
}
