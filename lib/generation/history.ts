import "server-only";
import { resolveInputFrame } from "@/lib/assets/frame-assets";
import { resolveStoredAsset } from "@/lib/assets/generated-assets";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { toGenerationHistoryItem, type GenerationHistoryItem, type HistoryJob } from "./history-policy";

const HISTORY_PAGE_SIZE = 12;
const HISTORY_FIELDS = "id,user_id,room_type,style,design_scope,status,stage,created_at,resolution,plan,credit_source,is_watermarked,first_frame_path,first_frame_url,last_frame_path,last_frame_url";

export type GenerationHistory = {
  items: GenerationHistoryItem[];
  page: number;
  hasMore: boolean;
  unavailable: boolean;
};

export async function getGenerationHistory(userId: string, requestedPage: number): Promise<GenerationHistory> {
  const page = normalizePage(requestedPage);
  const client = await getSupabaseServer();
  const admin = getSupabaseAdmin();
  if (!client || !admin) return { items: [], page, hasMore: false, unavailable: true };

  try {
    const offset = (page - 1) * HISTORY_PAGE_SIZE;
    const result = await client
      .from("generation_jobs")
      .select(HISTORY_FIELDS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + HISTORY_PAGE_SIZE);
    if (result.error) throw result.error;

    const rows = (result.data ?? []) as unknown as HistoryJob[];
    const visibleRows = rows.slice(0, HISTORY_PAGE_SIZE);
    const items = await Promise.all(visibleRows.map(async (job) => {
      const thumbnailUrl = await resolveHistoryThumbnail(admin, job).catch(() => null);
      return toGenerationHistoryItem(job, thumbnailUrl);
    }));
    return { items, page, hasMore: rows.length > HISTORY_PAGE_SIZE, unavailable: false };
  } catch {
    return { items: [], page, hasMore: false, unavailable: true };
  }
}

function normalizePage(page: number) {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

async function resolveHistoryThumbnail(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, job: HistoryJob) {
  const after = await resolveStoredAsset(admin, job.last_frame_path, job.last_frame_url);
  if (after) return after;
  const fallbackUrl = job.first_frame_path ? null : job.first_frame_url;
  return resolveInputFrame(admin, job.first_frame_path, fallbackUrl);
}
