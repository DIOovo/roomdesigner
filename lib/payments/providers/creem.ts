import "server-only";
import { createHash } from "node:crypto";

const CREEM_API_BASES = {
  test: "https://test-api.creem.io",
  production: "https://api.creem.io",
} as const;

export type CreemCheckout = { id: string; checkoutUrl: string; requestId: string };

export function createCheckoutRequestId(userId: string, productKey: string, now = Date.now()) {
  const window = Math.floor(now / 300_000);
  return `rf_${createHash("sha256").update(`${userId}:${productKey}:${window}`).digest("hex").slice(0, 32)}`;
}

export async function createCreemCheckout(input: {
  userId: string;
  email: string;
  productKey: "credits";
  productId: string;
  successUrl: string;
  requestId: string;
}, options: { env?: NodeJS.ProcessEnv; fetch?: typeof fetch } = {}): Promise<CreemCheckout> {
  const env = options.env ?? process.env;
  const environment = env.CREEM_ENV;
  if (environment !== "test" && environment !== "production") throw new Error("CREEM_ENV must be test or production.");
  const apiKey = env.CREEM_API_KEY?.trim();
  if (!apiKey) throw new Error("CREEM_API_KEY is not configured.");
  const response = await (options.fetch ?? fetch)(`${CREEM_API_BASES[environment]}/v1/checkouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      product_id: input.productId,
      units: 1,
      customer: { email: input.email },
      request_id: input.requestId,
      success_url: input.successUrl,
      metadata: { user_id: input.userId, product_key: input.productKey },
    }),
  });
  if (!response.ok) throw new Error(`Creem checkout creation failed with status ${response.status}.`);
  const payload = await response.json() as { id?: unknown; checkout_url?: unknown; request_id?: unknown };
  if (typeof payload.id !== "string" || typeof payload.checkout_url !== "string") throw new Error("Creem returned an invalid checkout response.");
  return { id: payload.id, checkoutUrl: payload.checkout_url, requestId: typeof payload.request_id === "string" ? payload.request_id : input.requestId };
}
