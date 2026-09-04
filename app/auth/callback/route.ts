import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ANONYMOUS_COOKIE, anonymousStorageId, readAnonymousIdentity } from "@/lib/auth/anonymous";
import { claimAnonymousUsage } from "@/lib/credits/claim-anonymous";
import { readAnonymousUsage } from "@/lib/credits/anonymous";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") ?? "/#generator";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/#generator";
  const client = await getSupabaseServer();
  if (code && client) {
    const result = await client.auth.exchangeCodeForSession(code);
    if (!result.error) {
      const store = await cookies();
      const anonymous = readAnonymousIdentity(store.get(ANONYMOUS_COOKIE)?.value);
      if (anonymous && result.data.user) await claimAnonymousUsage({ userId: result.data.user.id, anonymousId: anonymousStorageId(anonymous), cookieUsed: readAnonymousUsage(store.get("roomorphic_free")?.value) });
      const response = NextResponse.redirect(new URL(next, url.origin));
      if (anonymous) {
        response.cookies.set(ANONYMOUS_COOKIE, "", { path: "/", maxAge: 0 });
        response.cookies.set("roomorphic_free", "", { path: "/", maxAge: 0 });
      }
      return response;
    }
  }
  return NextResponse.redirect(new URL(`/login?error=confirmation_failed&next=${encodeURIComponent(next)}`, url.origin));
}
