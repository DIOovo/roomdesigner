"use client";

import { useState } from "react";

export function PaymentTestCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buyTestPack() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/waffo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKey: "test_credits" }),
      });
      const data = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error ?? "Checkout is temporarily unavailable.");
      window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Checkout is temporarily unavailable.");
      setLoading(false);
    }
  }

  return (
    <section className="surface mt-6 p-6" aria-labelledby="payment-test-title">
      <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">Payment Test</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="payment-test-title" className="text-xl font-black">Test Credit Pack</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">5 credits</p>
        </div>
        <button type="button" disabled={loading} onClick={buyTestPack} className="focus-ring min-h-11 rounded-xl bg-[var(--accent)] px-5 font-black text-[var(--on-accent)] disabled:cursor-wait disabled:opacity-60">
          {loading ? "Opening checkout..." : "Buy test pack"}
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </section>
  );
}
