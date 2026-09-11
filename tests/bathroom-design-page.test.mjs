import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("bathroom design draft has exact metadata, one H1, and a Bathroom-default existing generator", async () => {
  const [page, generator] = await Promise.all([
    read("app/bathroom-design/page.tsx"),
    read("components/generator/room-generator.tsx"),
  ]);
  assert.match(page, /Bathroom Design — See Your Bathroom Before & After \| RoomFacelift/);
  assert.match(page, /Upload a photo of your bathroom and watch it transform with AI\. Free bathroom design ideas in before & after video\. No signup to try\./);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /Bathroom Design: See Your Bathroom Before &amp; After/);
  assert.match(page, /<RoomGenerator initialRoomType="Bathroom" \/>/);
  assert.match(generator, /initialRoomType = "Living Room"/);
});

test("bathroom design draft includes six styles, three honest example slots, education, and five FAQs", async () => {
  const page = await read("app/bathroom-design/page.tsx");
  for (const title of ["Modern Bathroom", "Farmhouse Bathroom", "Scandinavian Bathroom", "Luxury Marble Bathroom", "Small Bathroom Storage", "Japandi Bathroom"]) assert.match(page, new RegExp(title));
  assert.equal((page.match(/title: ".*Bathroom Transformation"/g) ?? []).length, 3);
  assert.match(page, /How AI Bathroom Design Helps You Plan a Remodel/);
  assert.equal((page.match(/question: "/g) ?? []).length, 5);
  assert.match(page, /No unrelated room photos or invented customer results/);
});

test("bathroom FAQ UI and JSON-LD share one source and render exactly one FAQPage schema", async () => {
  const page = await read("app/bathroom-design/page.tsx");
  assert.equal((page.match(/"@type": "FAQPage"/g) ?? []).length, 1);
  assert.match(page, /mainEntity: bathroomFaqs\.map/);
  assert.match(page, /\{bathroomFaqs\.map\(\(faq\) =>/);
  assert.equal((page.match(/type="application\/ld\+json"/g) ?? []).length, 1);
});

test("bathroom design stays local-only with no homepage, sitemap, header, or footer link", async () => {
  const publicEntryPoints = await Promise.all([
    "app/page.tsx",
    "app/sitemap.ts",
    "components/site-header.tsx",
    "components/site-footer.tsx",
  ].map(read));
  for (const source of publicEntryPoints) assert.doesNotMatch(source, /bathroom-design/);
});
