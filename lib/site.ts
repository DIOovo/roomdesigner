export const PRODUCTION_SITE_URL = "https://roomfacelift.com";

export function resolveSiteUrl(configuredUrl = process.env.NEXT_PUBLIC_SITE_URL, environment = process.env.NODE_ENV) {
  const candidate = configuredUrl?.trim().replace(/\/+$/, "");
  if (!candidate) return PRODUCTION_SITE_URL;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return PRODUCTION_SITE_URL;
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
    return environment === "production" && isLocal ? PRODUCTION_SITE_URL : candidate;
  } catch {
    return PRODUCTION_SITE_URL;
  }
}

export const siteConfig = {
  name: "RoomFacelift",
  url: resolveSiteUrl(),
  supportEmail: "support@roomfacelift.com",
  socialImagePath: "/og-image.png",
  description:
    "Turn one room photo into a smooth AI before and after redesign video. Your first preview is free and works without login.",
};

export const howToSteps = [
  { key: "upload", name: "Upload a room photo", text: "Choose a clear PNG or JPG room photo under 10MB." },
  { key: "choose", name: "Choose room type and style", text: "Select the room type and one of fifteen interior styles." },
  { key: "generate", name: "Generate a before and after video", text: "RoomFacelift creates the redesign and turns both frames into a smooth transformation video." },
] as const;

export const roomTypes = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Dining Room",
  "Office",
  "Basement",
  "Attic",
  "Study",
] as const;

export const styles = [
  { name: "Modern", labelZh: "现代风", image: "/styles/modern.jpg", alt: "Modern open-plan living room interior style preview" },
  { name: "Scandinavian", labelZh: "斯堪的纳维亚", image: "/styles/scandinavian.jpg", alt: "Scandinavian sunlit living room interior style preview" },
  { name: "Japandi", labelZh: "Japandi", image: "/styles/japandi.jpg", alt: "Japandi living room interior style preview" },
  { name: "Mid-century Modern", labelZh: "中世纪现代", image: "/styles/mid-century-modern.jpg", alt: "Mid-century modern living room interior style preview" },
  { name: "Industrial", labelZh: "工业风", image: "/styles/industrial.jpg", alt: "Industrial loft living room interior style preview" },
  { name: "Bohemian", labelZh: "波西米亚", image: "/styles/bohemian.jpg", alt: "Bohemian living room interior style preview" },
  { name: "Luxury", labelZh: "奢华", image: "/styles/luxury.jpg", alt: "Luxury marble living room interior style preview" },
  { name: "French Country", labelZh: "法式乡村", image: "/styles/french-country.jpg", alt: "French country dining room interior style preview" },
  { name: "Minimalist", labelZh: "极简主义", image: "/styles/minimalist.jpg", alt: "Minimalist living room interior style preview" },
  { name: "Art Deco", labelZh: "装饰艺术", image: "/styles/art-deco.jpg", alt: "Art Deco salon interior style preview" },
  { name: "Coastal", labelZh: "海岸风", image: "/styles/coastal.jpg", alt: "Coastal living room interior style preview" },
  { name: "Farmhouse", labelZh: "农舍风", image: "/styles/farmhouse.jpg", alt: "Farmhouse kitchen interior style preview" },
  { name: "Mediterranean", labelZh: "地中海", image: "/styles/mediterranean.jpg", alt: "Mediterranean arched living room interior style preview" },
  { name: "Contemporary", labelZh: "当代风", image: "/styles/contemporary.jpg", alt: "Contemporary living room interior style preview" },
  { name: "Traditional", labelZh: "传统风", image: "/styles/traditional.jpg", alt: "Traditional formal living room interior style preview" },
] as const;

export const samples = [
  { name: "Living room", src: "/samples/living-before.jpg" },
  { name: "Bedroom", src: "/samples/bedroom-before.jpg" },
  { name: "Kitchen", src: "/samples/kitchen-before.jpg" },
  { name: "Home office", src: "/samples/office-before.jpg" },
] as const;

export const faqs = [
  {
    question: "Is RoomFacelift AI room design free?",
    answer:
      "Yes. Your first 5-second 480p preview is available free without an account. After you sign in, you can claim one more limited free preview. Free videos include a RoomFacelift watermark and the allowance does not reset daily.",
  },
  {
    question: "Can I use AI room design without login?",
    answer:
      "You can create your first preview without an account. We ask you to sign in before the second generation to protect the free service from automated abuse.",
  },
  {
    question: "Can I redesign a room from a photo?",
    answer:
      "Upload a clear photo, choose the room type and style, and RoomFacelift creates a redesigned final frame before turning both frames into a smooth transformation video.",
  },
  {
    question: "How does AI room design work?",
    answer:
      "AI reads the visible room layout, lighting, surfaces, and furniture in your photo. RoomFacelift applies your selected style while aiming to preserve the camera view and recognizable structure.",
  },
  {
    question: "Does RoomFacelift make a video or only a static image?",
    answer:
      "RoomFacelift makes a short before and after video. The original photo smoothly transforms into the redesigned room, making the idea easier to understand and share.",
  },
  {
    question: "Can interior designers use RoomFacelift?",
    answer:
      "Yes. Interior designers can use transformation videos to compare directions and explain concepts. Commercial usage is available on eligible plans; Starter and free exports are limited to personal use.",
  },
  {
    question: "What room types are supported?",
    answer:
      "RoomFacelift supports living rooms, bedrooms, kitchens, bathrooms, dining rooms, offices, basements, attics, and studies.",
  },
  {
    question: "What interior styles are supported?",
    answer:
      "Choose from fifteen styles including Modern, Scandinavian, Japandi, Mid-century Modern, Industrial, Bohemian, Luxury, French Country, Minimalist, Art Deco, Coastal, Farmhouse, Mediterranean, Contemporary, and Traditional.",
  },
  {
    question: "Can I download my room transformation?",
    answer:
      "Yes. Completed transformations can be downloaded from the private result page. Free previews include a baked-in watermark; eligible paid exports remove it and unlock HD.",
  },
  {
    question: "Can I use generated videos commercially?",
    answer:
      "Commercial usage is included only with an eligible plan such as Pro. Free, Starter, and credit-pack-only outputs are for personal use unless a separate agreement says otherwise.",
  },
  {
    question: "What photos create the best results?",
    answer:
      "Use a well-lit JPG or PNG under 10MB. Show most of the room, keep the camera level, and avoid people or large objects blocking the space.",
  },
] as const;

export function buildStructuredData() {
  const organizationId = `${siteConfig.url}/#organization`;
  const applicationId = `${siteConfig.url}/#web-application`;
  const imageUrl = new URL(siteConfig.socialImagePath, `${siteConfig.url}/`).toString();
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "@id": applicationId,
      name: siteConfig.name,
      url: `${siteConfig.url}/`,
      image: imageUrl,
      provider: { "@id": organizationId },
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      description: siteConfig.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Limited first preview", url: `${siteConfig.url}/#pricing` },
      featureList: ["AI room design from a photo", "Before and after transformation video", "No-login first preview"],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${siteConfig.url}/#faq`,
      url: `${siteConfig.url}/`,
      mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "@id": `${siteConfig.url}/#how-to`,
      url: `${siteConfig.url}/#how-it-works`,
      name: "How to create an AI room design video",
      step: howToSteps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, name: step.name, text: step.text })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organizationId,
      name: siteConfig.name,
      url: `${siteConfig.url}/`,
      logo: imageUrl,
      image: imageUrl,
      email: siteConfig.supportEmail,
    },
  ];
}
