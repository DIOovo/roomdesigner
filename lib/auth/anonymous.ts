import { createHash } from "node:crypto";
import { createSignedToken, readSignedToken } from "@/lib/security/signed-token";

type AnonymousClaims = { id: string; createdAt: number };

export const ANONYMOUS_COOKIE = "roomorphic_anon";

export function createAnonymousIdentity() {
  const claims: AnonymousClaims = { id: crypto.randomUUID(), createdAt: Date.now() };
  return { id: claims.id, token: createSignedToken(claims) };
}

export function readAnonymousIdentity(token?: string) {
  const claims = readSignedToken<AnonymousClaims>(token);
  if (!claims?.id || !claims.createdAt) return null;
  return claims.id;
}

export function anonymousStorageId(id: string) {
  return createHash("sha256").update(id).digest("hex");
}
