import { createHmac, timingSafeEqual } from "node:crypto";

const secret = process.env.ANON_COOKIE_SECRET ?? "roomorphic-local-development-only";

export function createSignedToken(payload: object) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function readSignedToken<T>(token?: string): T | null {
  if (!token) return null;
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return null;
  const expected = signature(encoded);
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T; }
  catch { return null; }
}

function signature(value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
