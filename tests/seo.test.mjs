import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildStructuredData, faqs, howToSteps } from "../lib/site.ts";
import { hasAnalyticsConsent } from "../lib/analytics/consent.ts";
import { sanitizeAnalyticsProperties } from "../lib/analytics/events.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage keeps the target metadata and exactly one H1", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /Free AI Room Design Generator \(No Login\) - Before After Video/);
  assert.match(source, /Free AI Room Design Generator/);
  assert.equal((source.match(/<h1\b/g) ?? []).length, 1);
  assert.match(source, /path: "\/"/);
});

test("structured data is valid JSON and stays in sync with FAQ and HowTo sources", () => {
  const schemas = JSON.parse(JSON.stringify(buildStructuredData()));
  const faqSchema = schemas.find((schema) => schema["@type"] === "FAQPage");
  const howToSchema = schemas.find((schema) => schema["@type"] === "HowTo");
  assert.deepEqual(faqSchema.mainEntity.map((item) => [item.name, item.acceptedAnswer.text]), faqs.map((faq) => [faq.question, faq.answer]));
  assert.deepEqual(howToSchema.step.map((item) => [item.name, item.text]), howToSteps.map((step) => [step.name, step.text]));
  assert.equal(schemas.filter((schema) => schema["@type"] === "Organization").length, 1);
  assert.equal(schemas.filter((schema) => schema["@type"] === "WebApplication").length, 1);
  assert.equal(schemas.find((schema) => schema["@type"] === "Organization").name, "RoomFacelift");
  assert.equal(schemas.find((schema) => schema["@type"] === "WebApplication").name, "RoomFacelift");
});

test("public product branding uses RoomFacelift", async () => {
  const sources = await Promise.all(["app/layout.tsx", "components/site-header.tsx", "components/site-footer.tsx", "lib/site.ts", "lib/video/watermark.ts"].map(read));
  assert.match(sources.join("\n"), /RoomFacelift/);
  assert.doesNotMatch(sources.join("\n"), /Room[o]rphic/);
  assert.match(await read("package.json"), /"name": "roomfacelift"/);
});

test("sitemap includes public routes and excludes private routes", async () => {
  const source = await read("app/sitemap.ts");
  for (const route of ["/about", "/contact", "/privacy", "/terms", "/pricing", "/blog"]) assert.match(source, new RegExp(route.replace("/", "\\/")));
  for (const route of ["/login", "/signup", "/account", "/result", "/api"]) assert.doesNotMatch(source, new RegExp(route.replace("/", "\\/")));
});

test("private pages are noindex and public metadata uses the production origin", async () => {
  const [login, signup, account, result, seo] = await Promise.all(["app/login/page.tsx", "app/signup/page.tsx", "app/account/page.tsx", "app/result/[id]/page.tsx", "lib/seo.ts"].map(read));
  for (const source of [login, signup, account, result]) assert.match(source, /privatePageRobots/);
  assert.match(seo, /siteConfig\.url/);
  assert.match(await read("lib/site.ts"), /https:\/\/roomorphic\.com/);
});

test("analytics is a consent-gated no-op and strips sensitive properties", () => {
  assert.equal(hasAnalyticsConsent(undefined), false);
  assert.equal(hasAnalyticsConsent({ getItem: () => "essential" }), false);
  assert.equal(hasAnalyticsConsent({ getItem: () => "accepted" }), true);
  assert.deepEqual(sanitizeAnalyticsProperties({ roomType: "Kitchen", style: "Japandi", email: "private@example.com", videoUrl: "https://private" }), { roomType: "Kitchen", style: "Japandi" });
});
