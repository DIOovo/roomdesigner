"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_DELAYS = [0, 1_000, 2_000, 4_000, 8_000] as const;

export function PaymentStatus({ initialCredits }: { initialCredits: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<"received" | "confirmed" | "processing">("received");

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    async function poll(index: number) {
      if (cancelled) return;
      try {
        const response = await fetch("/api/entitlements", { cache: "no-store" });
        const data = await response.json() as { totalCreditsRemaining?: number };
        if (response.ok && typeof data.totalCreditsRemaining === "number" && data.totalCreditsRemaining > initialCredits) {
          setStatus("confirmed");
          router.refresh();
          return;
        }
      } catch { /* A delayed webhook is not a failed payment. */ }
      if (index === POLL_DELAYS.length - 1) {
        setStatus("processing");
        return;
      }
      timers.push(setTimeout(() => void poll(index + 1), POLL_DELAYS[index + 1]));
    }
    void poll(0);
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [initialCredits, router]);

  return (
    <div className="surface mb-6 border-[var(--accent)]/30 p-5" role="status" aria-live="polite">
      <p className="font-black">{status === "confirmed" ? "Payment confirmed" : "Payment received"}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {status === "confirmed"
          ? "Your credits have been updated."
          : status === "processing"
            ? "Your payment may still be processing. Refresh this page shortly."
            : "We're confirming your purchase and updating your credits."}
      </p>
    </div>
  );
}
