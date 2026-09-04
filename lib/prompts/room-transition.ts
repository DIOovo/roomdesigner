export function buildRoomTransitionPrompt(roomType: string, style: string) {
  return [
    `A smooth physical transformation of the same ${roomType.toLowerCase()} into a refined ${style} interior.`,
    "Use a completely static camera and preserve the exact room geometry, perspective, walls, windows, doors, and floor lines.",
    "Furniture, colors, materials, finishes, decor, and lighting transition naturally and continuously into the final design.",
    "No camera movement, people, text, logos, watermarks, sudden cuts, scene changes, or new architectural openings.",
  ].join(" ");
}
