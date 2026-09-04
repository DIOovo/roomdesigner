import { MockAfterFrameProvider } from "./providers/mock";
import { RemoteAfterFrameProvider } from "./providers/remote";
import type { AfterFrameProvider, GenerateAfterFrameInput } from "./types";

const factories: Record<string, () => AfterFrameProvider> = {
  mock: () => new MockAfterFrameProvider(),
  remote: () => new RemoteAfterFrameProvider(),
};

export async function generateAfterFrame(input: GenerateAfterFrameInput) {
  const name = process.env.AFTER_IMAGE_PROVIDER ?? "mock";
  const factory = factories[name];
  if (!factory) throw new Error(`Unsupported AFTER_IMAGE_PROVIDER: ${name}`);
  return factory().generate(input);
}
