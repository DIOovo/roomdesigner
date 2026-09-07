export type DesignScope = "keep-layout" | "reimagine-space";

type RoomTypeRule = {
  label: string;
  identity: string;
  constraints: string[];
};

/**
 * Hard per-room-type constraints. The `identity` line forces the model to keep
 * the current room type, and `constraints` forbid it from drifting into a
 * different room. Keys match the room type names passed in from `lib/site.ts`.
 */
export const ROOM_TYPE_RULES: Record<string, RoomTypeRule> = {
  "living room": {
    label: "living room",
    identity: "This is a living room. The output must remain the same living room.",
    constraints: [
      "Do not change the room type.",
      "Do not turn this into a bedroom, kitchen, dining room, office, bathroom, or any other room type.",
      "Do not introduce a bed as the primary focal furniture.",
    ],
  },
  bedroom: {
    label: "bedroom",
    identity: "This is a bedroom. The output must remain the same bedroom.",
    constraints: [
      "Do not change the room type.",
      "Never convert it into a living room, office, kitchen, dining room, bathroom, or another room type.",
      "Keep it clearly a bedroom and do not replace the bed with a sofa as the primary function.",
    ],
  },
  kitchen: {
    label: "kitchen",
    identity: "This is a kitchen. The output must remain the same kitchen.",
    constraints: [
      "Do not change the room type.",
      "Do not turn it into a living room, bedroom, dining room, or any other room type.",
      "Keep the kitchen functional and preserve major kitchen work zones where visible.",
      "Keep counters, cabinets, and the kitchen layout logically consistent, and do not remove all cabinetry or counters.",
      "Avoid implausible structural relocation of the kitchen.",
    ],
  },
  bathroom: {
    label: "bathroom",
    identity: "This is a bathroom. The output must remain the same bathroom.",
    constraints: [
      "Do not transform it into a bedroom, living room, or any other room type.",
      "Keep it clearly a bathroom and preserve its existing fixtures and layout.",
      "Preserve the major wet-area logic (sink, toilet, and shower or bath) in a plausible layout.",
      "Avoid implausibly large openings or giant windows that do not fit a bathroom.",
    ],
  },
  "dining room": {
    label: "dining room",
    identity: "This is a dining room. The output must remain the same dining room.",
    constraints: [
      "Do not turn it into a living room, bedroom, kitchen, office, or any other room type.",
      "Keep the dining function and do not remove the table as the primary focal furniture.",
    ],
  },
  office: {
    label: "office",
    identity: "This is an office. The output must remain the same office.",
    constraints: [
      "Do not convert it into a bedroom or living room.",
      "Keep it clearly an office / study and preserve the workspace function.",
    ],
  },
  basement: {
    label: "basement",
    identity: "This is a basement. The output must remain the same basement.",
    constraints: [
      "Do not reposition the walls, ceiling, or structural columns.",
      "Do not turn it into another room type.",
    ],
  },
  attic: {
    label: "attic",
    identity: "This is an attic. The output must remain the same attic.",
    constraints: [
      "Preserve the sloping ceilings, exposed structure, and existing window openings.",
      "Do not turn it into another room type.",
    ],
  },
  study: {
    label: "study",
    identity: "This is a study. The output must remain the same study.",
    constraints: [
      "Do not convert it into a bedroom or living room.",
      "Keep it clearly a study / workspace.",
    ],
  },
};

/**
 * A style recipe describes what a style is (positive identity across several
 * interior-design dimensions) and what it must NOT become (anti-style), so the
 * model stops collapsing every preset into the same warm-neutral safe aesthetic.
 * Keys match the `styles` names in `lib/site.ts`. Single source of truth.
 */
export type StyleRecipe = {
  palette: string;
  materials: string;
  furniture: string;
  lighting: string;
  decor: string;
  avoid: string;
};

export const STYLE_RULES: Record<string, StyleRecipe> = {
  "Modern": {
    palette: "clean neutrals — white, charcoal, and warm grey",
    materials: "glass, smooth wood, stone, and matte metal",
    furniture: "clean straight lines and restrained silhouettes",
    lighting: "minimal modern fixtures",
    decor: "large simple artwork and controlled accessories",
    avoid: "rustic Farmhouse, Bohemian layering, ornate Traditional details, and Mediterranean rusticity",
  },
  "Scandinavian": {
    palette: "white, warm grey, and pale beige",
    materials: "pale oak, pale ash wood, wool, and linen",
    furniture: "light visual weight, simple functional Nordic forms, and tapered legs",
    lighting: "soft simple lighting",
    decor: "minimal objects, small greenery, and cozy restrained textiles",
    avoid: "terracotta-heavy Mediterranean design, dark Industrial metal, Art Deco glamour, luxury marble/brass, and ornate Traditional furniture",
  },
  "Japandi": {
    palette: "muted earth tones, off-white, taupe, and soft brown",
    materials: "light-to-medium natural wood, linen, ceramic, and natural fibers",
    furniture: "low-profile, simple, quiet organic silhouettes",
    lighting: "soft, low, natural lighting",
    decor: "very restrained, handcrafted ceramics, and minimal greenery",
    avoid: "busy Bohemian patterns, high-gloss Luxury, industrial black-metal dominance, and bright Coastal styling; make Japandi darker, calmer, more earthy, and more minimal than Scandinavian",
  },
  "Mid-century Modern": {
    palette: "walnut, mustard, olive, teal, and cream",
    materials: "walnut / teak, leather, and brass accents",
    furniture: "tapered legs, organic 1950s/60s silhouettes, and low-profile seating",
    lighting: "iconic sculptural mid-century fixtures",
    decor: "retro geometric artwork",
    avoid: "generic beige Contemporary, Scandinavian pale minimalism, and Farmhouse rustic furniture",
  },
  "Industrial": {
    palette: "charcoal, black, brown, and concrete grey",
    materials: "blackened metal, dark wood, concrete, and leather",
    furniture: "strong utilitarian silhouettes",
    lighting: "metal pendant, track, or exposed-inspired fixtures",
    decor: "graphic or raw-material accents",
    avoid: "pale Scandinavian wood, soft Mediterranean styling, romantic French Country, and luxury polished marble; do NOT change architecture to exposed brick if that requires inventing structural walls — Industrial identity must come from finishes, furniture, materials, lighting, and decor",
  },
  "Bohemian": {
    palette: "warm earthy mixed colors — terracotta, ochre, and deep green",
    materials: "rattan, wicker, wood, and woven textiles",
    furniture: "a relaxed eclectic mix",
    lighting: "warm decorative lighting",
    decor: "layered rugs, plants, patterned cushions, and artistic objects",
    avoid: "minimal Scandinavian emptiness, monochrome Contemporary, and formal Traditional symmetry",
  },
  "Luxury": {
    palette: "cream, deep neutrals, and emerald / navy accents",
    materials: "marble, brass, velvet, and polished dark wood",
    furniture: "substantial elegant silhouettes",
    lighting: "statement sculptural lighting",
    decor: "refined large-format artwork and premium accessories",
    avoid: "rustic Farmhouse, raw Industrial, casual Bohemian, and plain Scandinavian minimalism",
  },
  "French Country": {
    palette: "warm cream, soft beige, muted blue, and sage",
    materials: "aged wood, linen, soft cotton, and subtle distressed finishes",
    furniture: "classic curved forms and comfortable traditional pieces",
    lighting: "soft traditional fixtures",
    decor: "subtle florals, ceramics, and rustic romantic accents",
    avoid: "ultra-modern black furniture, Industrial metal, Art Deco glamour, and minimalist sterility",
  },
  "Minimalist": {
    palette: "white, off-white, soft grey, and very restrained accents",
    materials: "simple smooth wood and matte surfaces",
    furniture: "a few pieces with very clean silhouettes",
    lighting: "quiet integrated-looking fixtures",
    decor: "extremely limited",
    avoid: "Bohemian layering, Traditional ornament, Art Deco decoration, and Mediterranean richness; note that Minimalist does NOT mean returning almost the same room — furniture and materials can still be substantially redesigned but the result should remain visually sparse",
  },
  "Art Deco": {
    palette: "black, cream, emerald, navy, and jewel tones",
    materials: "brass / gold, velvet, dark polished wood, and mirrored / gloss accents",
    furniture: "bold geometric and elegant forms",
    lighting: "statement glamorous fixtures",
    decor: "strong geometric artwork, symmetry, and luxurious accents",
    avoid: "Scandinavian pale simplicity, Farmhouse rustic wood, Mediterranean casual natural styling, and generic beige contemporary",
  },
  "Coastal": {
    palette: "white, sand, soft blue, and sea-glass tones",
    materials: "light weathered wood, linen, and natural woven fibers",
    furniture: "relaxed light silhouettes",
    lighting: "natural, airy fixtures",
    decor: "subtle coastal textures and woven accents",
    avoid: "dark Industrial styling, heavy Traditional furniture, Art Deco glamour, and terracotta Mediterranean dominance; do not add literal nautical clichés unless subtle",
  },
  "Farmhouse": {
    palette: "warm white, cream, and soft greige",
    materials: "rustic wood, reclaimed-wood appearance, linen, and woven textures",
    furniture: "comfortable substantial rustic pieces",
    lighting: "simple farmhouse-inspired fixtures",
    decor: "cozy practical accessories",
    avoid: "high-gloss Luxury, Art Deco geometry, Industrial black-metal dominance, and ultra-clean Contemporary styling; do not invent structural beams or change architecture",
  },
  "Mediterranean": {
    palette: "warm ivory, sand, terracotta, and olive",
    materials: "limewash / textured plaster feel, travertine, warm stone, aged warm wood, and natural linen",
    furniture: "organic rounded silhouettes, warm substantial wood, and relaxed natural forms",
    lighting: "warm sculptural natural-material lighting",
    decor: "ceramics, woven textures, earthy artwork, and olive / terracotta accents",
    avoid: "Scandinavian pale-oak minimalism, generic grey-beige Contemporary, black-and-white geometric art, cold monochrome styling, and ultra-minimal Nordic furniture; do NOT create arched windows, arched doors, new wall openings, or structural Mediterranean architecture — Mediterranean identity must come only from materials, color, furniture, lighting, textiles, and decor",
  },
  "Contemporary": {
    palette: "a refined neutral base with controlled darker contrasts",
    materials: "stone, wood, metal, and textured fabrics",
    furniture: "clean but sculptural, larger confident forms, and low-profile modern furniture",
    lighting: "a statement contemporary fixture or layered modern lighting",
    decor: "large-scale modern artwork and fewer but more intentional objects",
    avoid: "Scandinavian pale-oak simplicity, rustic Mediterranean styling, retro Mid-century silhouettes, and Industrial rawness; Contemporary should feel more polished, architectural, and sculptural than Scandinavian",
  },
  "Traditional": {
    palette: "warm neutrals, deep wood, and muted rich tones",
    materials: "rich wood, classic textiles, and subtle patterned fabrics",
    furniture: "classic substantial silhouettes in a balanced arrangement",
    lighting: "classic elegant fixtures",
    decor: "layered artwork, refined accessories, and coordinated symmetry",
    avoid: "ultra-minimal Modern, raw Industrial, Bohemian eclecticism, and Scandinavian light simplicity",
  },
};

/** Flattens a style recipe into a single prompt sentence block. */
function renderStyleRecipe(styleLabel: string, recipe: StyleRecipe): string {
  return [
    `${styleLabel} identity — palette: ${recipe.palette}.`,
    `Materials: ${recipe.materials}.`,
    `Furniture: ${recipe.furniture}.`,
    `Lighting: ${recipe.lighting}.`,
    `Decor: ${recipe.decor}.`,
    `AVOID diluting this style into: ${recipe.avoid}.`,
  ].join(" ");
}

/**
 * Global style strength: keep every preset visually distinct instead of letting
 * the model fall back to a generic warm-neutral contemporary interior.
 */
const STYLE_STRENGTH_BLOCK = [
  "The requested style must be visually unmistakable: do not default to a generic warm-neutral contemporary interior, and make the final room visually distinguishable from the other RoomFacelift style presets without reading the style label.",
  "Express the target style across multiple major design dimensions — at least several of color palette, furniture, materials, lighting, textiles, and decor / artwork should visibly reflect the selected style.",
  "Do not satisfy the style by changing only one rug, one table, or a few small decorative objects.",
];

const SAME_ROOM_BLOCK = [
  "This is a photorealistic interior renovation of the exact same room shown in the input photo — the same physical space, not a new room.",
  "The output must remain the exact same room type as the input.",
];

/**
 * Viewpoint/composition lock applies to both design scopes. Reimagine-space may
 * change the interior more freely, but never by moving the camera.
 */
const VIEWPOINT_LOCK_BLOCK = [
  "The same room, from the same viewpoint, redesigned — not a redesigned room from a new angle.",
  "Keep the same camera viewpoint: preserve the camera viewpoint, camera position, camera height, camera angle, and perspective exactly as in the input image.",
  "Preserve the framing exactly as in the input image.",
  "Preserve the crop and field of view exactly as in the input image.",
  "Preserve the visible room boundaries and the same visible scene coverage.",
  "Do not zoom in, zoom out, pan, tilt, rotate, or reframe the camera.",
  "Do not crop away areas visible in the original image, and do not reveal substantially new areas by changing the viewpoint.",
  "This image will be used as the end frame of a before-and-after transition video, so the before and after should align closely if overlaid for a smooth transition.",
];

const KEEP_SCOPE_DECLARATION = "Design scope: keep the existing layout — the same room, redesigned.";
const REIMAGINE_SCOPE_DECLARATION = "Design scope: reimagine the space — allow larger design changes for conceptual inspiration.";

const KEEP_GEOMETRY_BLOCK = [
  "Preserve the exact same room geometry, dimensions, and apparent floor area.",
  "Preserve the room proportions: keep every wall in the same position and preserve the ceiling shape and height, corner relationships, and room depth.",
  "Do not enlarge, widen, stretch, extend, or add any new space.",
  "Keep the footprint and visible floor area identical.",
];

const REIMAGINE_GEOMETRY_BLOCK = [
  "Keep the same overall room proportions and general room identity; you may adjust individual elements but do not turn it into a completely different room.",
];

const KEEP_ARCHITECTURE_BLOCK = [
  "Keep every door, window, and opening at the same count, position, size, and shape.",
  "Do not add, remove, or move any door, window, or opening, and do not invent new openings.",
  "Preserve major fixed architectural elements and do not remove structural features.",
  "If the original room has a visible feature wall, fireplace, or fixed built-ins, you may change their surface material and finishing, but do not remove them without reason and replace them with a completely different architectural structure.",
];

const KEEP_BOLD_REDESIGN_BLOCK = [
  "Keep the architecture fixed, but redesign the interior boldly: the renovation must feel clearly and substantially transformed, not a minimal edit of the original room.",
  "Change multiple interior design dimensions at once — furniture, materials, lighting, textiles, decor, and the color palette — so the result shows coordinated changes across several major dimensions rather than isolated cosmetic tweaks.",
  "Do not return a minimally edited version of the original room, and do not satisfy the redesign by changing only one or two small decorative items.",
  "A viewer should immediately recognize the requested interior style from the result without reading a style label.",
  "Keep the overall functional furniture layout and main spatial relationships, but freely replace the sofa, coffee table, rug, lamps, and movable furniture; do not move the sofa to another wall, move the TV to another wall, change the main circulation, or change the camera composition.",
  "Keep major fixed anchors (such as a wall-mounted TV) at the same wall and position, but redesign the furniture around them — for example, replace the console below the TV with a new one.",
];

const KEEP_ALLOWED_BLOCK = [
  "Freely redesign these interior elements: furniture and replacement furniture, sofa, chairs, coffee and side tables, TV console, movable furniture, rugs, curtains, wall finishes, paint colors, decorative wall treatments, lighting fixtures and lamps, wall art, accessories, textiles, cushions, plants, shelving appearance, furniture materials, wood tone, stone / plaster / metal finishes, and the overall color palette.",
];

const REIMAGINE_ALLOWED_BLOCK = [
  "You may redesign built-ins, create stronger feature-wall changes, introduce new cabinetry concepts, apply larger decorative treatments, restyle window treatments, and propose more substantial interior architecture concepts.",
];

const KEEP_NEGATIVE_BLOCK = [
  "Do not change the room type, enlarge or extend the room, invent openings, or remove structural features.",
  "Do not replace ordinary windows with floor-to-ceiling windows.",
];

const REIMAGINE_NEGATIVE_BLOCK = [
  "Do not change the room type or turn it into a completely different room.",
];

const VIEWPOINT_NEGATIVE_BLOCK = [
  "Do not move the camera to another corner, switch to a wider-angle view, or switch to a tighter view.",
  "Do not change the composition.",
  "Do not crop out visible walls, windows, doors, floor area, or major visible furniture zones.",
  "Do not redesign unseen space by changing the framing.",
];

const KEEP_FINAL_BLOCK = [
  "Produce a photorealistic, professional after-renovation photo of the same room under the same camera framing.",
  "The before and after images should remain closely aligned; if overlaid, the two images should match in structure and framing.",
];

const REIMAGINE_FINAL_BLOCK = [
  "Produce a photorealistic, professional interior design render that stays recognizably the same room as the input.",
  "This mode is intended for conceptual inspiration rather than strict renovation fidelity.",
];

const DEFAULT_RULE = ROOM_TYPE_RULES["living room"]!;

export function buildRoomRedesignPrompt(roomType: string, style: string, designScope: DesignScope = "keep-layout") {
  const rule = ROOM_TYPE_RULES[roomType.trim().toLowerCase()] ?? DEFAULT_RULE;
  const styleKey = style.trim();
  const styledLabel = styleKey || "refined";
  const recipe = STYLE_RULES[styleKey];
  const styleGuidance = recipe ? renderStyleRecipe(styleKey, recipe) : "";
  const isReimagine = designScope === "reimagine-space";

  return [
    ...SAME_ROOM_BLOCK,
    ...VIEWPOINT_LOCK_BLOCK,
    isReimagine ? REIMAGINE_SCOPE_DECLARATION : KEEP_SCOPE_DECLARATION,
    rule.identity,
    ...rule.constraints,
    ...(isReimagine ? REIMAGINE_GEOMETRY_BLOCK : KEEP_GEOMETRY_BLOCK),
    ...(isReimagine ? [] : KEEP_ARCHITECTURE_BLOCK),
    ...(isReimagine ? [] : KEEP_BOLD_REDESIGN_BLOCK),
    ...(isReimagine ? REIMAGINE_ALLOWED_BLOCK : KEEP_ALLOWED_BLOCK),
    `Apply the selected "${styledLabel}" interior style while respecting every constraint above.`,
    styleGuidance,
    ...(isReimagine ? [] : STYLE_STRENGTH_BLOCK),
    ...(isReimagine ? REIMAGINE_FINAL_BLOCK : KEEP_FINAL_BLOCK),
    ...VIEWPOINT_NEGATIVE_BLOCK,
    ...(isReimagine ? REIMAGINE_NEGATIVE_BLOCK : KEEP_NEGATIVE_BLOCK),
  ].filter(Boolean).join(" ");
}