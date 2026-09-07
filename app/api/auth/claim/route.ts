import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ANONYMOUS_COOKIE, anonymousStorageId, readAnonymousIdentity } from "@/lib/auth/anonymous";
import { claimAnonymousUsage } from "@/lib/credits/claim-anonymous";
import { readAnonymousUsage } from "@/lib/credits/anonymous";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await getSupabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const store = await cookies();
  const identity = readAnonymousIdentity(store.get(ANONYMOUS_COOKIE)?.value);
  if (!identity) return NextResponse.json({ claimed: false });
  const claimed = await claimAnonymousUsage({ userId: user.id, anonymousId: anonymousStorageId(identity), cookieUsed: readAnonymousUsage(store.get("roomfacelift_free")?.value) });
  const response = NextResponse.json({ claimed });
  if (claimed) {
    response.cookies.set(ANONYMOUS_COOKIE, "", cookieOptions());
    response.cookies.set("roomfacelift_free", "", cookieOptions());
  }
  return response;
}

function cookieOptions() { return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" }; }
