import { NextResponse } from "next/server";
import { resolveStoredAsset } from "@/lib/assets/generated-assets";
import { isOwnedByUser, playableAssetReference } from "@/lib/generation/history-policy";
import type { GenerationJob } from "@/lib/generation/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

const DOWNLOAD_FIELDS = "id,user_id,status,is_watermarked,watermarked_video_path,watermarked_video_url,raw_video_path,raw_video_url,video_url";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!client || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await params;
  const result = await client
    .from("generation_jobs")
    .select(DOWNLOAD_FIELDS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const job = result.data as Pick<GenerationJob, "id" | "user_id" | "status" | "is_watermarked" | "watermarked_video_path" | "watermarked_video_url" | "raw_video_path" | "raw_video_url" | "video_url"> | null;
  if (result.error || !job || job.status !== "completed" || !isOwnedByUser(job, user.id)) return NextResponse.json({ error: "Generation not found." }, { status: 404 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Download unavailable." }, { status: 503 });
  const asset = playableAssetReference(job);
  const signedUrl = await resolveStoredAsset(admin, asset.path, asset.fallbackUrl);
  if (!signedUrl) return NextResponse.json({ error: "Download unavailable." }, { status: 404 });

  return NextResponse.redirect(new URL(signedUrl, request.url), { status: 307, headers: { "Cache-Control": "private, no-store" } });
}
