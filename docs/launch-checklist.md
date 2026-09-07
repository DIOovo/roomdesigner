# RoomFacelift launch checklist

## Infrastructure

- [ ] **BLOCKED / NOT TESTED:** Point `roomorphic.com` DNS to the production Cloudflare deployment.
- [ ] **BLOCKED / NOT TESTED:** Confirm production HTTPS and redirects.
- [ ] **BLOCKED / NOT TESTED:** Configure Cloudflare secrets from `.env.example`.
- [ ] **BLOCKED / NOT TESTED:** Run Supabase migrations `001` through `004` against production.
- [ ] **BLOCKED / NOT TESTED:** Validate Supabase Auth redirect URLs, RLS, private storage, signed URLs, and credit RPCs.
- [ ] **BLOCKED / NOT TESTED:** Run a real fal H3 Max first-frame and last-frame generation.
- [ ] **BLOCKED / NOT TESTED:** Validate the real After Image provider.
- [ ] **BLOCKED / NOT TESTED:** Validate baked watermark output and failure handling.

## SEO and growth

- [x] Production canonical URLs use `https://roomorphic.com`.
- [x] Homepage, public pages, and articles have distinct metadata.
- [x] Sitemap excludes auth, account, API, and private result routes.
- [x] Robots rules allow public content and block private or utility routes.
- [x] WebApplication, FAQPage, HowTo, and Organization JSON-LD share production data.
- [x] Blog index, articles, internal links, related articles, and tool CTAs render on the server.
- [x] GA4, Meta Pixel, and AdSense are environment-driven and consent-gated.
- [ ] Add production GA4, Meta Pixel, and AdSense IDs after property approval.
- [ ] Submit sitemap to Google Search Console after deployment.

## Commercial and launch QA

- [ ] **Pending provider decision:** choose Stripe, Creem, Paddle, or another payment provider in a separate Payment Gateway phase.
- [ ] Enable checkout only after the selected production payment flow passes end-to-end testing.
- [ ] Replace provisional retention language in the Privacy Policy with the approved production policy.
- [ ] Run the production smoke test: upload, generation, private result, download, auth, credit release, analytics consent, and mobile layout.
- [ ] Confirm support mailbox monitoring and legal review before public launch.
