import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  return NextResponse.json({ email: user?.email ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}