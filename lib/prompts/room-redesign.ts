export function buildRoomRedesignPrompt(roomType: string, style: string) {
  return [
    `Redesign this ${roomType.toLowerCase()} in a refined ${style} interior style.`,
    "Preserve the exact room geometry, camera angle, perspective, walls, windows, doors, ceiling, and floor boundaries.",
    "Change only furniture, materials, lighting fixtures, decor, colors, surface finishes, and textiles.",
    "Keep every architectural opening in the same position and maintain realistic scale, lighting, and shadows.",
    "No people, text, logos, watermarks, camera relocation, structural additions, or major architectural hallucinations.",
  ].join(" ");
}
