export const siteConfig = {
  name: "Roomorphic",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://roomorphic.com",
  description:
    "Turn one room photo into a smooth AI before and after redesign video. Your first preview is free and works without login.",
};

export const howToSteps = [
  { key: "upload", name: "Upload a room photo", text: "Choose a clear PNG or JPG room photo under 10MB." },
  { key: "choose", name: "Choose room type and style", text: "Select the room type and one of fifteen interior styles." },
  { key: "generate", name: "Generate a before and after video", text: "Roomorphic creates the redesign and turns both frames into a smooth transformation video." },
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
  { name: "Modern", image: "/styles/modern.jpg" },
  { name: "Scandinavian", image: "/styles/scandinavian.jpg" },
  { name: "Japandi", image: "/styles/japandi.jpg" },
  { name: "Mid-century Modern", image: "/styles/mid-century.jpg" },
  { name: "Industrial", image: "/styles/industrial.jpg" },
  { name: "Bohemian", image: "/styles/bohemian.jpg" },
  { name: "Luxury", image: "/styles/luxury.jpg" },
  { name: "French Country", image: "/styles/french-country.jpg" },
  { name: "Minimalist", image: "/styles/minimalist.jpg" },
  { name: "Art Deco", image: "/styles/art-deco.jpg" },
  { name: "Coastal", image: "/styles/coastal.jpg" },
  { name: "Farmhouse", image: "/styles/farmhouse.jpg" },
  { name: "Mediterranean", image: "/styles/mediterranean.jpg" },
  { name: "Contemporary", image: "/styles/contemporary.jpg" },
  { name: "Traditional", image: "/styles/traditional.jpg" },
] as const;

export const samples = [
  { name: "Living room", src: "/samples/living-before.jpg" },
  { name: "Bedroom", src: "/samples/bedroom-before.jpg" },
  { name: "Kitchen", src: "/samples/kitchen-before.jpg" },
  { name: "Home office", src: "/samples/office-before.jpg" },
] as const;

export const faqs = [
  {
    question: "Is Roomorphic AI room design free?",
    answer:
      "Yes. Your first 5-second 480p preview is available free without an account. After you sign in, you can claim one more limited free preview. Free videos include a Roomorphic watermark and the allowance does not reset daily.",
  },
  {
    question: "Can I use AI room design without login?",
    answer:
      "You can create your first preview without an account. We ask you to sign in before the second generation to protect the free service from automated abuse.",
  },
  {
    question: "Can I redesign a room from a photo?",
    answer:
      "Upload a clear photo, choose the room type and style, and Roomorphic creates a redesigned final frame before turning both frames into a smooth transformation video.",
  },
  {
    question: "How does AI room design work?",
    answer:
      "AI reads the visible room layout, lighting, surfaces, and furniture in your photo. Roomorphic applies your selected style while aiming to preserve the camera view and recognizable structure.",
  },
  {
    question: "Does Roomorphic make a video or only a static image?",
    answer:
      "Roomorphic makes a short before and after video. The original photo smoothly transforms into the redesigned room, making the idea easier to understand and share.",
  },
  {
    question: "Can interior designers use Roomorphic?",
    answer:
      "Yes. Interior designers can use transformation videos to compare directions and explain concepts. Commercial usage is available on eligible plans; Starter and free exports are limited to personal use.",
  },
  {
    question: "What room types are supported?",
    answer:
      "Roomorphic supports living rooms, bedrooms, kitchens, bathrooms, dining rooms, offices, basements, attics, and studies.",
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
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: siteConfig.name,
      url: siteConfig.url,
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      description: siteConfig.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Limited first preview" },
      featureList: ["AI room design from a photo", "Before and after transformation video", "No-login first preview"],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to create an AI room design video",
      step: howToSteps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, name: step.name, text: step.text })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  ];
}
