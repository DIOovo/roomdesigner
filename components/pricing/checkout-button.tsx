"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/lib/analytics/events";
import { isPaymentsLive } from "@/lib/payments/availability";

export function CheckoutButton({ plan, children, featured = false }: { plan: "starter" | "pro" | "credits"; children: React.ReactNode; featured?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const paymentsLive = isPaymentsLive(process.env.NEXT_PUBLIC_PAYMENTS_LIVE);

  useEffect(() => {
    if (!paymentsLive) return;
    fetch("/api/entitlements", { cache: "no-store" }).then((response) => response.json()).then((data: { authenticated?: boolean }) => setAuthenticated(Boolean(data.authenticated))).catch(() => setAuthenticated(false));
  }, [paymentsLive]);

  useEffect(() => {
    if (!availabilityOpen) return;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])') ?? []).filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setAvailabilityOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [availabilityOpen]);

  function tryFree() {
    setAvailabilityOpen(false);
    const generator = document.getElementById("generator");
    if (generator) requestAnimationFrame(() => requestAnimationFrame(() => generator.scrollIntoView({ behavior: "smooth", block: "start" })));
    else router.push("/#generator");
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={loading}
        onClick={async () => {
          track("upgrade_clicked", { plan, authenticated: authenticated === true });
          if (!paymentsLive) {
            setAvailabilityOpen(true);
            return;
          }
          if (authenticated === false) {
            window.location.assign(`/signup?next=${encodeURIComponent("/#pricing")}`);
            return;
          }
          setLoading(true);
          track("checkout", { plan });
          const response = await fetch("/api/waffo/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productKey: plan }) });
          const data = (await response.json()) as { checkoutUrl?: string; error?: string };
          if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
          else if (response.status === 401) window.location.assign(`/login?next=${encodeURIComponent("/#pricing")}`);
          else { window.alert(data.error ?? "Checkout is not configured yet."); setLoading(false); }
        }}
        className={`focus-ring mt-7 w-full whitespace-nowrap rounded-lg px-4 py-3 text-sm font-black active:scale-[.98] disabled:cursor-wait disabled:opacity-60 ${featured ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_10px_24px_rgba(18,75,55,.18)] hover:bg-[var(--accent-strong)]" : "border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] hover:border-[var(--accent)]"}`}
      >
        {loading ? "Opening checkout..." : paymentsLive && authenticated === false ? "Get started" : children}
      </button>
      {availabilityOpen ? createPortal(
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/35 px-5 py-8 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setAvailabilityOpen(false); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-[460px] rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-7 text-[var(--ink)] shadow-[0_28px_80px_rgba(17,28,23,.24)] sm:p-9">
            <p className="text-sm font-semibold text-[var(--accent)]">RoomFacelift</p>
            <h2 id={titleId} className="mt-3 text-3xl leading-tight">Payments are opening soon</h2>
            <div id={descriptionId} className="mt-5 space-y-3 text-[15px] leading-7 text-[var(--muted)]">
              <p>We&apos;re finishing our payment setup. Starter, Pro, and Credit Pack purchases will be available shortly.</p>
              <p>You can continue using RoomFacelift&apos;s free preview in the meantime.</p>
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setAvailabilityOpen(false)} className="focus-ring min-h-11 rounded-lg border border-[var(--line)] px-5 text-sm font-semibold hover:border-[var(--muted)]">Close</button>
              <button type="button" onClick={tryFree} className="focus-ring min-h-11 rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--on-accent)] shadow-[0_8px_20px_rgba(18,75,55,.16)] hover:bg-[var(--accent-strong)]">Try free</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
