import { createSignedToken, readSignedToken } from "@/lib/security/signed-token";

export const MOCK_JOB_COOKIE = "roomorphic_mock_job";

export type MockJobClaims = {
  id: string;
  createdAt: number;
  roomType: string;
  style: string;
  firstFrame: string;
  lastFrame: string;
};

export function createMockJobToken(claims: MockJobClaims) { return createSignedToken(claims); }
export function readMockJobToken(token?: string) { return readSignedToken<MockJobClaims>(token); }

export function mockJobState(claims: MockJobClaims) {
  const elapsed = Date.now() - claims.createdAt;
  if (elapsed < 900) return { status: "queued" as const, stage: "queued" };
  if (elapsed < 1900) return { status: "processing" as const, stage: "generating_after_frame" };
  if (elapsed < 3000) return { status: "processing" as const, stage: "generating_video" };
  if (elapsed < 3900) return { status: "processing" as const, stage: "applying_watermark" };
  return { status: "completed" as const, stage: "completed" };
}
