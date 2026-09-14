"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

export type BathroomStyleShowcaseItem = {
  name: string;
  details: string;
  image: string;
  alt: string;
};

const GAP_PX = 24;
const MOBILE_OVERLAP_PX = 24;
const CLICK_TOLERANCE_PX = 8;
const EDGE_OVERSHOOT = 0.45;
const SNAP_TRANSITION = "transform 540ms cubic-bezier(.22,1,.36,1), opacity 420ms ease";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Editorial image-strip transform: the selected card stays at scale 1,
 * adjacent cards shrink to ~0.94 with a +/-2deg tilt, farther cards settle
 * around 0.88 with up to +/-4deg. Kept subtle on purpose.
 */
function cardTransform(distance: number, spacing: number, reducedMotion: boolean): CSSProperties {
  const ad = Math.abs(distance);
  const side = distance === 0 ? 0 : Math.sign(distance);
  const scale = Math.max(ad <= 1 ? 1 - 0.06 * ad : 0.94 - 0.06 * (ad - 1), 0.8);
  const rotate = reducedMotion ? 0 : side * Math.min(ad <= 1 ? 2 * ad : 2 + 2 * (ad - 1), 4);
  const translateY = reducedMotion ? 0 : Math.min(ad * 14, 42);
  const opacity = ad <= 2 ? 1 : Math.max(1 - (ad - 2) * 0.55, 0);
  return {
    transform: `translateX(${distance * spacing}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
    opacity,
    zIndex: 60 - Math.round(ad * 10),
  };
}

export function BathroomStyleShowcase({ items }: { items: BathroomStyleShowcaseItem[] }) {
  const count = items.length;
  // Phase A intentionally keeps one local presentation state. It drives both
  // the gallery and the compact list without changing RoomGenerator behavior.
  const [position, setPosition] = useState(() => Math.max(items.findIndex((item) => item.name === "Japandi"), 0));
  const [dragging, setDragging] = useState(false);
  const [spacing, setSpacing] = useState(380);
  const reducedMotion = usePrefersReducedMotion();

  const anchorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startPosition: number; currentPosition: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const activeIndex = Math.min(Math.max(Math.round(position), 0), count - 1);
  const selectedName = items[activeIndex]?.name;

  const select = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), count - 1);
      setPosition(clamped);
    },
    [count],
  );

  // Keep card spacing in sync with the rendered card width (responsive).
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const measure = () => setSpacing(anchor.offsetWidth < 360 ? anchor.offsetWidth - MOBILE_OVERLAP_PX : anchor.offsetWidth + GAP_PX);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startPosition: position, currentPosition: position, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(deltaX) <= CLICK_TOLERANCE_PX) return;
    if (!drag.moved) {
      drag.moved = true;
      suppressClickRef.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* The gesture still works when pointer capture is unavailable. */
      }
      setDragging(true);
    }
    const raw = drag.startPosition - deltaX / spacing;
    // Tracked on the drag ref as well: pointerup can fire before React re-renders,
    // so the snap must not rely on possibly-stale `position` state.
    drag.currentPosition = Math.min(Math.max(raw, -EDGE_OVERSHOOT), count - 1 + EDGE_OVERSHOOT);
    setPosition(drag.currentPosition);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (drag.moved) select(Math.round(drag.currentPosition));
  };

  const onCardClick = (cardIndex: number) => {
    // A real drag ending on a card also fires click — ignore that one.
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    select(cardIndex);
  };

  const onStripKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      select(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      select(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      select(0);
    } else if (event.key === "End") {
      event.preventDefault();
      select(count - 1);
    }
  };

  const animated = !dragging && !reducedMotion;

  return (
    <div>
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label="Bathroom style gallery — drag, swipe, or use arrow keys"
        tabIndex={0}
        onKeyDown={onStripKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`focus-ring relative isolate select-none overflow-hidden rounded-2xl py-6 outline-none [touch-action:pan-y] md:py-8 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <p aria-hidden="true" className="pointer-events-none absolute right-2 top-2 z-[70] rounded-full bg-[color:var(--ink)]/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          Drag to explore
        </p>
        {/* Anchor box defines the selected card size; every card hangs off it via transforms. */}
        <div className="mx-auto w-[min(76vw,330px)] md:w-[420px]">
          <div ref={anchorRef} className="relative aspect-[16/11]">
            {items.map((item, cardIndex) => {
              const distance = cardIndex - position;
              const isActive = item.name === selectedName;
              const hidden = Math.abs(distance) > 3.6;
              return (
                <button
                  type="button"
                  key={item.name}
                  tabIndex={-1}
                  aria-pressed={isActive}
                  aria-label={`Select ${item.name} style`}
                  onClick={() => onCardClick(cardIndex)}
                  className={`absolute inset-0 overflow-hidden rounded-xl border text-left shadow-[var(--shadow-soft)] ${isActive ? "border-[var(--accent)]/60" : "border-[var(--line)]"} ${hidden ? "pointer-events-none" : ""}`}
                  style={{
                    ...cardTransform(distance, spacing, reducedMotion),
                    transition: animated ? SNAP_TRANSITION : "none",
                  }}
                >
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    draggable={false}
                    className="pointer-events-none object-cover"
                    sizes="(max-width: 767px) 76vw, 420px"
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3.5 pt-10">
                    <span>
                      <span className="block text-lg font-bold leading-tight text-white">{item.name}</span>
                      <span className={`mt-1 block text-xs leading-5 text-white/80 ${isActive ? "" : "invisible"}`}>{item.details}</span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-xs font-black text-white/70">0{cardIndex + 1}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p id="bathroom-style-list-label" className="text-sm font-semibold text-[var(--ink)]">
          Choose a style
        </p>
        <ul aria-labelledby="bathroom-style-list-label" className="mt-3 flex flex-wrap gap-2">
          {items.map((item, chipIndex) => {
            const isActive = item.name === selectedName;
            return (
              <li key={item.name}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => select(chipIndex)}
                  className={`focus-ring min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]/60 hover:text-[var(--accent)]"
                  }`}
                >
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
        <p role="status" className="sr-only">
          {selectedName ? `${selectedName} selected` : ""}
        </p>
      </div>
    </div>
  );
}
