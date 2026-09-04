import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { posts } from "@/lib/blog";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({ title: "AI Room Design Guides", description: "Practical guides to AI room design from photos, better source images, and interior design transformation videos.", path: "/blog" });

export default function BlogPage() {
  return (
    <main className="shell py-16 md:py-24">
      <h1 className="max-w-3xl text-5xl font-black tracking-[-0.05em] md:text-7xl">AI room design guides for better reveals.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Clear, practical advice for homeowners, designers, remodelers, and real estate teams.</p>
      <Link href="/#generator" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm font-black">Try the room design generator <ArrowRight size={17} weight="bold" /></Link>
      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {posts.map((post, index) => (
          <article key={post.slug} className={`surface p-6 ${index === 0 ? "md:col-span-2 md:grid md:grid-cols-[1.3fr_.7fr] md:gap-10" : ""}`}>
            <div><p className="text-sm font-bold text-[var(--accent)]">{post.keyword}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">{post.title}</h2><p className="mt-4 leading-7 text-[var(--muted)]">{post.description}</p></div>
            <div className="mt-7 flex items-end md:mt-0 md:justify-end"><Link href={`/blog/${post.slug}`} className="focus-ring flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-[var(--on-accent)]">Read guide <ArrowRight size={17} weight="bold" /></Link></div>
          </article>
        ))}
      </div>
    </main>
  );
}
