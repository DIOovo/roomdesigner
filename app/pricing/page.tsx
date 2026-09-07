import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { publicPageMetadata } from "@/lib/seo";
export const metadata = publicPageMetadata({ title: "AI Room Design Video Pricing", description: "Compare RoomFacelift Free, Starter, Pro, and one-time credit options for AI room transformation videos.", path: "/pricing" });
const offers = [
  { name: "Free", price: "$0", text: "Two 5-second previews. The first works without login. Watermarked 480p exports." },
  { name: "Starter", price: "$9.99/month", text: "20 HD videos each month with no watermark. Personal use only." },
  { name: "Pro", price: "$24.99/month", text: "60 five-second HD videos with no watermark, commercial licensing, and priority queue access." },
  { name: "Credit Pack", price: "$19.99", text: "30 one-time video credits, valid for one year." },
];
export default function PricingPage() { return <main className="shell py-16 md:py-24"><h1 className="max-w-4xl text-5xl md:text-7xl">AI room design video pricing</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Start with a watermarked preview. Upgrade for HD, clean exports, priority processing, and commercial use.</p><div className="mt-12 grid gap-4 md:grid-cols-2">{offers.map((offer) => <article key={offer.name} className="surface p-7"><Check size={22} weight="bold" className="text-[var(--accent)]" /><h2 className="mt-5 text-2xl">{offer.name}</h2><p className="mt-2 text-3xl font-black tracking-[-0.025em]">{offer.price}</p><p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">{offer.text}</p></article>)}</div><Link href="/#generator" className="focus-ring mt-8 inline-block rounded-lg bg-[var(--accent)] px-5 py-3 font-black text-[var(--on-accent)] shadow-[0_10px_24px_rgba(18,75,55,.18)] hover:bg-[var(--accent-strong)]">Choose a plan</Link></main>; }
