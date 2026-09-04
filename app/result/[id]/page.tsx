import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { DownloadLink } from "@/components/result/download-link";
import { resolveInputFrame } from "@/lib/assets/frame-assets";
import { resolveStoredAsset } from "@/lib/assets/generated-assets";
import { canAccessJob, getViewerIdentity } from "@/lib/generation/access";
import { MOCK_JOB_COOKIE, readMockJobToken } from "@/lib/generation/mock-job";
import type { GenerationJob } from "@/lib/generation/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { siteConfig } from "@/lib/site";
import { privatePageRobots } from "@/lib/seo";

type ResultView = { id: string; roomType: string; style: string; firstFrame: string; lastFrame: string; videoUrl: string; isWatermarked: boolean; commercialLicense: boolean };

async function getResult(id: string): Promise<ResultView | null> {
  if (id === "demo") return demoResult(id);
  const admin = getSupabaseAdmin();
  if (!admin) {
    const store = await cookies();
    const claims = readMockJobToken(store.get(MOCK_JOB_COOKIE)?.value);
    return claims?.id === id ? { id, roomType: claims.roomType, style: claims.style, firstFrame: claims.firstFrame, lastFrame: claims.lastFrame, videoUrl: "/videos/living-japandi-watermarked.mp4", isWatermarked: true, commercialLicense: false } : null;
  }
  const viewer = await getViewerIdentity();
  const query = await admin.from("generation_jobs").select("*").eq("id", id).maybeSingle();
  const job = query.data as GenerationJob | null;
  if (!job || job.status !== "completed" || !canAccessJob(job, viewer)) return null;
  const firstFrame = await resolveInputFrame(admin, job.first_frame_path, job.first_frame_url);
  const lastFrame = await resolveStoredAsset(admin, job.last_frame_path, job.last_frame_url);
  const videoUrl = await resolveStoredAsset(admin, job.is_watermarked ? job.watermarked_video_path : job.raw_video_path, job.video_url);
  if (!firstFrame || !lastFrame || !videoUrl) return null;
  return { id, roomType: job.room_type, style: job.style, firstFrame, lastFrame, videoUrl, isWatermarked: job.is_watermarked, commercialLicense: job.commercial_license };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const result = await getResult((await params).id);
  const video = result?.videoUrl ? new URL(result.videoUrl, siteConfig.url).toString() : undefined;
  return { title: result ? `${result.style} ${result.roomType} Transformation Video` : "Private Room Transformation", description: "Watch an AI room design transform from before to after with Roomorphic.", robots: privatePageRobots, openGraph: result ? { type: "video.other", title: "Roomorphic Before and After Video", description: "A private AI room design transformation from Roomorphic.", videos: video ? [{ url: video, secureUrl: video, type: "video/mp4", width: 768, height: 768 }] : undefined } : undefined };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const result = await getResult((await params).id);
  if (!result) notFound();
  return (
    <main className="shell py-14 md:py-20">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-black tracking-[-0.045em] md:text-6xl">{result.style} {result.roomType} transformation</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">Your original room, redesigned and transformed into a protected before and after video.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <figure className="surface overflow-hidden p-3"><div className="relative aspect-[4/3] overflow-hidden rounded-xl"><Image src={result.firstFrame} alt={`Original ${result.roomType}`} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" /></div><figcaption className="px-1 pt-3 text-sm font-black">Before</figcaption></figure>
          <figure className="surface overflow-hidden p-3"><div className="relative aspect-[4/3] overflow-hidden rounded-xl"><Image src={result.lastFrame} alt={`${result.style} ${result.roomType} redesign`} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" /></div><figcaption className="px-1 pt-3 text-sm font-black">After</figcaption></figure>
        </div>
        <video src={result.videoUrl} controls autoPlay muted playsInline className="soft-shadow mt-5 aspect-video w-full rounded-2xl bg-[var(--surface-2)] object-cover" />
        <div className="mt-5 flex flex-wrap gap-3">
          <DownloadLink href={result.videoUrl} watermarked={result.isWatermarked} />
          <Link href="/#generator" className="focus-ring rounded-xl border border-[var(--line)] px-5 py-3 font-black">Generate another</Link>
          {result.isWatermarked ? <Link href="/#pricing" className="focus-ring rounded-xl border border-[var(--accent)] px-5 py-3 font-black text-[var(--accent)]">Upgrade for HD</Link> : null}
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">{result.isWatermarked ? "Free exports include a baked-in Roomorphic watermark." : `This paid generation is watermark-free${result.commercialLicense ? " and includes commercial usage rights" : " for personal use"}.`} Provider URLs remain protected.</p>
        <AdSlot label="Result page advertisement" />
      </div>
    </main>
  );
}

function demoResult(id: string): ResultView { return { id, roomType: "Living Room", style: "Japandi", firstFrame: "/samples/living-before.jpg", lastFrame: "/samples/living-after.jpg", videoUrl: "/videos/living-japandi-watermarked.mp4", isWatermarked: true, commercialLicense: false }; }
