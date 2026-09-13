// Generator-specific analytics payload construction.
// Kept separate from the generic transport (lib/analytics/events.ts) so the
// generator does not repeat normalization details inline. Event names and the
// minimal parameter schema (surface, room_type, style, scope, plan,
// failure_stage, reason) are preserved exactly.

import { toAnalyticsValue, trackEvent } from "./events";

type Surface = "home" | "bathroom_design";
type FailureStage = "upload" | "generation" | "video" | "other";
type FailureReason = "invalid_image" | "network_error" | "provider_failed" | "timeout" | "other";

function baseParams({ roomType, style, scope }: { roomType: string; style: string; scope: string }) {
  return {
    room_type: toAnalyticsValue(roomType),
    style: toAnalyticsValue(style),
    scope: toAnalyticsValue(scope),
  };
}

export function trackGenerateClick({ roomType, style, scope, surface }: { roomType: string; style: string; scope: string; surface: Surface }) {
  trackEvent("generate_click", { ...baseParams({ roomType, style, scope }), surface });
}

export function trackGenerationStarted({ roomType, style, scope, plan, surface }: { roomType: string; style: string; scope: string; plan: string; surface: Surface }) {
  trackEvent("generation_started", { ...baseParams({ roomType, style, scope }), plan, surface });
}

export function trackGenerationCompleted({ roomType, style, scope, plan, surface }: { roomType: string; style: string; scope: string; plan: string; surface: Surface }) {
  trackEvent("generation_completed", { ...baseParams({ roomType, style, scope }), plan, surface });
}

export function trackGenerationFailed({ roomType, style, scope, surface, failureStage, error }: { roomType: string; style: string; scope: string; surface: Surface; failureStage: FailureStage; error: unknown }) {
  trackEvent("generation_failed", {
    ...baseParams({ roomType, style, scope }),
    surface,
    failure_stage: failureStage,
    reason: normalizeErrorReason(error),
  });
}

export function trackRoomTypeSelected(roomType: string) {
  trackEvent("room_type_selected", { room_type: toAnalyticsValue(roomType) });
}

export function trackStyleSelected(style: string) {
  trackEvent("style_selected", { style: toAnalyticsValue(style) });
}

function normalizeErrorReason(error: unknown): FailureReason {
  const text = (error instanceof Error ? error.message : "").toLowerCase();
  if (error instanceof DOMException && error.name === "TimeoutError") return "timeout";
  if (/timeout|timed out/.test(text)) return "timeout";
  if (/jpe?g|png|10mb|too large|over 10mb/.test(text)) return "invalid_image";
  if (error instanceof TypeError) return "network_error";
  if (/connection|network|failed to fetch|could not be uploaded|could not be prepared|could not be completed/.test(text)) return "network_error";
  if (/generation|generate|provider|status could not be loaded/.test(text)) return "provider_failed";
  return "other";
}