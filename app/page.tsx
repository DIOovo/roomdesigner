import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Buildings, Check, FilmSlate, HouseLine, ImageSquare, Play, Sparkle, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { RoomGenerator } from "@/components/generator/room-generator";
import { ComparisonSlider } from "@/components/examples/comparison-slider";
import { CheckoutButton } from "@/components/pricing/checkout-button";
import { StructuredData } from "@/components/structured-data";
import { publicPageMetadata } from "@/lib/seo";
import { faqs, howToSteps } from "@/lib/site";

export const metadata = publicPageMetadata({
  title: "Free AI Room Design Generator (No Login) - Before After Video",
  description: "Upload a room photo and create a smooth AI before and after redesign video. Your first 5-second preview is free with no login required.",
  path: "/",
});

type Plan = { name: "Free" | "Starter" | "Pro" | "Credit Pack"; price: string; note: string; features: readonly string[]; featured?: boolean };

const plans: readonly Plan[] = [
  { name: "Free", price: "$0", note: "Two previews, first without login", features: ["2 total previews", "5-second video", "480p with watermark", "Personal use only"] },
  { name: "Starter", price: "$9.99", note: "per month", features: ["20 videos per month", "5-second HD video", "No watermark", "Personal use only"] },
  { name: "Pro", price: "$24.99", note: "per month", features: ["60 videos per month", "5-second HD video", "No watermark", "Commercial license", "Priority queue"], featured: true },
  { name: "Credit Pack", price: "$19.99", note: "one-time", features: ["30 video credits", "5-second HD video", "Valid for one year", "No subscription"] },
];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ reuse?: string | string[] }> }) {
  const query = await searchParams;
  const reuseId = typeof query.reuse === "string" ? query.reuse : undefined;
  return (
    <main>
      <StructuredData />
      <section id="generator" className="shell py-8 lg:py-12">
        <div className="hero-enter mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-[.01em] text-[var(--accent)]">Photo in. Transformation video out.</p>
            <h1 className="max-w-5xl text-[clamp(2.35rem,4.2vw,4.5rem)] leading-[.98]">
              Free AI Room Design Generator <span className="text-[var(--muted)]">— Before &amp; After Video</span>
            </h1>
          </div>
          <p className="hidden max-w-sm text-sm font-medium leading-6 text-[var(--muted)] sm:block lg:pb-1">
            Upload one room photo. Watch it transform into your chosen style in a smooth 5-second video.
          </p>
        </div>
        <div className="hero-enter-delay"><RoomGenerator reuseId={reuseId} /></div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted)]">
          Try AI room design from a photo with no login for your first preview. Free previews are limited and include a watermark.
        </p>
      </section>

      <section id="examples" className="border-y border-[var(--line)] bg-[color:var(--surface)]/35 py-20 md:py-28">
        <div className="shell">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl">Not another static room render.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">Most AI room design tools create a static image. RoomFacelift creates a smooth before and after room transformation video, so the change is easier to understand and share.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <div className="surface p-3 md:p-4">
              <ComparisonSlider before="/samples/living-before.jpg" after="/samples/living-after.jpg" label="Japandi living room" />
              <div className="flex flex-wrap items-center justify-between gap-4 px-1 pb-1 pt-4">
                <div><h3 className="text-lg font-black">Japandi living room</h3><p className="text-sm text-[var(--muted)]">Same room. Same camera. A completely new direction.</p></div>
                <a href="/videos/living-japandi.mp4" className="focus-ring flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--on-accent)] shadow-[0_8px_20px_rgba(18,75,55,.16)] hover:bg-[var(--accent-strong)]"><Play size={17} weight="fill" /> Play video</a>
              </div>
            </div>
            <div className="grid gap-5">
              <div className="surface p-3"><ComparisonSlider before="/samples/bedroom-before.jpg" after="/samples/bedroom-after.jpg" label="Scandinavian bedroom" /><h3 className="px-1 pb-1 pt-3 font-black">Scandinavian bedroom</h3></div>
              <div className="surface p-3"><ComparisonSlider before="/samples/office-before.jpg" after="/samples/office-after.jpg" label="Mid-century office" /><h3 className="px-1 pb-1 pt-3 font-black">Mid-century office</h3></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="shell py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-bold text-[var(--accent)]">Three steps</p>
          <h2 className="text-4xl md:text-6xl">From room photo to reveal video.</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-[1.1fr_.9fr]">
          <div className="surface relative min-h-[470px] overflow-hidden">
            <Image src="/samples/kitchen-after.jpg" alt="Warm modern kitchen created with AI room design" fill className="object-cover" sizes="(max-width:768px) 100vw, 55vw" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-[color:var(--surface)]/92 p-5 backdrop-blur-lg">
              <p className="text-sm font-black text-[var(--accent)]">Built for real decisions</p>
              <h3 className="mt-1 text-2xl font-black">Homeowners explore. Designers present. Listings stand out.</h3>
            </div>
          </div>
          <ol className="grid gap-4">
            {howToSteps.map((step, index) => {
              const Icon = step.key === "upload" ? UploadSimple : step.key === "choose" ? ImageSquare : FilmSlate;
              return (
              <li key={step.name} className="surface grid grid-cols-[auto_1fr] gap-4 p-5">
                <span className="grid size-12 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--accent)]"><Icon size={24} weight="bold" /></span>
                <div><span className="text-xs font-black text-[var(--muted)]">{index + 1} of 3</span><h3 className="mt-1 text-xl font-black">{step.name}</h3><p className="mt-2 leading-6 text-[var(--muted)]">{step.text}</p></div>
              </li>
            );})}
          </ol>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[{ icon: HouseLine, text: "Home redesign" }, { icon: Briefcase, text: "Client proposals" }, { icon: Buildings, text: "Property listings" }, { icon: Sparkle, text: "Style exploration" }].map((use) => (
            <div key={use.text} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-4 text-sm font-bold"><use.icon size={21} className="text-[var(--accent)]" weight="bold" />{use.text}</div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color:var(--surface)]/35 py-20 md:py-28">
        <div className="shell grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div><h2 className="text-4xl md:text-5xl">Questions before you redesign?</h2><p className="mt-5 max-w-md leading-7 text-[var(--muted)]">Straight answers about free previews, no-login use, photo quality, and professional licensing.</p></div>
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group surface p-5 open:bg-[var(--surface-2)]">
                <summary className="focus-ring cursor-pointer list-none rounded-sm pr-8 text-lg font-bold marker:hidden">{faq.question}</summary>
                <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="shell py-20 md:py-28">
        <div className="max-w-2xl"><h2 className="text-4xl md:text-6xl">Start free. Pay when the work gets serious.</h2><p className="mt-5 text-lg leading-8 text-[var(--muted)]">Every real generation is five seconds. Commercial rights are reserved for Pro.</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.name} className={`surface relative flex flex-col p-6 ${plan.featured ? "soft-shadow border-[var(--accent)] lg:-translate-y-4" : ""}`}>
              {plan.featured ? <span className="mb-4 w-fit rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-black text-[var(--on-accent)]">Most Popular</span> : null}
              <h3 className="text-lg font-black">{plan.name}</h3>
              <p className="mt-5 text-4xl font-black tracking-[-0.045em]">{plan.price}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{plan.note}</p>
              <ul className="mt-6 grid gap-3 text-sm">
                {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check size={17} weight="bold" className="mt-0.5 shrink-0 text-[var(--accent)]" />{feature}</li>)}
              </ul>
              <div className="mt-auto">
                {plan.name === "Free" ? <Link href="#generator" className="focus-ring mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm font-black hover:border-[var(--accent)]">Try free <ArrowRight size={16} weight="bold" /></Link> : <CheckoutButton plan={plan.name === "Starter" ? "starter" : plan.name === "Pro" ? "pro" : "credits"} featured={plan.featured}>Choose plan</CheckoutButton>}
              </div>
            </article>
          ))}
        </div>
        <p className="mt-7 text-center text-sm font-semibold text-[var(--muted)]">Upgrade to remove watermark + unlock HD + commercial license</p>
        <p className="mt-4 text-center text-sm text-[var(--muted)]">Need practical tips first? Read our <Link href="/blog" className="font-bold text-[var(--accent)] underline">AI room design guides</Link>.</p>
      </section>
    </main>
  );
}
