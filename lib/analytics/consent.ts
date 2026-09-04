export const CONSENT_KEY = "roomorphic_consent_v1";
export const CONSENT_EVENT = "roomorphic:consent";
export type ConsentChoice = "unknown" | "accepted" | "essential";

export function hasAnalyticsConsent(storage: Pick<Storage, "getItem"> | undefined) {
  return storage?.getItem(CONSENT_KEY) === "accepted";
}
