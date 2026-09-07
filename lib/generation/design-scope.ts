export const DESIGN_SCOPES = ["keep-layout", "reimagine-space"] as const;
export type DesignScope = (typeof DESIGN_SCOPES)[number];

export const DEFAULT_DESIGN_SCOPE: DesignScope = "keep-layout";

export function isDesignScope(value: unknown): value is DesignScope {
  return typeof value === "string" && DESIGN_SCOPES.includes(value as DesignScope);
}

export function parseRequestedDesignScope(value: unknown): DesignScope | null {
  if (value === null || value === undefined || value === "") return DEFAULT_DESIGN_SCOPE;
  return isDesignScope(value) ? value : null;
}

export function normalizeStoredDesignScope(value: unknown): DesignScope {
  return isDesignScope(value) ? value : DEFAULT_DESIGN_SCOPE;
}
