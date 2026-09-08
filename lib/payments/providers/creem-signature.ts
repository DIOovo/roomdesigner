import { createHmac, timingSafeEqual } from "node:crypto";

export type SignatureVerification = "valid" | "missing" | "malformed" | "invalid" | "unconfigured";

export function verifyCreemWebhookSignature(rawBody: string, signature: string | null, secret: string | undefined): SignatureVerification {
  if (!signature) return "missing";
  if (!secret) return "unconfigured";
  const normalized = signature.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(normalized)) return "malformed";
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(normalized, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected) ? "valid" : "invalid";
}
