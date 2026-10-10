import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("bathroom style showcase is a self-contained client component without carousel dependencies", async () => {
  const [showcase, packageJson] = await Promise.all([
    read("components/bathroom/style-showcase.tsx"),
    read("package.json"),
  ]);
  assert.match(showcase, /"use client"/);
  assert.match(showcase, /export function BathroomStyleShowcase/);
  // Native pointer events + CSS transforms only — no animation/carousel library.
  assert.match(showcase, /onPointerDown/);
  assert.match(showcase, /onPointerMove/);
  assert.match(showcase, /setPointerCapture/);
  assert.doesNotMatch(packageJson, /swiper|embla|slick|framer-motion|keen-slider/i);
});

test("bathroom style showcase keeps one presentation state shared by gallery, chips, and the generator", async () => {
  const showcase = await read("components/bathroom/style-showcase.tsx");
  // A single position state feeds the draggable strip and the chip list.
  assert.match(showcase, /const \[position, setPosition\] = useState\(/);
  assert.match(showcase, /const activeIndex = Math\.min\(Math\.max\(Math\.round\(position\)/);
  // The shared style selection is read once and written through on select.
  assert.match(showcase, /useOptionalStyleSelection/);
  assert.match(showcase, /sharedSetStyle\?\.\(items\[clamped\]\.name\)/);
  // External style changes (generator grid) pull the gallery along.
  assert.match(showcase, /if \(sharedIndex >= 0\) setPosition\(sharedIndex\)/);
  // No second, independent selection state that could disagree:
  // only position (selection), dragging, spacing, and the reduced-motion flag are stateful.
  assert.equal((showcase.match(/useState\(/g) ?? []).length, 4);
  assert.doesNotMatch(showcase, /selectedIndex, setSelectedIndex/);
});

test("bathroom style showcase keeps dragging optional and respects reduced motion", async () => {
  const showcase = await read("components/bathroom/style-showcase.tsx");
  // Click/tap on cards, compact chip buttons, and keyboard navigation.
  assert.match(showcase, /onCardClick/);
  assert.match(showcase, /aria-pressed/);
  assert.match(showcase, /ArrowRight/);
  assert.match(showcase, /ArrowLeft/);
  // Visible style names in both the gallery cards and the compact list.
  assert.match(showcase, /Choose a style/);
  assert.match(showcase, /prefers-reduced-motion/);
});

test("bathroom design page renders the showcase with the eight official styles and shares one style state with the generator", async () => {
  const page = await read("app/bathroom-design/page.tsx");
  assert.match(page, /<BathroomStyleShowcase items=\{bathroomStyleItems\} \/>/);
  assert.match(page, /Bathroom Design Ideas by Style/);
  for (const style of ["Modern", "Scandinavian", "Japandi", "Luxury", "Farmhouse", "Minimalist", "Coastal", "Industrial"]) {
    assert.match(page, new RegExp(`name: "${style}"`));
  }
  // The generator and the showcase live under one shared style selection.
  assert.match(page, /<StyleSelectionProvider initialStyle="Japandi">/);
  assert.match(page, /<RoomGenerator initialRoomType="Bathroom" lockRoomType surface="bathroom_design" \/>/);
});
