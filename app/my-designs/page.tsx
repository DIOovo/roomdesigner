import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowClockwise, ArrowRight, Clock, FilmStrip, ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { DownloadLink } from "@/components/result/download-link";
import { getGenerationHistory, type GenerationHistory } from "@/lib/generation/history";
import { getSupabaseServer } from "@/lib/supabase/server";
import { privatePageRobots } from "@/lib/seo";

export const metadata: Metadata = { title: "My designs", description: "Your saved RoomFacelift transformations.", robots: privatePageRobots };

export default async function MyDesignsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!user) redirect("/login?next=%2Fmy-designs");
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const history = await getGenerationHistory(user.id, requestedPage);
  return (
    <main className="shell py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[var(--accent)]">My designs</p>
            <h1 className="mt-2 text-5xl font-black tracking-[-0.05em]">Your saved transformations.</h1>
            <p className="mt-4 max-w-xl text-[var(--muted)]">Every room you have generated, in one place. Viewing or downloading an existing result never uses another credit.</p>
          </div>
          <Link href="/#generator" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-black text-[var(--on-accent)]">Create new <ArrowRight size={16} weight="bold" /></Link>
        </div>

        {history.unavailable ? (
          <div className="surface mt-8 p-6"><p className="font-black">Unable to load your designs.</p><p className="mt-2 text-sm text-[var(--muted)]">Your account and saved results are unaffected. Please refresh and try again.</p></div>
        ) : history.items.length === 0 ? (
          <div className="surface mt-8 grid min-h-64 place-items-center p-8 text-center"><div><FilmStrip size={34} weight="duotone" className="mx-auto text-[var(--accent)]" /><p className="mt-4 text-xl font-black">No designs yet.</p><p className="mt-2 text-sm text-[var(--muted)]">Your completed and in-progress room transformations will appear here.</p><Link href="/#generator" className="focus-ring mt-6 inline-flex rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-[var(--on-accent)]">Create your first room design</Link></div></div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.items.map((item) => <DesignCard key={item.id} item={item} />)}
          </div>
        )}

        {!history.unavailable && (history.page > 1 || history.hasMore) ? (
          <nav aria-label="My designs pagination" className="mt-8 flex items-center justify-between gap-3">
            {history.page > 1 ? <Link href={`/my-designs?page=${history.page - 1}`} className="focus-ring rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black">Previous</Link> : <span />}
            <span className="text-sm font-bold text-[var(--muted)]">Page {history.page}</span>
            {history.hasMore ? <Link href={`/my-designs?page=${history.page + 1}`} className="focus-ring rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black">Next</Link> : <span />}
          </nav>
        ) : null}
      </div>
    </main>
  );
}

function DesignCard({ item }: { item: GenerationHistory["items"][number] }) {
  const completed = item.status === "completed";
  return (
    <article className="surface overflow-hidden">
      <div className="relative aspect-[16/9] bg-[var(--surface-2)]">
        {item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt={`${item.style} ${item.roomType} design`} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" /> : <div className="grid h-full place-items-center text-center text-sm font-bold text-[var(--muted)]"><div><ImageSquare size={28} className="mx-auto mb-2" />Preview unavailable</div></div>}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-black ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
        {designScopeLabel(item.designScope) ? <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-black text-white">{designScopeLabel(item.designScope)}</span> : null}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-black">{item.style} · {item.roomType}</h3>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5"><Clock size={14} />{formatDate(item.createdAt)}</span>
          <span>{item.resolution.toUpperCase()}</span>
          <span>{planLabel(item.plan, item.creditSource)}</span>
        </div>
        {completed ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/result/${item.id}`} className="focus-ring rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black">View result</Link>
            <DownloadLink href={`/api/generations/${item.id}/download`} watermarked={item.isWatermarked} compact />
            <Link href={`/?reuse=${item.id}#generator`} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--accent)] px-4 py-2.5 text-sm font-black text-[var(--accent)]"><ArrowClockwise size={16} weight="bold" />Use again</Link>
          </div>
        ) : item.status === "processing" || item.status === "queued" ? (
          <p className="mt-5 text-sm font-semibold text-[var(--muted)]">{statusLabel(item.status)}</p>
        ) : (
          <p className="mt-5 text-sm font-semibold text-[var(--muted)]">This generation did not produce a downloadable result.</p>
        )}
      </div>
    </article>
  );
}

function statusLabel(status: GenerationHistory["items"][number]["status"]) {
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return status === "queued" ? "Queued" : "Processing";
}

function statusClass(status: GenerationHistory["items"][number]["status"]) {
  if (status === "completed") return "bg-[var(--accent)] text-[var(--on-accent)]";
  if (status === "failed") return "bg-red-700 text-white";
  return "bg-amber-300 text-amber-950";
}

function designScopeLabel(scope: string | null) {
  if (scope === "reimagine-space") return "Reimagined";
  if (scope === "keep-layout") return "Keep layout";
  return null;
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