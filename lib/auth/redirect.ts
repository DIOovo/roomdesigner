const DEFAULT_AUTH_RETURN_TO = "/#generator";
const RETURN_TO_BASE = "https://roomfacelift.invalid";

export function safeReturnTo(value?: string | null, fallback = DEFAULT_AUTH_RETURN_TO) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, RETURN_TO_BASE);
    if (parsed.origin !== RETURN_TO_BASE) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function googleOAuthRequest(origin: string, returnTo?: string | null) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeReturnTo(returnTo));
  return {
    provider: "google" as const,
    options: { redirectTo: callback.toString() },
  };
}
