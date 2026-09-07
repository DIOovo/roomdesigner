import Image from "next/image";
import Link from "next/link";
import { ArrowClockwise, ArrowRight, Clock, FilmStrip, ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { DownloadLink } from "@/components/result/download-link";
import type { GenerationHistory as HistoryData } from "@/lib/generation/history";

export function GenerationHistory({ history }: { history: HistoryData }) {
  return (
    <section className="mt-14" aria-labelledby="generation-history-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black text-[var(--accent)]">Saved work</p>
          <h2 id="generation-history-title" className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">My Generations</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Your latest transformations. Viewing or downloading an existing result never uses another credit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/my-designs" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black">View all designs <ArrowRight size={16} weight="bold" /></Link>
          <Link href="/#generator" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-black text-[var(--on-accent)]">Create new <ArrowRight size={16} weight="bold" /></Link>
        </div>
      </div>

      {history.unavailable ? (
        <div className="surface mt-6 p-6"><p className="font-black">Unable to load generation history.</p><p className="mt-2 text-sm text-[var(--muted)]">Your account and saved results are unaffected. Please refresh and try again.</p></div>
      ) : history.items.length === 0 ? (
        <div className="surface mt-6 grid min-h-52 place-items-center p-8 text-center"><div><FilmStrip size={30} weight="duotone" className="mx-auto text-[var(--accent)]" /><p className="mt-4 text-lg font-black">No saved generations yet.</p><p className="mt-2 text-sm text-[var(--muted)]">Your completed and in-progress room transformations will appear here.</p></div></div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {history.items.map((item) => <GenerationCard key={item.id} item={item} />)}
        </div>
      )}

      {!history.unavailable && (history.page > 1 || history.hasMore) ? (
        <nav aria-label="Generation history pagination" className="mt-6 flex items-center justify-between gap-3">
          {history.page > 1 ? <Link href={`/account?page=${history.page - 1}#generation-history-title`} className="focus-ring rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black">Previous</Link> : <span />}
          <span className="text-sm font-bold text-[var(--muted)]">Page {history.page}</span>
          {history.hasMore ? <Link href={`/account?page=${history.page + 1}#generation-history-title`} className="focus-ring rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black">Next</Link> : <span />}
        </nav>
      ) : null}
    </section>
  );
}

function GenerationCard({ item }: { item: HistoryData["items"][number] }) {
  const completed = item.status === "completed";
  return (
    <article className="surface overflow-hidden">
      <div className="relative aspect-[16/9] bg-[var(--surface-2)]">
        {item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt={`Original ${item.roomType} for ${item.style} generation`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" /> : <div className="grid h-full place-items-center text-center text-sm font-bold text-[var(--muted)]"><div><ImageSquare size={28} className="mx-auto mb-2" />Preview unavailable</div></div>}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-black ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-black">{item.style} · {item.roomType}</h3>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5"><Clock size={14} />{formatDate(item.createdAt)}</span>
          <span>{item.resolution.toUpperCase()}</span>
          <span>{planLabel(item.plan, item.creditSource)}</span>
        </div>
        {completed ? (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/result/${item.id}`} className="focus-ring rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black">View result</Link>
              <DownloadLink href={`/api/generations/${item.id}/download`} watermarked={item.isWatermarked} compact />
              <Link href={`/?reuse=${item.id}#generator`} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--accent)] px-4 py-2.5 text-sm font-black text-[var(--accent)]"><ArrowClockwise size={16} weight="bold" />Use settings for new version</Link>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">A new version starts only after you confirm in the Generator and uses the normal credit flow.</p>
          </>
        ) : item.status === "processing" || item.status === "queued" ? (
          <div className="mt-5"><Link href="/account#generation-history-title" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black"><ArrowClockwise size={16} weight="bold" />Refresh status</Link></div>
        ) : <p className="mt-5 text-sm font-semibold text-[var(--muted)]">This generation did not produce a downloadable result.</p>}
      </div>
    </article>
  );
}

function statusLabel(status: HistoryData["items"][number]["status"]) {
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return status === "queued" ? "Queued" : "Processing";
}

function statusClass(status: HistoryData["items"][number]["status"]) {
  if (status === "completed") return "bg-[var(--accent)] text-[var(--on-accent)]";
  if (status === "failed") return "bg-red-700 text-white";
  return "bg-amber-300 text-amber-950";
}

function planLabel(plan: string, creditSource: string | null) {
  if (plan === "starter") return "Starter";
  if (plan === "pro") return "Pro";
  if (creditSource === "credit_pack") return "Credit pack";
  return "Free";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
