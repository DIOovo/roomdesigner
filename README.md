# RoomFacelift

RoomFacelift is an AI room design tool that turns one room photo into a smooth before and after transformation video.

Production domain: `https://roomfacelift.com`

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Generation modes

### Local Demo

```env
VIDEO_PROVIDER=mock
AFTER_IMAGE_PROVIDER=mock
```

No API keys are required. The app creates an asynchronous mock job, exposes the same polling stages as production, and returns the bundled 3-second watermarked demonstration video.

### Real H3 Test

```env
VIDEO_PROVIDER=fal-h3-max
AFTER_IMAGE_PROVIDER=mock
FAL_KEY=...
FAL_H3_MODEL=minimax/h3-max/image-to-video
FAL_H3_PROMPT_EXPANSION=balanced
NEXT_PUBLIC_SITE_URL=https://roomfacelift.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
WATERMARK_SERVICE_URL=...
WATERMARK_SERVICE_TOKEN=...
ANON_COOKIE_SECRET=...
```

This is the first real verification path. RoomFacelift persists the uploaded Before frame, uses an included After frame, submits both frames to the fal H3 Max queue, and produces a 5-second 480P transformation video.

### Full AI Pipeline

```env
VIDEO_PROVIDER=fal-h3-max
AFTER_IMAGE_PROVIDER=remote
FAL_KEY=...
AFTER_IMAGE_API_URL=...
AFTER_IMAGE_API_KEY=...
```

The remote After Image API receives `firstFrame`, `roomType`, `style`, and a geometry-preserving prompt. Its response must contain `{ "imageUrl": "https://..." }`.

Real free exports also require `WATERMARK_SERVICE_URL` and `WATERMARK_SERVICE_TOKEN`. The pipeline refuses to expose the raw fal video when baked watermarking is not configured.

For local watermark integration, start the sibling `roomfacelift-watermark` service and configure:

```env
WATERMARK_SERVICE_URL=http://localhost:3001/watermark
WATERMARK_SERVICE_TOKEN=<same token used by the watermark service>
```

The main app sends `{ videoUrl, text: "Made with RoomFacelift", position: "bottom-right" }` with bearer authentication, downloads the returned temporary MP4, and persists it to private Supabase Storage. The free real-generation path remains fail-closed when either watermark variable is missing.

## Production integrations

1. Create a Supabase project, run migrations `001` through `004` in filename order, then configure the URL, anon key, and service role key. Both `generation-inputs` and `generation-results` are private; only server-issued signed URLs provide temporary access.
2. Payment provider selection is pending. Existing Stripe test code remains available but checkout stays disabled unless `NEXT_PUBLIC_CHECKOUT_ENABLED=true` is set after end-to-end validation.
3. Set `VIDEO_PROVIDER=fal-h3-max`, provide `FAL_KEY`, and set the deployed site URL. Local sample frames are uploaded through fal storage automatically when localhost is not publicly reachable.
4. Keep `AFTER_IMAGE_PROVIDER=mock` for the first H3 Max validation, then configure the remote after-frame service when available.
5. Configure a server-side watermark service before allowing free production exports. The real-provider path refuses unwatermarked free downloads.
6. Add GA4, Meta Pixel, and AdSense IDs only after consent and privacy configuration are finalized.

Real-provider requests validate their server configuration before creating a billable job. Free real jobs fail closed when baked watermarking is unavailable. Provider assets are downloaded with timeouts, MIME validation, and hard byte limits before being persisted to private RoomFacelift storage.

## Cloudflare

The project uses OpenNext for Cloudflare Workers:

```bash
npm run preview
npm run deploy
```

Never commit `.env.local` or secret values.

## SEO, analytics, and ads

Public metadata, canonical URLs, sitemap entries, robots rules, and structured data use `NEXT_PUBLIC_SITE_URL`; production must set it to `https://roomfacelift.com`. Optional integrations use `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, and `NEXT_PUBLIC_ADSENSE_CLIENT_ID`. Missing IDs are safe no-ops, and configured scripts load only after the visitor accepts analytics consent.

Blog pages can reserve non-blocking ad placements. The homepage generator contains no ad placement. Private result pages remain `noindex, nofollow`; a future public-share result must use an explicit public token or public copy rather than exposing signed private assets.

See [the SEO route audit](docs/seo-route-audit.md), [keyword map](docs/seo-keyword-map.md), and [launch checklist](docs/launch-checklist.md) before production deployment.

## Auth, credits, and entitlements

Supabase Email + Password Auth is available at `/login` and `/signup`. Add the deployed `/auth/callback` URL to the Supabase Auth redirect allow-list when email confirmation is enabled.

Generation credits use a database-backed reserve/commit/release flow:

```text
entitlement check → atomic reservation → generation → commit on success
                                             └──────→ release on failure
```

The first anonymous preview is tracked with the signed anonymous identity. After signup or login, `/api/auth/claim` attaches that usage and its private generation jobs to the authenticated account. Free credits are consumed before subscription credits, then credit-pack credits; grants of the same source expire earliest-first.

Stripe should send `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid` to `/api/stripe/webhook`. Subscription period grants expire at the billing-period end, and one-time credit packs expire after one year.
