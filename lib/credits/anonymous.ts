import { createHmac, timingSafeEqual } from "node:crypto";

const secret = process.env.ANON_COOKIE_SECRET ?? "roomfacelift-local-development-only";

export function signAnonymousUsage(count: number) {
  const value = String(count);
  const signature = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${signature}`;
}

export function readAnonymousUsage(value?: string) {
  if (!value) return 0;
  const [count, signature] = value.split(".");
  if (!count || !signature) return 1;
  const expected = createHmac("sha256", secret).update(count).digest("hex");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return 1;
  const parsed = Number(count);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 1;
}
