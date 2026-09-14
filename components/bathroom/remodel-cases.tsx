import Image from "next/image";

export type BathroomRemodelCase = {
  beforeImage: string;
  afterVideo: string;
  afterPoster: string;
  style: string;
};

// Centralized, verified before → after bathroom examples.
// Add only real pairs: both the before image and the generated after output must exist.
export const bathroomRemodelCases: BathroomRemodelCase[] = [];

export function BathroomRemodelCases() {
  if (bathroomRemodelCases.length === 0) {
    return (
      <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
        Verified bathroom before &amp; after makeovers are being prepared and will appear here. No fictional examples are shown in the meantime.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {bathroomRemodelCases.map((example) => (
        <article key={example.beforeImage} className="surface overflow-hidden">
          <div className="grid grid-cols-2 border-b border-[var(--line)]">
            <div className="relative aspect-square overflow-hidden border-r border-[var(--line)]">
              <Image
                src={example.beforeImage}
                alt="Original bathroom before"
                fill
                className="object-cover"
                sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 300px"
              />
            </div>
            <div className="relative aspect-square overflow-hidden bg-[color:var(--accent)]/[.06]">
              <video
                src={example.afterVideo}
                poster={example.afterPoster}
                muted
                loop
                playsInline
                controls
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="p-5">
            <p className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent)]">{example.style}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
