import "server-only";

export class GenerationConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = "GenerationConfigurationError"; }
}

export function assertGenerationConfiguration(options: { watermarkRequired?: boolean } = {}) {
  const videoProvider = process.env.VIDEO_PROVIDER ?? "mock";
  const afterProvider = process.env.AFTER_IMAGE_PROVIDER ?? "mock";
  if (videoProvider === "mock") return;

  requireValues("real generation", ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ANON_COOKIE_SECRET", "NEXT_PUBLIC_SITE_URL"]);
  const siteUrl = requiredUrl("NEXT_PUBLIC_SITE_URL");
  if (process.env.NODE_ENV === "production" && (siteUrl.protocol !== "https:" || isLocalHost(siteUrl.hostname))) {
    throw new GenerationConfigurationError("NEXT_PUBLIC_SITE_URL must be a public HTTPS URL in production.");
  }
  if (videoProvider === "fal-h3-max") requireValues("fal H3 Max", ["FAL_KEY"]);
  if (videoProvider === "minimax") requireValues("MiniMax", ["MINIMAX_API_KEY"]);
  if (afterProvider === "remote") {
    requireValues("remote After Image", ["AFTER_IMAGE_API_URL", "AFTER_IMAGE_API_KEY"]);
    requiredUrl("AFTER_IMAGE_API_URL");
  }
  if (options.watermarkRequired) {
    requireValues("free real generation", ["WATERMARK_SERVICE_URL", "WATERMARK_SERVICE_TOKEN"]);
    requiredUrl("WATERMARK_SERVICE_URL");
  }
}

function requireValues(scope: string, names: string[]) {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new GenerationConfigurationError(`${scope} requires ${missing.join(", ")}.`);
}

function requiredUrl(name: string) {
  try { return new URL(process.env[name]!); }
  catch { throw new GenerationConfigurationError(`${name} must be a valid absolute URL.`); }
}

function isLocalHost(hostname: string) { return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"; }
