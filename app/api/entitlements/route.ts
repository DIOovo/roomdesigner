import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readAnonymousUsage } from "@/lib/credits/anonymous";
import { getAnonymousEntitlements, getUserEntitlements } from "@/lib/entitlements/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  const entitlements = user
    ? await getUserEntitlements(user.id)
    : getAnonymousEntitlements(readAnonymousUsage((await cookies()).get("roomfacelift_free")?.value));
  return NextResponse.json(entitlements, { headers: { "Cache-Control": "private, no-store" } });
}
