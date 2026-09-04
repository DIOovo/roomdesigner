import type { AfterFrameProvider, GenerateAfterFrameInput } from "../types";

export class MockAfterFrameProvider implements AfterFrameProvider {
  readonly name = "mock";
  async generate(input: GenerateAfterFrameInput) {
    const room = input.roomType.toLowerCase();
    let path = "/samples/living-after.jpg";
    if (room.includes("bed")) path = "/samples/bedroom-after.jpg";
    if (room.includes("kitchen")) path = "/samples/kitchen-after.jpg";
    if (room.includes("office") || room.includes("study")) path = "/samples/office-after.jpg";
    return { imageUrl: absoluteUrl(path), provider: this.name };
  }
}

function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}
