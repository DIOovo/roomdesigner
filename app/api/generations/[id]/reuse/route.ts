import { NextResponse } from "next/server";
import { canReuseGeneration } from "@/lib/generation/history-policy";
import { normalizeStoredDesignScope } from "@/lib/generation/design-scope";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { GenerationJob } from "@/lib/generation/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!client || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await params;
  const result = await client
    .from("generation_jobs")
    .select("id,user_id,room_type,style,design_scope,status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const job = result.data as Pick<GenerationJob, "id" | "user_id" | "room_type" | "style" | "design_scope" | "status"> | null;
  if (result.error || !job || !canReuseGeneration(job, user.id)) return NextResponse.json({ error: "Generation not found." }, { status: 404 });

  return NextResponse.json(
    { generationId: job.id, roomType: job.room_type, style: job.style, designScope: normalizeStoredDesignScope(job.design_scope) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
