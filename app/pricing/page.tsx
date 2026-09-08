import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { CheckoutButton } from "@/components/pricing/checkout-button";
import { publicPageMetadata } from "@/lib/seo";
export const metadata = publicPageMetadata({ title: "AI Room Design Video Pricing", description: "Compare RoomFacelift Free, Starter, Pro, and one-time credit options for AI room transformation videos.", path: "/pricing" });
const offers = [
  { name: "Free", price: "$0", text: "Two 5-second previews. The first works without login. Watermarked 480p exports.", plan: null, featured: false },
  { name: "Starter", price: "$9.99/month", text: "20 HD videos each month with no watermark. Personal use only.", plan: "starter", featured: false },
  { name: "Pro", price: "$24.99/month", text: "60 five-second HD videos with no watermark, commercial licensing, and priority queue access.", plan: "pro", featured: true },
  { name: "Credit Pack", price: "$19.99", text: "30 one-time video credits, valid for one year.", plan: "credits", featured: false },
] as const;
export default function PricingPage() { return <main className="shell py-16 md:py-24"><h1 className="max-w-4xl text-5xl md:text-7xl">AI room design video pricing</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Start with a watermarked preview. Upgrade for HD, clean exports, priority processing, and commercial use.</p><div className="mt-12 grid gap-4 md:grid-cols-2">{offers.map((offer) => <article key={offer.name} className="surface flex flex-col p-7"><Check size={22} weight="bold" className="text-[var(--accent)]" /><h2 className="mt-5 text-2xl">{offer.name}</h2><p className="mt-2 text-3xl font-black tracking-[-0.025em]">{offer.price}</p><p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">{offer.text}</p><div className="mt-auto">{offer.plan ? <CheckoutButton plan={offer.plan} featured={offer.featured}>Choose plan</CheckoutButton> : <Link href="/#generator" className="focus-ring mt-7 flex w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm font-black hover:border-[var(--accent)]">Try free</Link>}</div></article>)}</div></main>; }
