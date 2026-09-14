import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("bathroom style showcase is lightweight and self-contained", async () => {
  const [showcase, packageJson] = await Promise.all([
    read("components/bathroom/style-showcase.tsx"),
    read("package.json"),
  ]);
  assert.match(showcase, /"use client"/);
  assert.match(showcase, /export function BathroomStyleShowcase/);
  assert.match(showcase, /onPointerDown/);
  assert.match(showcase, /onPointerMove/);
  assert.match(showcase, /setPointerCapture/);
  assert.doesNotMatch(packageJson, /swiper|embla|slick|framer-motion|keen-slider/i);
});

test("gallery and compact list share one local presentation state", async () => {
  const [showcase, generator, page] = await Promise.all([
    read("components/bathroom/style-showcase.tsx"),
    read("components/generator/room-generator.tsx"),
    read("app/bathroom-design/page.tsx"),
  ]);
  assert.match(showcase, /const \[position, setPosition\] = useState\(/);
  assert.match(showcase, /const activeIndex = Math\.min\(Math\.max\(Math\.round\(position\)/);
  assert.match(showcase, /const selectedName = items\[activeIndex\]\?\.name/);
  assert.equal((showcase.match(/useState\(/g) ?? []).length, 4);
  assert.doesNotMatch(showcase, /useOptionalStyleSelection|sharedSetStyle|StyleSelectionProvider/);
  assert.doesNotMatch(generator, /useOptionalStyleSelection|StyleSelectionProvider/);
  assert.doesNotMatch(page, /StyleSelectionProvider/);
});

test("dragging is optional, click-safe, keyboard-accessible, and reduced-motion aware", async () => {
  const showcase = await read("components/bathroom/style-showcase.tsx");
  assert.match(showcase, /CLICK_TOLERANCE_PX/);
  assert.match(showcase, /if \(!drag\.moved && Math\.abs\(deltaX\) <= CLICK_TOLERANCE_PX\) return/);
  assert.match(showcase, /onCardClick/);
  assert.match(showcase, /aria-pressed/);
  assert.match(showcase, /ArrowRight/);
  assert.match(showcase, /ArrowLeft/);
  assert.match(showcase, /Choose a style/);
  assert.match(showcase, /prefers-reduced-motion/);
  assert.match(showcase, /MOBILE_OVERLAP_PX/);
});

test("bathroom page renders the local showcase with exactly the eight official styles", async () => {
  const page = await read("app/bathroom-design/page.tsx");
  assert.match(page, /<BathroomStyleShowcase items=\{bathroomStyleShowcase\} \/>/);
  assert.match(page, /Bathroom Design Ideas by Style/);
  for (const style of ["Modern", "Scandinavian", "Japandi", "Luxury", "Farmhouse", "Minimalist", "Coastal", "Industrial"]) {
    assert.match(page, new RegExp(`name: "${style}"`));
  }
  assert.match(page, /<RoomGenerator initialRoomType="Bathroom" lockRoomType surface="bathroom_design" \/>/);
});
