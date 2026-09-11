export type AnalyticsEvent =
  | "generate_click"
  | "image_upload_success"
  | "generation_started"
  | "pricing_click"
  | "checkout_started"
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

export const LOGIN_COMPLETION_COOKIE = "roomfacelift_login_provider";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem("roomfacelift_consent_v1") !== "accepted") return;
    const safeProperties = sanitizeAnalyticsProperties(properties);
    window.gtag?.("event", event, safeProperties);
    window.fbq?.("trackCustom", event, safeProperties);
  } catch {
    // Analytics must never interrupt the product flow.
  }
}

// Backwards-compatible alias for the existing analytics calls.
export const track = trackEvent;

export function toAnalyticsValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const allowedProperties = new Set([
  "authenticated", "creditSource", "duration", "file_size", "file_type", "generationResult", "method", "mode", "plan", "price", "provider", "room_type", "roomType", "sample", "sizeBucket", "source", "style", "type", "watermarked",
]);

export function sanitizeAnalyticsProperties(properties: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => allowedProperties.has(key) && ["string", "number", "boolean"].includes(typeof value)));
}
