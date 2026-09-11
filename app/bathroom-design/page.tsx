import Link from "next/link";
import { FilmSlate, ImageSquare, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { RoomGenerator } from "@/components/generator/room-generator";
import { publicPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

const title = "Bathroom Design — See Your Bathroom Before & After | RoomFacelift";
const description = "Upload a photo of your bathroom and watch it transform with AI. Free bathroom design ideas in before & after video. No signup to try.";

export const metadata = publicPageMetadata({ title, description, path: "/bathroom-design" });

const bathroomStyles = [
  { title: "Modern Bathroom", description: "Clean lines, floating vanity, walk-in shower." },
  { title: "Farmhouse Bathroom", description: "Shiplap walls, freestanding tub, warm wood." },
  { title: "Scandinavian Bathroom", description: "White tiles, light oak, minimal fixtures." },
  { title: "Luxury Marble Bathroom", description: "Marble walls, gold accents, soaking tub." },
  { title: "Small Bathroom Storage", description: "Space-saving layout, wall-mounted storage." },
  { title: "Japandi Bathroom", description: "Muted tones, natural stone, zen minimalism." },
] as const;

const transformationSlots = [
  { title: "Modern Bathroom Transformation", style: "Modern", after: "A cleaner vanity, shower, lighting, and material direction." },
  { title: "Small Bathroom Transformation", style: "Space-saving", after: "A more efficient storage and fixture concept for a compact room." },
  { title: "Japandi Bathroom Transformation", style: "Japandi", after: "A calm natural-stone, warm-wood, and muted-color direction." },
] as const;

const bathroomFaqs = [
  {
    question: "How do I redesign my bathroom with AI?",
    answer: "Upload a clear bathroom photo, keep Bathroom selected as the room type, choose an interior style, and start the generator. RoomFacelift prepares a redesigned final frame and a short before and after transformation video.",
  },
  {
    question: "What bathroom styles can I try?",
    answer: "You can explore Modern, Farmhouse, Scandinavian, Luxury, Japandi, Minimalist, Coastal, Traditional, and other available RoomFacelift styles. The best direction depends on your room size, existing fixtures, natural light, and remodeling goals.",
  },
  {
    question: "Is the AI bathroom design free?",
    answer: "Your first limited preview is free and does not require signup. Free previews include a RoomFacelift watermark. Additional generations and paid export features depend on the current account and plan allowances.",
  },
  {
    question: "Can I see my bathroom before and after?",
    answer: "Yes. RoomFacelift uses your original bathroom photo as the before frame and the AI redesign as the after frame, then creates a short video that shows the transition between them.",
  },
  {
    question: "Does it work for small bathrooms?",
    answer: "Yes. A clear, level photo can help you compare visual directions for a small bathroom, including lighter finishes, wall-mounted storage, restrained fixtures, and layouts that feel less crowded. Treat the result as a planning reference rather than measured construction documentation.",
  },
] as const;

export default function BathroomDesignPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteConfig.url}/bathroom-design#faq`,
    url: `${siteConfig.url}/bathroom-design`,
    mainEntity: bathroomFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section id="bathroom-generator" className="shell py-10 lg:py-16">
        <div className="mb-9 max-w-4xl">
          <p className="mb-3 text-sm font-semibold text-[var(--accent)]">AI bathroom design from your own photo</p>
          <h1 className="text-[clamp(2.6rem,5vw,5.25rem)] leading-[.98]">Bathroom Design: See Your Bathroom Before &amp; After</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Upload a photo of your bathroom. Watch it become a whole new space — in video, not a static render.</p>
        </div>
        <RoomGenerator initialRoomType="Bathroom" />
        <p className="mt-4 text-sm font-semibold text-[var(--muted)]">First video free, no signup. Watermarked.</p>
      </section>

      <section className="border-y border-[var(--line)] bg-[color:var(--surface)]/35 py-20 md:py-28" aria-labelledby="bathroom-styles-title">
        <div className="shell">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold text-[var(--accent)]">Bathroom design ideas</p>
            <h2 id="bathroom-styles-title" className="text-4xl md:text-6xl">Six directions for a more considered bathroom.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">Start with the mood you want, then compare how fixtures, storage, finishes, and lighting could work together.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bathroomStyles.map((style, index) => (
              <article key={style.title} className="surface min-h-52 p-6 md:p-7">
                <div className="flex items-center justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--accent)]"><Sparkle size={21} weight="bold" /></span>
                  <span className="text-xs font-black text-[var(--muted)]">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-2xl">{style.title}</h3>
                <p className="mt-3 leading-7 text-[var(--muted)]">{style.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-20 md:py-28" aria-labelledby="bathroom-examples-title">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-bold text-[var(--accent)]">Before → after, designed for video</p>
          <h2 id="bathroom-examples-title" className="text-4xl md:text-6xl">Bathroom transformation examples.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">These prepared example slots show how verified bathroom transformations will be presented. No unrelated room photos or invented customer results are shown in this draft.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {transformationSlots.map((example) => (
            <article key={example.title} className="surface overflow-hidden">
              <div className="grid grid-cols-2 border-b border-[var(--line)]">
                <div className="grid min-h-48 place-items-center border-r border-[var(--line)] bg-[var(--surface-2)] p-5 text-center">
                  <div><ImageSquare size={28} weight="bold" className="mx-auto text-[var(--muted)]" /><p className="mt-3 text-xs font-black uppercase tracking-[.1em] text-[var(--muted)]">Before</p><p className="mt-1 text-sm font-semibold">Original bathroom photo</p></div>
                </div>
                <div className="grid min-h-48 place-items-center bg-[color:var(--accent)]/[.07] p-5 text-center">
                  <div><FilmSlate size={28} weight="fill" className="mx-auto text-[var(--accent)]" /><p className="mt-3 text-xs font-black uppercase tracking-[.1em] text-[var(--accent)]">After video</p><p className="mt-1 text-sm font-semibold">Verified preview slot</p></div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent)]">{example.style}</p>
                <h3 className="mt-2 text-xl">{example.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{example.after}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color:var(--surface)]/35 py-20 md:py-28" aria-labelledby="ai-remodel-title">
        <div className="shell grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="mb-3 text-sm font-bold text-[var(--accent)]">Plan before you remodel</p>
            <h2 id="ai-remodel-title" className="text-4xl md:text-5xl">How AI Bathroom Design Helps You Plan a Remodel</h2>
          </div>
          <div className="space-y-5 text-[17px] leading-8 text-[var(--muted)]">
            <p>Bathroom remodel decisions are unusually connected. A vanity affects circulation, lighting changes how tile reads, and storage can determine whether a small room feels calm or crowded. AI bathroom design gives you a fast way to compare those choices using a photo of the space you already have. Instead of collecting disconnected bathroom design ideas, you can test a coordinated visual direction around your room&apos;s visible proportions and fixed features.</p>
            <p>A before and after video can be easier to evaluate than a single static render because the transition keeps the original room in context. You can see where the proposed finishes, fixtures, lighting, and furniture direction came from, rather than treating the result as an unrelated inspiration image. RoomFacelift aims to preserve a recognizable camera viewpoint so that the relationship between the existing bathroom and the redesign remains understandable.</p>
            <p>AI can help explore layout direction, brighter or warmer lighting, material combinations, vanity styles, storage approaches, and an overall design language. It is especially useful early in a bathroom remodel, when you are deciding whether Modern, Scandinavian, Farmhouse, Luxury, or Japandi ideas suit the room. For a small bathroom design, lighter surfaces, restrained contrast, wall-mounted storage, simple fixtures, and a visually quieter palette can help the space feel more open.</p>
            <p>The generated design should be treated as a renovation reference, not a construction plan. It does not confirm measurements, plumbing positions, waterproofing, building codes, product availability, or structural feasibility. Share useful concepts with a qualified designer or contractor, verify dimensions and technical requirements, and use the video to communicate the atmosphere and priorities you want to achieve.</p>
          </div>
        </div>
      </section>

      <section id="faq" className="shell py-20 md:py-28" aria-labelledby="bathroom-faq-title">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="mb-3 text-sm font-bold text-[var(--accent)]">Bathroom design FAQ</p><h2 id="bathroom-faq-title" className="text-4xl md:text-5xl">Questions before you redesign?</h2></div>
          <div className="grid gap-3">
            {bathroomFaqs.map((faq) => (
              <details key={faq.question} className="group surface p-5 open:bg-[var(--surface-2)]">
                <summary className="focus-ring cursor-pointer list-none rounded-sm pr-8 text-lg font-bold marker:hidden">{faq.question}</summary>
                <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-[var(--line)] pt-8 text-center">
          <p className="text-lg font-bold">Ready to explore a direction for your bathroom?</p>
          <Link href="#bathroom-generator" className="focus-ring mt-4 inline-flex rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--on-accent)] hover:bg-[var(--accent-strong)]">Try your bathroom photo</Link>
        </div>
      </section>
    </main>
  );
}
