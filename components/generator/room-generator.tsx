"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FilmStrip, ImageSquare, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { roomTypes, samples, styles } from "@/lib/site";
import { toAnalyticsValue, track, trackEvent } from "@/lib/analytics/events";
import type { CreditSource, RoomFaceliftPlan, UserEntitlements } from "@/lib/entitlements/types";
import { isDesignScope, type DesignScope } from "@/lib/generation/design-scope";
import { ApiResponseError, readApiResponse } from "@/lib/http/client-response";
import { resolveRoomImageContentType } from "@/lib/assets/input-upload-validation";

type Status = "idle" | "queued" | "processing" | "error" | "auth" | "upgrade";

type JobResponse = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  stage: string;
  message?: string;
  resultUrl?: string;
  error?: string;
  requiresAuth?: boolean;
  requiresUpgrade?: boolean;
  creditSource?: CreditSource;
  plan?: RoomFaceliftPlan;
};

type ReuseResponse = { roomType?: string; style?: string; designScope?: string; error?: string };
type UploadResponse = { path: string; signedUrl: string; imageUrl?: string; error?: string; requiresAuth?: boolean; requiresUpgrade?: boolean };

const GENERATION_DURATION_SECONDS = 5;

export function RoomGenerator() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(samples[0].src);
  const [room, setRoom] = useState<(typeof roomTypes)[number]>("Living Room");
  const [style, setStyle] = useState("Japandi");
  const [designScope, setDesignScope] = useState<DesignScope>("keep-layout");
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState("idle");
  const [message, setMessage] = useState("");
  const [reuseMessage, setReuseMessage] = useState("");
  const [reuseId, setReuseId] = useState<string | undefined>(undefined);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const requestInFlight = useRef(false);
  const pollController = useRef<AbortController | null>(null);
  const reservedSource = useRef<CreditSource | null>(null);
  const generationPlan = useRef<RoomFaceliftPlan>("free");
  const selectedStyleLabel = styles.find((item) => item.name === style)?.name ?? style;

  useEffect(() => {
    fetch("/api/entitlements", { cache: "no-store" }).then((response) => readApiResponse<UserEntitlements>(response, "Credits could not be loaded.")).then(setEntitlements).catch(() => undefined);
    return () => pollController.current?.abort();
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("reuse");
    if (id) setReuseId(id);
  }, []);

  useEffect(() => {
    if (!reuseId) return;
    const controller = new AbortController();
    setReuseMessage("Restoring your previous settings...");
    fetch(`/api/generations/${encodeURIComponent(reuseId)}/reuse`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await readApiResponse<ReuseResponse>(response, "Previous settings could not be restored.");
        if (!data.roomType || !roomTypes.includes(data.roomType as (typeof roomTypes)[number]) || !data.style || !styles.some((item) => item.name === data.style) || !isDesignScope(data.designScope)) {
          throw new Error("Previous settings are no longer available.");
        }
        setRoom(data.roomType as (typeof roomTypes)[number]);
        setStyle(data.style);
        setDesignScope(data.designScope);
        setReuseMessage("Previous room type, style, and design scope restored. Choose a photo, then Generate to create a new version.");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReuseMessage(error instanceof Error ? error.message : "Previous settings could not be restored.");
      });
    return () => controller.abort();
  }, [reuseId]);

  const validateFile = useCallback((next: File) => {
    if (!resolveRoomImageContentType(next)) {
      setStatus("error");
      setMessage("Please choose a PNG or JPG image.");
      return false;
    }
    if (next.size > 10 * 1024 * 1024) {
      setStatus("error");
      setMessage("That image is over 10MB. Please choose a smaller file.");
      return false;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setStatus("idle");
    setMessage("");
    return true;
  }, []);

  function handlePrimaryAction() {
    trackGenerateClick();
    if (entitlements && !entitlements.authenticated && entitlements.totalCreditsRemaining <= 0) {
      track("login_required", { source: "generator" });
      window.location.assign("/login?next=%2F%23generator");
      return;
    }
    generate();
  }

  async function generate() {
    if (requestInFlight.current) return;
    if (entitlements && entitlements.totalCreditsRemaining <= 0) {
      if (entitlements.authenticated) {
        setStatus("upgrade");
        setMessage("No generation credits remaining.");
        track("upgrade_required");
      } else {
        setStatus("auth");
        setMessage("Sign in to use your second free preview.");
        track("login_required", { source: "generator" });
      }
      return;
    }
    requestInFlight.current = true;
    pollController.current?.abort();
    const controller = new AbortController();
    pollController.current = controller;
    setStatus("queued");
    setStage("queued");
    setMessage("Preparing your room...");
    try {
      const imageUrl = file ? await uploadRoomImage(file, controller.signal, setMessage) : preview;
      if (file) {
        trackEvent("image_upload_success", {
          file_type: resolveRoomImageContentType(file) ?? file.type,
          file_size: file.size,
        });
      }
      setMessage("Starting your generation...");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ imageUrl, roomType: room, style, scope: designScope }),
        signal: controller.signal,
      });
      const data = await readApiResponse<JobResponse>(response, "Generation could not start.");
      if (!data.jobId) throw new Error(data.error ?? "Generation could not start.");
      reservedSource.current = data.creditSource ?? null;
      generationPlan.current = data.plan ?? entitlements?.plan ?? "free";
      trackEvent("generation_started", {
        room_type: toAnalyticsValue(room),
        style: toAnalyticsValue(style),
        plan: generationPlan.current,
      });
      track("credit_reserved", { source: data.creditSource ?? "unknown" });
      await pollJob(data.jobId, controller.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof ApiResponseError && error.payload.requiresAuth) {
        setStatus("auth");
        setMessage(error.message);
        track("login_required", { source: "generation_api" });
        requestInFlight.current = false;
        return;
      }
      if (error instanceof ApiResponseError && error.payload.requiresUpgrade) {
        setStatus("upgrade");
        setMessage(error.message);
        track("upgrade_required");
        requestInFlight.current = false;
        return;
      }
      setStatus("error");
      setStage("failed");
      setMessage(error instanceof Error ? error.message : "Generation failed. Please try again.");
      track("generation_failed", { roomType: room, style, generationResult: "failed" });
      requestInFlight.current = false;
    }
  }

  async function pollJob(jobId: string, signal: AbortSignal) {
    while (!signal.aborted) {
      const response = await fetch(`/api/generations/${jobId}`, { cache: "no-store", signal });
      const job = await readApiResponse<JobResponse>(response, "Generation status could not be loaded.");
      setStage(job.stage);
      setMessage(job.message ?? "Preparing your room...");
      setStatus(job.status === "queued" ? "queued" : "processing");
      if (job.status === "failed") throw new Error(job.error ?? "Generation failed. Please try again.");
      if (job.status === "completed" && job.resultUrl) {
        trackEvent("generation_completed", {
          duration: GENERATION_DURATION_SECONDS,
          plan: generationPlan.current,
        });
        if (reservedSource.current === "free") track("free_preview_used");
        window.location.assign(job.resultUrl);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, 2000);
        signal.addEventListener("abort", () => { window.clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
      });
    }
  }

  function trackGenerateClick() {
    trackEvent("generate_click", {
      room_type: toAnalyticsValue(room),
      style: toAnalyticsValue(style),
      mode: toAnalyticsValue(designScope),
    });
  }

  return (
    <div className="grid min-w-0 lg:grid-cols-[minmax(0,.96fr)_minmax(500px,1.04fr)] lg:items-start">
      <section aria-label="Room photo" className="min-w-0 lg:sticky lg:top-24 lg:pr-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[var(--surface-2)] shadow-[0_20px_60px_rgba(24,43,34,.12)] sm:aspect-[16/10] lg:aspect-[4/3]">
          <Image src={preview} alt="Selected room ready for AI redesign" fill priority className="object-cover" sizes="(max-width:1024px) 100vw, 42vw" />
          <div className="absolute inset-x-4 top-4 flex items-center justify-between text-xs font-semibold sm:inset-x-5 sm:top-5">
            <span className="flex items-center gap-2 rounded-full bg-black/58 px-3 py-1.5 text-white backdrop-blur-md"><ImageSquare size={15} weight="bold" /> Before</span>
            <span className="rounded-full bg-[color:var(--surface)]/92 px-3 py-1.5 text-[var(--accent)] backdrop-blur-md">Ready</span>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(event) => { const selected = event.target.files?.[0]; if (selected) { track("upload_started", { type: selected.type }); validateFile(selected); } }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); const dropped = event.dataTransfer.files[0]; if (dropped) { track("upload_started", { type: dropped.type }); validateFile(dropped); } }}
          className="focus-ring mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-transparent px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--muted)] hover:bg-[color:var(--surface)]/65 active:scale-[.99]"
        >
          <UploadSimple size={17} weight="bold" /> {file ? "Replace photo" : "Upload or drop a room photo"}
          <span className="font-normal text-[var(--muted)]">PNG/JPG · 10MB max</span>
        </button>
        <div className="mt-4 grid grid-cols-[auto_repeat(4,minmax(0,1fr))] items-center gap-2.5">
          <span className="pr-1 text-xs font-semibold text-[var(--muted)]">Try a sample</span>
          {samples.map((sample) => (
            <button
              type="button"
              key={sample.src}
              onClick={() => { setFile(null); setPreview(sample.src); setStatus("idle"); track("sample_selected", { sample: sample.name }); }}
              aria-label={`Try ${sample.name} sample`}
              className={`focus-ring relative aspect-[16/9] overflow-hidden rounded-md ${preview === sample.src && !file ? "ring-1 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]" : "opacity-60 hover:opacity-100"}`}
            >
              <Image src={sample.src} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Room design settings" className="mt-10 min-w-0 border-t border-[var(--line)] pt-9 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
        <div className="grid gap-3 sm:grid-cols-[1fr_15rem] sm:items-center">
          <div><p className="text-sm font-semibold text-[var(--ink)]">Room type</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Choose the space you want to transform.</p></div>
          <label className="sr-only" htmlFor="room-type">Room type</label>
          <select id="room-type" value={room} onChange={(event) => { const roomType = event.target.value as typeof room; setRoom(roomType); track("room_type_selected", { roomType }); }} className="focus-ring h-12 w-full rounded-lg border border-[var(--line)] bg-[color:var(--surface)]/70 px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--muted)]">
              {roomTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <div className="mb-3"><p className="text-sm font-semibold text-[var(--ink)]">Design scope</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Decide how much of the room can change.</p></div>
          <div className="grid gap-1 rounded-xl bg-[var(--surface-2)] p-1 sm:grid-cols-2" role="radiogroup" aria-label="Design scope">
            <button
              type="button"
              role="radio"
              aria-checked={designScope === "keep-layout"}
              onClick={() => setDesignScope("keep-layout")}
              className={`focus-ring rounded-lg px-4 py-3 text-left ${designScope === "keep-layout" ? "bg-[var(--surface)] shadow-[0_3px_12px_rgba(24,43,34,.08)]" : "text-[var(--muted)] hover:bg-[color:var(--surface)]/55"}`}
            >
              <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-[var(--ink)]">Keep layout</span><span className="whitespace-nowrap rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--accent)]">Recommended</span></span>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Preserve windows, doors, walls, and major fixed elements.</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={designScope === "reimagine-space"}
              onClick={() => setDesignScope("reimagine-space")}
              className={`focus-ring rounded-lg px-4 py-3 text-left ${designScope === "reimagine-space" ? "bg-[var(--surface)] shadow-[0_3px_12px_rgba(24,43,34,.08)]" : "text-[var(--muted)] hover:bg-[color:var(--surface)]/55"}`}
            >
              <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-[var(--ink)]">Reimagine space</span><span className="whitespace-nowrap rounded-full bg-[color:var(--ink)]/[.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--muted)]">For inspiration</span></span>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Allow larger design changes for concept exploration.</span>
            </button>
          </div>
        </div>
        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--ink)]">Style</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Choose the visual direction for your room.</p></div><p className="shrink-0 text-xs font-semibold text-[var(--accent)]">{selectedStyleLabel}</p></div>
          <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          {styles.map((item) => (
            <button
              type="button"
              key={item.name}
              onClick={() => { setStyle(item.name); track("style_selected", { style: item.name }); }}
              className={`focus-ring group relative aspect-[16/10] min-w-0 overflow-hidden rounded-lg text-left active:scale-[.98] ${style === item.name ? "ring-1 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]" : "opacity-[.78] hover:opacity-100"}`}
              aria-pressed={style === item.name}
            >
              <Image src={item.image} alt={item.alt} fill className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]" sizes="(max-width: 639px) 46vw, (max-width: 1279px) 28vw, 120px" />
              <span aria-hidden="true" className={`absolute inset-0 bg-gradient-to-t from-black/72 via-black/5 to-transparent transition-colors ${style === item.name ? "bg-[color:var(--accent)]/10" : ""}`} />
              <span className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6 text-[11px] font-semibold leading-tight text-white">{item.name}</span>
              {style === item.name ? <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[var(--surface)] text-[var(--accent)] shadow-[0_3px_10px_rgba(0,0,0,.18)]"><Check size={12} weight="bold" /></span> : null}
            </button>
          ))}
          </div>
        </div>

        {reuseMessage ? <p className="mt-6 rounded-lg bg-[var(--surface-2)] px-4 py-3 text-xs font-medium leading-5 text-[var(--muted)]" role="status">{reuseMessage}</p> : null}
        <div className="mt-6 flex flex-col gap-4 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-[var(--ink)]">Ready to generate</p><p className="mt-1 text-sm text-[var(--muted)]">{selectedStyleLabel} · {designScope === "keep-layout" ? "Keep layout" : "Reimagine space"}</p>{entitlements ? <p className="mt-1 text-xs font-medium text-[var(--muted)]">{creditLabel(entitlements)}</p> : null}</div>
          <button type="button" onClick={handlePrimaryAction} disabled={status === "queued" || status === "processing"} className="focus-ring flex min-h-12 min-w-44 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--on-accent)] shadow-[0_10px_24px_rgba(18,75,55,.18)] enabled:hover:bg-[var(--accent-strong)] enabled:active:scale-[.98] disabled:cursor-wait disabled:opacity-65 disabled:shadow-none">
            {status === "queued" || status === "processing" ? <><FilmStrip size={19} weight="fill" /> Generating video...</> : <>{generateLabel(entitlements)} <ArrowRight size={18} weight="bold" /></>}
          </button>
        </div>
        {status !== "idle" ? (
          <div className={`mt-5 rounded-lg border p-4 text-sm ${status === "error" || status === "auth" || status === "upgrade" ? "border-red-500/40 bg-red-500/10" : "border-[var(--line)] bg-[var(--surface-2)]"}`} role="status">
            <div className="flex items-start gap-2">
              {status === "error" || status === "auth" || status === "upgrade" ? <WarningCircle size={18} className="mt-0.5 shrink-0" weight="bold" /> : <FilmStrip size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" weight="fill" />}
              <div className="flex-1">
                <p className="font-semibold">{message}</p>
                {status === "queued" || status === "processing" ? <GenerationSteps stage={stage} /> : null}
                {status === "auth" ? <Link href="/login?next=%2F%23generator" className="mt-2 inline-block font-bold text-[var(--accent)] underline">Continue with email</Link> : null}
                {status === "upgrade" ? <Link href="/#pricing" className="mt-2 inline-block font-bold text-[var(--accent)] underline">View plans</Link> : null}
                {status === "error" ? <button type="button" onClick={() => { trackGenerateClick(); void generate(); }} className="focus-ring mt-2 font-bold text-[var(--accent)] underline">Try again</button> : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function generateLabel(entitlements: UserEntitlements | null) {
  if (!entitlements || entitlements.totalCreditsRemaining > 0) return "Generate";
  return entitlements.authenticated ? "Upgrade to generate" : "Sign in to generate";
}

async function uploadRoomImage(file: File, signal: AbortSignal, setMessage: (message: string) => void) {
  const contentType = resolveRoomImageContentType(file);
  if (!contentType) throw new Error("Only PNG and JPG images are accepted.");
  const typedFile = file.type === contentType ? file : new File([file], file.name, { type: contentType, lastModified: file.lastModified });
  setMessage("Uploading your room photo...");
  const prepareResponse = await fetch("/api/uploads/room-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentType, size: typedFile.size }),
    signal,
  });
  const prepared = await readApiResponse<UploadResponse>(prepareResponse, "The room photo upload could not be prepared.");
  const uploadBody = new FormData();
  uploadBody.append("cacheControl", "3600");
  uploadBody.append("", typedFile, typedFile.name);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const uploaded = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: {
      "x-upsert": "false",
      ...(anonKey ? { apikey: anonKey, authorization: `Bearer ${anonKey}` } : {}),
    },
    body: uploadBody,
    signal,
  });
  if (!uploaded.ok) {
    await uploaded.text().catch(() => "");
    if (uploaded.status === 413) throw new Error("That image is over 10MB. Please choose a smaller file.");
    throw new Error("The room photo could not be uploaded. Check your connection and try again.");
  }

  setMessage("Checking your room photo...");
  const completeResponse = await fetch("/api/uploads/room-image", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: prepared.path }),
    signal,
  });
  const completed = await readApiResponse<UploadResponse>(completeResponse, "The room photo upload could not be completed.");
  if (!completed.imageUrl) throw new Error("The room photo upload could not be completed.");
  return completed.imageUrl;
}

function creditLabel(entitlements: UserEntitlements) {
  if (!entitlements.authenticated) return entitlements.totalCreditsRemaining ? "1 free preview left · no login required" : "Sign in to claim your second preview";
  const plan = entitlements.plan === "free" ? "Free" : entitlements.plan[0].toUpperCase() + entitlements.plan.slice(1);
  return `${plan} · ${entitlements.totalCreditsRemaining} generation${entitlements.totalCreditsRemaining === 1 ? "" : "s"} left`;
}

function GenerationSteps({ stage }: { stage: string }) {
  const stages = [
    { key: "queued", label: "Preparing" },
    { key: "generating_after_frame", label: "Designing" },
    { key: "generating_video", label: "Transforming" },
    { key: "applying_watermark", label: "Finishing" },
  ];
  const order: Record<string, number> = { queued: 0, generating_after_frame: 1, submitting_video: 2, video_submission_in_progress: 2, generating_video: 2, persisting_video: 3, applying_watermark: 3, watermarking: 3, completed: 4 };
  const active = order[stage] ?? 0;
  return <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Generation progress">{stages.map((item, index) => <li key={item.key} className={`border-t-2 pt-1.5 text-[10px] font-bold ${index <= active ? "border-[var(--accent)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)]"}`}>{index < active ? <Check size={12} weight="bold" className="mb-1 text-[var(--accent)]" /> : null}{item.label}</li>)}</ol>;
}
