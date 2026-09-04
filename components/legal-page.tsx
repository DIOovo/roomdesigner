export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <main className="shell py-16 md:py-24"><article className="mx-auto max-w-3xl"><h1 className="text-5xl font-black tracking-[-0.05em] md:text-7xl">{title}</h1><p className="mt-6 text-xl leading-8 text-[var(--muted)]">{intro}</p><div className="mt-12 grid gap-10 text-base leading-8 text-[var(--muted)] [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-[-0.03em] [&_h2]:text-[var(--ink)]">{children}</div></article></main>;
}
