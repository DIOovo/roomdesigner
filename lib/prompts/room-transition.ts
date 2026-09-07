export function buildRoomTransitionPrompt(roomType: string, style: string) {
  return [
    "STATIC LOCKED CAMERA. Create one continuous, direct transformation from the exact provided first frame to the exact provided final frame.",
    "The supplied final image is the only allowed target design; do not create, explore, or temporarily show a third interior design, and do not independently redesign the room.",
    `Keep it the same ${roomType.toLowerCase()} throughout — do not change the room type. The final image already reflects the desired ${style} design, so only transition toward that supplied final image.`,
    "Every intermediate moment must become progressively closer to the final image and must not move away from the target design once the transformation begins.",
    "Objects that exist in both endpoints transform directly toward their final counterparts; objects absent from the final image should gradually fade out or be removed; objects present only in the final image should gradually appear.",
    "Never introduce temporary furniture, cabinetry, rugs, wall art, decorations, lighting fixtures, windows, doors, or architectural elements that exist in neither endpoint.",
    "Preserve the camera position, perspective, field of view, crop, room geometry, walls, windows, doors, and visible scene coverage.",
    "No camera movement, zoom, pan, tilt, rotation, reframing, or dolly movement, and no people, text, logos, watermarks, or sudden cuts.",
    "The final frames must converge toward the supplied end image.",
  ].join(" ");
}
