import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { buildStructuredData, faqs, howToSteps, PRODUCTION_SITE_URL, resolveSiteUrl, siteConfig, styles } from "../lib/site.ts";
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
  assert.doesNotMatch(JSON.stringify(schemas), /localhost:3000/);
  for (const schema of schemas) assert.match(schema["@id"], /^https:\/\/roomfacelift\.com\//);
});

test("production metadata has one canonical origin and keeps localhost available only for development", async () => {
  assert.equal(PRODUCTION_SITE_URL, "https://roomfacelift.com");
  assert.equal(resolveSiteUrl(undefined, "production"), PRODUCTION_SITE_URL);
  assert.equal(resolveSiteUrl("http://localhost:3000/", "production"), PRODUCTION_SITE_URL);
  assert.equal(resolveSiteUrl("http://localhost:3000/", "development"), "http://localhost:3000");
  assert.equal(siteConfig.socialImagePath, "/og-image.png");
  await access(new URL("../public/og-image.png", import.meta.url));
  const publicMetadataSources = await Promise.all(["app/layout.tsx", "lib/seo.ts", "lib/site.ts", "app/page.tsx"].map(read));
  assert.doesNotMatch(publicMetadataSources.join("\n"), /roomorphic\.com/);
});

test("public product branding uses RoomFacelift", async () => {
  const sources = await Promise.all(["app/layout.tsx", "components/site-header.tsx", "components/site-footer.tsx", "lib/site.ts", "lib/video/watermark.ts"].map(read));
  assert.match(sources.join("\n"), /RoomFacelift/);
  assert.doesNotMatch(sources.join("\n"), /Room[o]rphic/);
  assert.match(await read("package.json"), /"name": "roomfacelift"/);
});

test("sitemap includes public routes and excludes private routes", async () => {
  const source = await read("app/sitemap.ts");
  for (const route of ["/about", "/contact", "/privacy", "/terms", "/refund", "/acceptable-use", "/pricing", "/blog"]) assert.match(source, new RegExp(route.replace("/", "\\/")));
  for (const route of ["/login", "/signup", "/account", "/result", "/api"]) assert.doesNotMatch(source, new RegExp(route.replace("/", "\\/")));
});

test("private pages are noindex and public metadata uses the production origin", async () => {
  const [login, signup, account, result, seo] = await Promise.all(["app/login/page.tsx", "app/signup/page.tsx", "app/account/page.tsx", "app/result/[id]/page.tsx", "lib/seo.ts"].map(read));
  for (const source of [login, signup, account, result]) assert.match(source, /privatePageRobots/);
  assert.match(seo, /siteConfig\.url/);
  assert.match(await read("lib/site.ts"), /https:\/\/roomfacelift\.com/);
});

test("production legal pages contain support, refund, privacy, and navigation disclosures", async () => {
  const [contact, privacy, terms, refund, footer, site] = await Promise.all([
    "app/contact/page.tsx",
    "app/privacy/page.tsx",
    "app/terms/page.tsx",
    "app/refund/page.tsx",
    "components/site-footer.tsx",
    "lib/site.ts",
  ].map(read));
  assert.match(site, /support@roomfacelift\.com/);
  assert.match(contact, /siteConfig\.supportEmail/);
  assert.doesNotMatch([contact, privacy, terms, refund, footer].join("\n"), /support@roomorphic\.com/i);
  assert.doesNotMatch(privacy, /must be finalized before launch|\bTODO\b|\bTBD\b/i);
  for (const heading of ["Third-Party Service Providers", "Cookies and Similar Technologies", "Your Privacy Rights", "International Data Transfers", "Children&apos;s Privacy"]) assert.match(privacy, new RegExp(heading));
  for (const provider of ["Supabase", "Cloudflare", "fal.ai", "MiniMax", "Google", "Creem", "Google Analytics", "Google AdSense", "Meta Pixel"]) assert.match(privacy, new RegExp(provider.replace(".", "\\.")));
  assert.doesNotMatch(privacy, /Stripe/);
  assert.match(privacy, /does not sell personal information/);
  assert.match(privacy, /California residents/);
  assert.match(privacy, /access to, correction of, or deletion/);
  assert.match(refund, /within 14 days after purchase if none of its credits have been used/);
  assert.match(refund, /except where required by applicable law/);
  assert.match(refund, /Duplicate charges and technical errors/);
  assert.match(refund, /authorized payment provider or Merchant of Record/);
  assert.match(terms, /href="\/refund"/);
  for (const route of ["/privacy", "/terms", "/refund", "/contact"]) assert.match(footer, new RegExp(`href="${route}"`));
});

test("analytics is a consent-gated no-op and strips sensitive properties", () => {
  assert.equal(hasAnalyticsConsent(undefined), false);
  assert.equal(hasAnalyticsConsent({ getItem: () => "essential" }), false);
  assert.equal(hasAnalyticsConsent({ getItem: () => "accepted" }), true);
  assert.deepEqual(sanitizeAnalyticsProperties({ roomType: "Kitchen", style: "Japandi", email: "private@example.com", videoUrl: "https://private" }), { roomType: "Kitchen", style: "Japandi" });
});

test("public review copy names Creem and does not advertise planned Pro features", async () => {
  const [privacy, refund, homepage, pricing, checkoutButton] = await Promise.all([
    "app/privacy/page.tsx",
    "app/refund/page.tsx",
    "app/page.tsx",
    "app/pricing/page.tsx",
    "components/pricing/checkout-button.tsx",
  ].map(read));
  assert.match(privacy, /Creem/);
  assert.match(privacy, /Merchant of Record/);
  assert.doesNotMatch(privacy, /Stripe/);
  assert.match(refund, /authorized payment provider or Merchant of Record/);
  assert.doesNotMatch([homepage, pricing, checkoutButton].join("\n"), /Batch generation|planned for later|coming later|coming soon/i);
});

test("the English generator uses all 15 stable style values as its visible labels", async () => {
  const expectedNames = [
    "Modern", "Scandinavian", "Japandi", "Mid-century Modern", "Industrial",
    "Bohemian", "Luxury", "French Country", "Minimalist", "Art Deco",
    "Coastal", "Farmhouse", "Mediterranean", "Contemporary", "Traditional",
  ];
  const expectedImages = [
    "/styles/modern.jpg", "/styles/scandinavian.jpg", "/styles/japandi.jpg", "/styles/mid-century-modern.jpg", "/styles/industrial.jpg",
    "/styles/bohemian.jpg", "/styles/luxury.jpg", "/styles/french-country.jpg", "/styles/minimalist.jpg", "/styles/art-deco.jpg",
    "/styles/coastal.jpg", "/styles/farmhouse.jpg", "/styles/mediterranean.jpg", "/styles/contemporary.jpg", "/styles/traditional.jpg",
  ];
  const generator = await read("components/generator/room-generator.tsx");
  const styleSource = await read("lib/site.ts");
  const chineseLabels = /现代风|斯堪的纳维亚|中世纪现代|工业风|波西米亚|奢华|法式乡村|极简主义|装饰艺术|海岸风|农舍风|地中海|当代风|传统风/;
  assert.equal(styles.length, 15);
  assert.deepEqual(styles.map((style) => style.name), expectedNames);
  assert.deepEqual(styles.map((style) => style.image), expectedImages);
  assert.doesNotMatch(`${styleSource}\n${generator}`, chineseLabels);
  assert.match(generator, /setStyle\(item\.name\)/);
  assert.match(generator, />\{item\.name\}<\/span>/);
  const styleFaq = faqs.find((faq) => faq.question === "What interior styles are supported?");
  for (const name of expectedNames) assert.match(styleFaq?.answer ?? "", new RegExp(name));
});

test("the standalone pricing CTA links to the existing homepage generator", async () => {
  const [pricing, homepage] = await Promise.all([read("app/pricing/page.tsx"), read("app/page.tsx")]);
  assert.match(homepage, /<section id="generator"/);
  assert.match(pricing, /href="\/#generator"/);
  assert.doesNotMatch(pricing, /href="\/#pricing"/);
});

test("acceptable use policy covers AI safety boundaries without fake moderation claims", async () => {
  const [acceptableUse, terms, footer, sitemap, site] = await Promise.all([
    "app/acceptable-use/page.tsx",
    "app/terms/page.tsx",
    "components/site-footer.tsx",
    "app/sitemap.ts",
    "lib/site.ts",
  ].map(read));
  assert.match(acceptableUse, /title: "Acceptable Use Policy \| RoomFacelift"/);
  assert.match(acceptableUse, /path: "\/acceptable-use"/);
  for (const section of ["Introduction", "Permitted Use", "Prohibited Content and Activities", "Image and Content Rights", "AI Safety and Abuse", "Circumvention and Automated Abuse", "Enforcement", "Changes to This Policy", "Contact"]) assert.match(acceptableUse, new RegExp(section));
  assert.match(acceptableUse, /sexually explicit content/);
  assert.match(acceptableUse, /Illegal, exploitative, hateful, abusive/);
  assert.match(acceptableUse, /necessary permission to use/);
  assert.match(acceptableUse, /bypass usage limits, credit restrictions, security controls/);
  assert.match(acceptableUse, /href="\/terms"/);
  assert.match(acceptableUse, /href="\/privacy"/);
  assert.match(acceptableUse, /siteConfig\.supportEmail/);
  assert.match(site, /support@roomfacelift\.com/);
  assert.match(terms, /Acceptable use and AI safety/);
  assert.match(terms, /illegal, sexually explicit, harmful, abusive, deceptive/);
  assert.match(terms, /href="\/acceptable-use"/);
  assert.match(footer, /href="\/acceptable-use"/);
  assert.match(sitemap, /"\/acceptable-use"/);
  assert.doesNotMatch(`${acceptableUse}\n${terms}`, /all user content is moderated|every prompt is reviewed|Creem Moderation API|guarantee no prohibited content/i);
});
