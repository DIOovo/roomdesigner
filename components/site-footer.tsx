import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[color:var(--surface-2)]/45 py-12 md:py-14">
      <div className="shell grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link href="/" className="text-xl font-black tracking-[-0.04em]">RoomFacelift.</Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Turn one room photo into a smooth AI before and after design video.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="flex max-w-2xl flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[var(--muted)] md:justify-end">
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/refund">Refund Policy</Link>
          <Link href="/acceptable-use">Acceptable Use Policy</Link>
        </nav>
      </div>
    </footer>
  );
}
