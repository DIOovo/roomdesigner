# SEO route audit

Production origin: `https://roomorphic.com`

| Route | Indexing | Canonical | Notes |
| --- | --- | --- | --- |
| `/` | index | `/` | Primary generator and `ai room design free` landing page |
| `/pricing` | index | `/pricing` | Provider-neutral plan information |
| `/about` | index | `/about` | Product and audience information |
| `/contact` | index | `/contact` | Support and commercial inquiries |
| `/privacy` | index | `/privacy` | Privacy, consent, and data processing |
| `/terms` | index | `/terms` | Usage and commercial-license terms |
| `/blog` | index | `/blog` | Static blog index |
| `/blog/ai-room-design` | index | same route | Supporting guide |
| `/blog/ai-room-design-from-photo` | index | same route | Dedicated photo workflow article |
| `/blog/interior-design-ai-video` | index | same route | Professional video use article |
| `/login` | noindex | none | Authentication utility page |
| `/signup` | noindex | none | Authentication utility page |
| `/account` | noindex | none | Private account page |
| `/auth/callback` | blocked | none | Authentication handler, not a content page |
| `/result/*` | noindex, nofollow | none | Private generation result; excluded from sitemap |
| `/api/*` | blocked | none | API routes |

Private results may include a temporary signed video in Open Graph metadata for the authorized viewer. A future public-share feature must use an explicit public share token and a purpose-built public copy. It must not expose the private bucket or raw provider URL.
