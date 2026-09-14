import Link from "next/link";
import { RoomGenerator } from "@/components/generator/room-generator";
import { BathroomRemodelCases } from "@/components/bathroom/remodel-cases";
import { BathroomStyleShowcase } from "@/components/bathroom/style-showcase";
import { publicPageMetadata } from "@/lib/seo";
import { siteConfig, styles } from "@/lib/site";

const title = "Bathroom Design — Before & After Video | RoomFacelift";
const description =
  "Upload a photo of your bathroom and watch AI redesign it in a smooth before & after video. Free preview, no login for the first one.";

export const metadata = publicPageMetadata({ title, description, path: "/bathroom-design" });

const freePreviewLine = "First preview free, no login. 480p with watermark.";

const bathroomStyleGuide = [
  { name: "Modern", details: "clean lines, floating vanity, walk-in shower" },
  { name: "Scandinavian", details: "white tiles, light oak, minimal fixtures" },
  { name: "Japandi", details: "muted tones, natural stone, calm minimalism" },
  { name: "Luxury", details: "marble surfaces, statement lighting, soaking tub" },
  { name: "Farmhouse", details: "shiplap walls, freestanding tub, warm wood" },
  { name: "Minimalist", details: "hidden storage, seamless surfaces, no clutter" },
  { name: "Coastal", details: "soft blues, light wood, airy and bright" },
  { name: "Industrial", details: "matte black fixtures, concrete, exposed metal" },
] as const;

const bathroomStyleShowcase = bathroomStyleGuide.map((item) => {
  const asset = styles.find((style) => style.name === item.name);
  if (!asset) throw new Error(`Missing bathroom style asset: ${item.name}`);
  return { ...item, image: asset.image, alt: asset.alt };
});

const bathroomFaqs = [
  {
    question: "How do I redesign my bathroom with AI?",
    answer:
      "Upload one photo of your bathroom, choose a style such as modern, Scandinavian or luxury, and generate your video. Keep layout mode preserves walls, doors and windows so you can compare designs without losing the structure of the room.",
  },
  {
    question: "Is the AI bathroom design free?",
    answer:
      "Your first 5-second 480p preview is available free without an account. After you sign in, you can claim one more limited free preview. Free videos include a watermark and the allowance does not reset daily.",
  },
  {
    question: "Can I see my bathroom before and after?",
    answer:
      "Yes. Every render is delivered as a before-and-after video, so you can see your original photo and the redesign side by side in one clip.",
  },
  {
    question: "What bathroom design styles can I try?",
    answer:
      "Fifteen styles including Modern, Scandinavian, Japandi, Luxury, Farmhouse, Minimalist, Coastal and Industrial. The style list is the same across every room type.",
  },
  {
    question: "Does it work for small bathrooms?",
    answer:
      "Yes, and small bathrooms are one of the best use cases. Keep layout mode lets you test vanity, tile and lighting changes without changing the room's footprint.",
  },
  {
    question: "Can I use the video with my contractor?",
    answer:
      "The video is a concept visualisation for planning and communication, not a construction drawing or a specification. Pro plans include commercial use rights for designers, agents and marketers.",
  },
] as const;

export default function BathroomDesignPage() {
  const pageUrl = `${siteConfig.url}/bathroom-design`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      url: pageUrl,
      image: new URL(siteConfig.socialImagePath, `${siteConfig.url}/`).toString(),
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      description: siteConfig.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Limited first preview" },
      featureList: ["AI room design from a photo", "Before and after transformation video", "No-login first preview"],
      provider: { "@id": `${siteConfig.url}/#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      url: pageUrl,
      mainEntity: bathroomFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteConfig.url}/` },
        { "@type": "ListItem", position: 2, name: "Bathroom Design", item: pageUrl },
      ],
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section id="bathroom-generator" className="shell py-10 lg:py-16">
        <div className="mb-9 max-w-4xl">
          <p className="mb-3 text-sm font-semibold text-[var(--accent)]">AI bathroom design tool</p>
          <h1 className="text-[clamp(2.6rem,5vw,5.25rem)] leading-[.98]">Bathroom Design: See Your Bathroom Before &amp; After</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Upload a photo of your bathroom. Watch it become a whole new space — in video, not a static render.</p>
        </div>
        <RoomGenerator initialRoomType="Bathroom" lockRoomType surface="bathroom_design" />
        <p className="mt-4 text-sm font-semibold text-[var(--muted)]">{freePreviewLine}</p>
      </section>

      <section className="border-y border-[var(--line)] bg-[color:var(--surface)]/35 py-20 md:py-28">
        <div className="shell grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <h2 className="text-4xl md:text-6xl">Free AI Bathroom Design Tool</h2>
          <div className="space-y-5 text-[17px] leading-8 text-[var(--muted)]">
            <p>Try a bathroom design in your browser without installing anything. Upload one photo of your bathroom, pick a style, and RoomFacelift renders a smooth before and after video in about a minute. Your first preview is free and needs no account — no download, no design software, no appointment.</p>
            <p>
              Working on another room instead? The <Link href="/" className="font-semibold text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-strong)]">AI room design generator</Link> covers living rooms, bedrooms, kitchens and more.
            </p>
          </div>
        </div>
      </section>

      <section className="shell py-20 md:py-28" aria-labelledby="bathroom-styles-title">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-bold text-[var(--accent)]">Bathroom design ideas</p>
          <h2 id="bathroom-styles-title" className="text-4xl md:text-6xl">Bathroom Design Ideas by Style</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">Not sure which direction to take? These are the styles that work best in bathrooms, and you can preview any of them on your own photo in a single click:</p>
        </div>
        <div className="mt-12">
          <BathroomStyleShowcase items={bathroomStyleShowcase} />
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color:var(--surface)]/35 py-20 md:py-28">
        <div className="shell grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <h2 className="text-4xl md:text-6xl">Small Bathroom Design That Feels Bigger</h2>
          <p className="text-[17px] leading-8 text-[var(--muted)]">Small bathrooms respond to a few changes more than others: swap a bulky vanity for a wall-mounted one, take tiles all the way to the ceiling, replace a shower curtain with a glass panel, and keep the palette light. Keep layout mode in RoomFacelift preserves your walls, doors and windows, so you can test these changes without guessing whether the room still works.</p>
        </div>
      </section>

      <section className="shell py-20 md:py-28">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <h2 className="text-4xl md:text-6xl">Modern Bathroom Design</h2>
          <p className="text-[17px] leading-8 text-[var(--muted)]">Modern bathrooms are defined by what you remove as much as what you add — handleless cabinets, a single material for walls and floor, and lighting that comes from behind surfaces instead of above them. Preview a modern pass on your photo first, then decide what is worth building.</p>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color:var(--surface)]/35 py-20 md:py-28" aria-labelledby="bathroom-remodel-title">
        <div className="shell">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold text-[var(--accent)]">Before → after, in motion</p>
            <h2 id="bathroom-remodel-title" className="text-4xl md:text-6xl">Bathroom Remodel Ideas — Real Before &amp; After Makeovers</h2>
          </div>
          <div className="mt-10">
            <BathroomRemodelCases />
          </div>
        </div>
      </section>

      <section className="shell py-20 md:py-28">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <h2 className="text-4xl md:text-6xl">Luxury Bathroom Design</h2>
          <p className="text-[17px] leading-8 text-[var(--muted)]">Luxury here is about material honesty: large-format marble or stone, brass or matte black fixtures, a freestanding tub with space around it, and one statement light. Preview the full treatment before committing to a renovation budget.</p>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color:var(--surface)]/35 py-20 md:py-28">
        <div className="shell grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <h2 className="text-4xl md:text-6xl">How AI Bathroom Design Works</h2>
          <div className="space-y-5 text-[17px] leading-8 text-[var(--muted)]">
            <p>You upload one photo. RoomFacelift reads the room&apos;s geometry — walls, floor, fixtures, window placement — then regenerates the scene in the style you chose, keeping the bones of the room intact. The output is a five-second before-and-after video that shows the transformation in motion, which is easier to judge than a single still: you can see how light moves through the space and how the fixtures sit in the layout.</p>
            <p>
              Ready for watermark-free HD exports? See <Link href="/pricing" className="font-semibold text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-strong)]">pricing</Link>. Browse our <Link href="/blog" className="font-semibold text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-strong)]">AI room design guides</Link> for more ideas.
            </p>
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
          <p className="text-lg font-bold">Try a direction for your own bathroom.</p>
          <Link href="#bathroom-generator" className="focus-ring mt-4 inline-flex rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--on-accent)] hover:bg-[var(--accent-strong)]">Try your bathroom photo</Link>
        </div>
      </section>
    </main>
  );
}
