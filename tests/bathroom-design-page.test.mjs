import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const requiredHeadings = [
  "Free AI Bathroom Design Tool",
  "Bathroom Design Ideas by Style",
  "Small Bathroom Design That Feels Bigger",
  "Modern Bathroom Design",
  "Bathroom Remodel Ideas — Real Before &amp; After Makeovers",
  "Luxury Bathroom Design",
  "How AI Bathroom Design Works",
];

test("bathroom design page has exact metadata, one H1, and a Bathroom-default generator", async () => {
  const [page, generator] = await Promise.all([
    read("app/bathroom-design/page.tsx"),
    read("components/generator/room-generator.tsx"),
  ]);
  assert.match(page, /Bathroom Design — Before & After Video \| RoomFacelift/);
  assert.match(page, /Upload a photo of your bathroom and watch AI redesign it in a smooth before & after video\. Free preview, no login for the first one\./);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /Bathroom Design: See Your Bathroom Before &amp; After/);
  assert.match(page, /<RoomGenerator initialRoomType="Bathroom" lockRoomType surface="bathroom_design" \/>/);
  assert.match(page, /First preview free, no login\. 480p with watermark\./);
  assert.match(generator, /initialRoomType = "Living Room"/);
});

test("bathroom design page renders the eight official styles and all required H2 sections", async () => {
  const page = await read("app/bathroom-design/page.tsx");
  for (const style of ["Modern", "Scandinavian", "Japandi", "Luxury", "Farmhouse", "Minimalist", "Coastal", "Industrial"]) assert.match(page, new RegExp(style));
  for (const heading of requiredHeadings) assert.match(page, new RegExp(heading));
});

test("bathroom design page renders exactly six FAQs and one shared FAQ source", async () => {
  const page = await read("app/bathroom-design/page.tsx");
  assert.equal((page.match(/question: "/g) ?? []).length, 6);
  assert.equal((page.match(/"@type": "FAQPage"/g) ?? []).length, 1);
  assert.match(page, /mainEntity: bathroomFaqs\.map/);
  assert.match(page, /\{bathroomFaqs\.map\(\(faq\) =>/);
  assert.equal((page.match(/type="application\/ld\+json"/g) ?? []).length, 1);
});

test("bathroom design page uses a data-driven case component without inventing makeovers", async () => {
  const [page, cases] = await Promise.all([
    read("app/bathroom-design/page.tsx"),
    read("components/bathroom/remodel-cases.tsx"),
  ]);
  assert.match(page, /<BathroomRemodelCases \/>/);
  assert.match(cases, /bathroomRemodelCases/);
  assert.match(cases, /beforeImage/);
  assert.match(cases, /afterVideo/);
  assert.match(cases, /afterPoster/);
});

test("bathroom design page exposes natural internal links to home, pricing, and blog", async () => {
  const page = await read("app/bathroom-design/page.tsx");
  assert.match(page, /href="\/"/);
  assert.match(page, /href="\/pricing"/);
  assert.match(page, /href="\/blog"/);
});

test("visual experiment stays out of production discovery entry points", async () => {
  const [sitemap, homepage, header, footer] = await Promise.all([
    read("app/sitemap.ts"),
    read("app/page.tsx"),
    read("components/site-header.tsx"),
    read("components/site-footer.tsx"),
  ]);
  assert.doesNotMatch(sitemap, /bathroom-design/);
  assert.doesNotMatch(homepage, /bathroom-design/);
  assert.doesNotMatch(header, /bathroom-design/);
  assert.doesNotMatch(footer, /bathroom-design/);
});
