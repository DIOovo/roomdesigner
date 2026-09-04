import { cookies } from "next/headers";
import { ANONYMOUS_COOKIE, anonymousStorageId, readAnonymousIdentity } from "@/lib/auth/anonymous";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { GenerationJob } from "./types";

export async function getViewerIdentity() {
  const store = await cookies();
  const client = await getSupabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  const anonymousId = readAnonymousIdentity(store.get(ANONYMOUS_COOKIE)?.value);
  return { user, anonymousId: anonymousId ? anonymousStorageId(anonymousId) : null, store };
}

export function canAccessJob(job: GenerationJob, viewer: Awaited<ReturnType<typeof getViewerIdentity>>) {
  if (job.user_id) return viewer.user?.id === job.user_id;
  return Boolean(job.anonymous_id && viewer.anonymousId === job.anonymous_id);
}
