export type AnalyticsEvent =
  | "upload_started"
  | "upload_completed"
  | "sample_selected"
  | "room_type_selected"
  | "style_selected"
  | "generate_started"
  | "generation_completed"
  | "generation_failed"
  | "login_required"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "download"
  | "upgrade_clicked"
  | "checkout"
  | "purchase"
  | "free_preview_used"
  | "credit_reserved"
  | "upgrade_required"
  ;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("roomfacelift_consent_v1") !== "accepted") return;
  const safeProperties = sanitizeAnalyticsProperties(properties);
  window.gtag?.("event", event, safeProperties);
  window.fbq?.("trackCustom", event, safeProperties);
}

const allowedProperties = new Set([
  "authenticated", "creditSource", "generationResult", "method", "plan", "roomType", "sample", "sizeBucket", "source", "style", "type", "watermarked",
]);

export function sanitizeAnalyticsProperties(properties: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => allowedProperties.has(key) && ["string", "number", "boolean"].includes(typeof value)));
}
