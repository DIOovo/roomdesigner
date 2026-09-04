"use client";

import { WarningCircle } from "@phosphor-icons/react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell grid min-h-[70dvh] place-items-center py-16 text-center">
      <div>
        <WarningCircle size={42} weight="duotone" className="mx-auto text-[var(--accent)]" />
        <h1 className="mt-4 text-4xl font-black tracking-[-0.045em]">Something went wrong.</h1>
        <p className="mt-4 text-[var(--muted)]">The page could not finish loading. Your private content has not been made public.</p>
        <button type="button" onClick={reset} className="focus-ring mt-7 rounded-xl bg-[var(--accent)] px-5 py-3 font-black text-[var(--on-accent)]">Try again</button>
      </div>
    </main>
  );
}
