import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { publicPageMetadata } from "@/lib/seo";
export const metadata = publicPageMetadata({ title: "AI Room Design Video Pricing", description: "Compare Roomorphic Free, Starter, Pro, and one-time credit options for AI room transformation videos.", path: "/pricing" });
const offers = [
  { name: "Free", price: "$0", text: "Two 5-second previews. The first works without login. Watermarked 480p exports." },
  { name: "Starter", price: "$9.99/month", text: "20 HD videos each month with no watermark. Personal use only." },
  { name: "Pro", price: "$24.99/month", text: "60 HD videos, commercial license, and priority queue. Batch generation is planned for later." },
  { name: "Credit Pack", price: "$19.99", text: "30 one-time video credits, valid for one year." },
];
export default function PricingPage() { return <main className="shell py-16 md:py-24"><h1 className="max-w-4xl text-5xl font-black tracking-[-0.05em] md:text-7xl">AI room design video pricing</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Start with a watermarked preview. Upgrade for HD, clean exports, priority processing, and commercial use.</p><div className="mt-12 grid gap-4 md:grid-cols-2">{offers.map((offer) => <article key={offer.name} className="surface p-6"><Check size={22} weight="bold" className="text-[var(--accent)]" /><h2 className="mt-5 text-2xl font-black">{offer.name}</h2><p className="mt-2 text-3xl font-black tracking-[-0.04em]">{offer.price}</p><p className="mt-4 leading-7 text-[var(--muted)]">{offer.text}</p></article>)}</div><Link href="/#pricing" className="focus-ring mt-8 inline-block rounded-xl bg-[var(--accent)] px-5 py-3 font-black text-[var(--on-accent)]">Choose a plan</Link></main>; }
