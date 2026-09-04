export const posts = [
  {
    slug: "ai-room-design",
    title: "AI Room Design: A Practical Guide for Better Results",
    description: "Learn how AI room design works, which photos produce the best results, and how to turn concepts into clear renovation decisions.",
    keyword: "ai room design",
    date: "2026-08-28",
    intro: "AI room design helps you test a visual direction before buying furniture, preparing a listing, or presenting a client concept.",
    sections: [
      { title: "What AI room design can do", body: "A room design model reads the visible geometry, surfaces, lighting, and furniture in a photo. It then creates a new design that keeps the room recognizable while changing the visual language." },
      { title: "How the workflow fits together", body: "Start with one clear photo, choose the room type, and select a focused interior style. Roomorphic creates an after frame and then uses the original and redesign as endpoints for a short transformation video." },
      { title: "Start with a useful source photo", body: "Use natural light, keep the camera level, and show as much of the room as possible. Avoid people and large foreground objects. A clean source photo gives the model more reliable spatial information." },
      { title: "Why a video is easier to evaluate", body: "A final image can look impressive without showing how it relates to the original space. A transformation video makes the relationship explicit, which helps homeowners and clients follow the idea." },
      { title: "Useful ways to compare concepts", body: "Generate one clear style at a time and compare a small number of distinct directions. Look at the room structure, circulation, materials, and overall mood rather than judging only decorative details." },
      { title: "Understand the limitations", body: "AI concepts are visual planning aids, not construction drawings. Check measurements, building codes, structural changes, product availability, and professional advice before committing to renovation work." },
    ],
  },
  {
    slug: "ai-room-design-from-photo",
    title: "How to Create AI Room Design From a Photo",
    description: "A step-by-step guide to creating an AI room design from a photo, choosing a style, and reviewing the final transformation video.",
    keyword: "ai room design from photo",
    date: "2026-08-30",
    intro: "One clear room photo is enough to explore new materials, furniture layouts, and interior styles with AI.",
    sections: [
      { title: "What you need before you begin", body: "Use a JPG or PNG under 10MB. A phone photo is suitable when it is sharp, level, well lit, and wide enough to show the walls, floor, openings, and main furniture." },
      { title: "Frame the whole room", body: "Stand near a corner or doorway and include the main walls, floor, and windows. Wide coverage helps preserve the architecture and camera perspective in the redesign." },
      { title: "Choose one clear style", body: "A focused direction such as Japandi, Scandinavian, or Art Deco is more reliable than combining several unrelated styles. Generate alternatives separately and compare them." },
      { title: "Generate the before and after transition", body: "Roomorphic first prepares a redesigned after frame. It then generates a short video between the uploaded photo and that new frame, making the relationship between the two views visible." },
      { title: "Review continuity, not only beauty", body: "Check windows, doors, floor lines, and major furniture placement. A strong result should feel like the same room after a redesign, not a different property." },
      { title: "Improve a weak result", body: "Try a clearer source photo or a more focused style before changing many inputs at once. AI output can contain visual errors, so treat each result as a concept and verify practical details separately." },
    ],
  },
  {
    slug: "interior-design-ai-video",
    title: "Interior Design AI Video for Client Presentations",
    description: "See how interior designers, remodelers, and real estate teams can use AI transformation video in proposals and property marketing.",
    keyword: "interior design AI video",
    date: "2026-09-01",
    intro: "A short before and after video communicates a design direction faster than a static mood board or a disconnected final render.",
    sections: [
      { title: "Make the concept easy to follow", body: "The original room stays visible as the redesign appears. Clients can immediately understand which surfaces, furniture, and mood are changing." },
      { title: "Use video at the right stage", body: "Transformation videos work best during early direction setting, property marketing, and proposal conversations. They complement mood boards, plans, specifications, and measured drawings rather than replacing them." },
      { title: "Use commercial rights correctly", body: "Roomorphic Pro includes commercial use for proposals, listings, and client-facing marketing. Starter exports remain for personal use only." },
      { title: "Generate focused alternatives", body: "Create one video per design direction. A small set of distinct options is easier to review than a large gallery of near-identical images." },
      { title: "Present the result clearly", body: "Explain that the video is an AI concept, name the selected style, and pair it with the project goals. Avoid presenting generated furniture, materials, or dimensions as confirmed specifications." },
      { title: "Protect client material", body: "Use only photos you have permission to process. Keep private result links within the project team and avoid sharing signed asset URLs outside the Roomorphic result experience." },
    ],
  },
] as const;

export function getPost(slug: string) { return posts.find((post) => post.slug === slug); }
