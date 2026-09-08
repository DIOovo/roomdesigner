import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ANONYMOUS_COOKIE, anonymousStorageId, readAnonymousIdentity } from "@/lib/auth/anonymous";
import { safeReturnTo } from "@/lib/auth/redirect";
import { claimAnonymousUsage } from "@/lib/credits/claim-anonymous";
import { readAnonymousUsage } from "@/lib/credits/anonymous";
import { getSupabaseServer } from "@/lib/supabase/server";

type ConfirmationOtpType = "signup" | "email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = confirmationOtpType(url.searchParams.get("type"));
  const next = safeReturnTo(url.searchParams.get("next"));
  const client = await getSupabaseServer();
  if (client && (code || (tokenHash && otpType))) {
    try {
      const result = code
        ? await client.auth.exchangeCodeForSession(code)
        : await client.auth.verifyOtp({ token_hash: tokenHash as string, type: otpType as ConfirmationOtpType });
      if (!result.error && result.data.user) {
        const store = await cookies();
        const anonymous = readAnonymousIdentity(store.get(ANONYMOUS_COOKIE)?.value);
        let claimed = false;
        if (anonymous) {
          try {
            claimed = await claimAnonymousUsage({ userId: result.data.user.id, anonymousId: anonymousStorageId(anonymous), cookieUsed: readAnonymousUsage(store.get("roomfacelift_free")?.value) });
          } catch {
            // Keep the anonymous cookies so the existing claim endpoint or generation flow can retry.
          }
        }
        const response = NextResponse.redirect(new URL(next, url.origin));
        if (claimed) {
          response.cookies.set(ANONYMOUS_COOKIE, "", { path: "/", maxAge: 0 });
          response.cookies.set("roomfacelift_free", "", { path: "/", maxAge: 0 });
        }
        return response;
      }
    } catch {
      // Redirect with a stable public error instead of exposing provider details.
    }
  }
  const login = new URL("/login", url.origin);
  login.searchParams.set("error", tokenHash || !code ? "confirmation_failed" : "oauth_failed");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

function confirmationOtpType(value: string | null): ConfirmationOtpType | null {
  return value === "signup" || value === "email" ? value : null;
}
