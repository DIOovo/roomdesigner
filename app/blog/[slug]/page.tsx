import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AdSlot } from "@/components/ad-slot";
import { getPost, posts } from "@/lib/blog";
import { publicPageMetadata } from "@/lib/seo";

export function generateStaticParams() { return posts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const metadata = publicPageMetadata({ title: post.title, description: post.description, path: `/blog/${post.slug}`, type: "article" });
  return { ...metadata, openGraph: { ...metadata.openGraph, type: "article", publishedTime: post.date } };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  return (
    <main className="shell py-14 md:py-20">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-black text-[var(--accent)]">{post.keyword}</p>
        <h1 className="mt-4 text-5xl font-black leading-[.98] tracking-[-0.055em] md:text-7xl">{post.title}</h1>
        <p className="mt-7 text-xl leading-8 text-[var(--muted)]">{post.intro}</p>
        <Link href="/#generator" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-black text-[var(--on-accent)]">Try RoomFacelift <ArrowRight size={18} weight="bold" /></Link>
        <AdSlot />
        <div className="mt-12 grid gap-12">
          {post.sections.map((section) => <section key={section.title}><h2 className="text-3xl font-black tracking-[-0.04em]">{section.title}</h2><p className="mt-4 text-lg leading-8 text-[var(--muted)]">{section.body}</p></section>)}
        </div>
        <aside className="mt-14 border-t border-[var(--line)] pt-8">
          <h2 className="text-2xl font-black tracking-[-0.03em]">Related articles</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {posts.filter((related) => related.slug !== post.slug).map((related) => <Link key={related.slug} href={`/blog/${related.slug}`} className="focus-ring rounded-xl border border-[var(--line)] p-4 font-bold hover:border-[var(--accent)]">{related.title}</Link>)}
          </div>
        </aside>
        <aside className="surface mt-14 p-6 md:p-8"><h2 className="text-3xl font-black tracking-[-0.04em]">See your own room in motion.</h2><p className="mt-3 leading-7 text-[var(--muted)]">Try RoomFacelift with a photo or sample room. Your first preview works without login.</p><Link href="/#generator" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-black text-[var(--on-accent)]">Try RoomFacelift <ArrowRight size={18} weight="bold" /></Link></aside>
      </article>
    </main>
  );
}
