import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const client = await getSupabaseServer();
  if (client) await client.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
