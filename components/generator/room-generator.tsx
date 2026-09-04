"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FilmStrip, ImageSquare, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { roomTypes, samples, styles } from "@/lib/site";
import { track } from "@/lib/analytics/events";
import type { CreditSource, UserEntitlements } from "@/lib/entitlements/types";

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
};

export function RoomGenerator() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(samples[0].src);
  const [room, setRoom] = useState<(typeof roomTypes)[number]>("Living Room");
  const [style, setStyle] = useState("Japandi");
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState("idle");
  const [message, setMessage] = useState("");
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const requestInFlight = useRef(false);
  const pollController = useRef<AbortController | null>(null);
  const reservedSource = useRef<CreditSource | null>(null);

  useEffect(() => {
    fetch("/api/entitlements", { cache: "no-store" }).then((response) => response.json()).then((data: UserEntitlements) => setEntitlements(data)).catch(() => undefined);
    return () => pollController.current?.abort();
  }, []);

  const validateFile = useCallback((next: File) => {
    if (!['image/jpeg', 'image/png'].includes(next.type)) {
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
    track("upload_completed", { sizeBucket: next.size > 5 * 1024 * 1024 ? "5-10mb" : "under-5mb", type: next.type });
    return true;
  }, []);

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
    track("generate_started", { roomType: room, style });
    try {
      const body = new FormData();
      if (file) body.append("image", file);
      body.append("sample", file ? "" : preview);
      body.append("roomType", room);
      body.append("style", style);
      body.append("clientRequestId", crypto.randomUUID());
      const response = await fetch("/api/generate", { method: "POST", body, signal: controller.signal });
      const data = (await response.json()) as JobResponse;
      if (data.requiresAuth) {
        setStatus("auth");
        setMessage(data.error ?? "Sign in to use your second free preview.");
        track("login_required", { source: "generation_api" });
        requestInFlight.current = false;
        return;
      }
      if (data.requiresUpgrade) {
        setStatus("upgrade");
        setMessage(data.error ?? "No generation credits remaining.");
        track("upgrade_required");
        requestInFlight.current = false;
        return;
      }
      if (!response.ok || !data.jobId) throw new Error(data.error ?? "Generation could not start.");
      reservedSource.current = data.creditSource ?? null;
      track("credit_reserved", { source: data.creditSource ?? "unknown" });
      await pollJob(data.jobId, controller.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
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
      const job = (await response.json()) as JobResponse;
      if (!response.ok) throw new Error(job.error ?? "Generation status could not be loaded.");
      setStage(job.stage);
      setMessage(job.message ?? "Preparing your room...");
      setStatus(job.status === "queued" ? "queued" : "processing");
      if (job.status === "failed") throw new Error(job.error ?? "Generation failed. Please try again.");
      if (job.status === "completed" && job.resultUrl) {
        track("generation_completed", { roomType: room, style, generationResult: "completed" });
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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
      <div className="surface relative overflow-hidden p-3 sm:min-h-[310px] sm:p-4">
        <div className="relative h-[132px] overflow-hidden rounded-xl bg-[var(--surface-2)] sm:h-[184px]">
          <Image src={preview} alt="Selected room ready for AI redesign" fill priority className="object-cover" sizes="(max-width:1024px) 100vw, 42vw" />
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-[color:var(--surface)]/92 px-3 py-2 text-xs font-bold backdrop-blur-md">
            <span className="flex items-center gap-2"><ImageSquare size={16} weight="bold" /> Before frame</span>
            <span className="text-[var(--accent)]">Ready</span>
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
          className="focus-ring mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm font-bold transition-colors hover:border-[var(--accent)] active:scale-[.99] sm:mt-3 sm:px-4 sm:py-3"
        >
          <UploadSimple size={18} weight="bold" /> Upload or drop a room photo
          <span className="font-normal text-[var(--muted)]">PNG/JPG, 10MB max</span>
        </button>
        <div className="mt-2 grid grid-cols-[auto_repeat(4,1fr)] items-center gap-2 sm:mt-3">
          <span className="text-xs font-bold text-[var(--muted)]">Try a sample</span>
          {samples.map((sample) => (
            <button
              type="button"
              key={sample.src}
              onClick={() => { setFile(null); setPreview(sample.src); setStatus("idle"); track("sample_selected", { sample: sample.name }); }}
              aria-label={`Try ${sample.name} sample`}
              className={`focus-ring relative h-11 overflow-hidden rounded-lg border-2 ${preview === sample.src && !file ? "border-[var(--accent)]" : "border-transparent"}`}
            >
              <Image src={sample.src} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      </div>

      <div className="surface min-w-0 flex flex-col p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[190px_1fr] sm:items-end">
          <label className="grid gap-1.5 text-xs font-bold text-[var(--muted)]">
            Room type
            <select value={room} onChange={(event) => { const roomType = event.target.value as typeof room; setRoom(roomType); track("room_type_selected", { roomType }); }} className="focus-ring h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm font-semibold text-[var(--ink)]">
              {roomTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div>
            <p className="mb-1.5 text-xs font-bold text-[var(--muted)]">Choose a style</p>
            <p className="text-sm font-bold">{style}</p>
          </div>
        </div>
        <div className="mt-3 grid min-w-0 max-w-full flex-1 auto-cols-[76px] grid-flow-col grid-rows-1 gap-2 overflow-x-auto pb-1 sm:grid-flow-row sm:grid-cols-5 sm:grid-rows-none sm:overflow-visible sm:pb-0">
          {styles.map((item) => (
            <button
              type="button"
              key={item.name}
              onClick={() => { setStyle(item.name); track("style_selected", { style: item.name }); }}
              className={`focus-ring group relative min-h-[62px] overflow-hidden rounded-xl border-2 text-left transition-transform active:scale-[.97] ${style === item.name ? "border-[var(--accent)]" : "border-transparent"}`}
              aria-pressed={style === item.name}
            >
              <Image src={item.image} alt={`${item.name} interior design style`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="110px" />
              <span className="absolute inset-x-0 bottom-0 bg-[rgba(10,18,14,.72)] px-1.5 py-1 text-[9px] font-bold leading-tight text-white">{item.name}</span>
              {style === item.name ? <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[var(--accent)] text-[var(--on-accent)]"><Check size={12} weight="bold" /></span> : null}
            </button>
          ))}
        </div>
        <button type="button" onClick={generate} disabled={status === "queued" || status === "processing"} className="focus-ring mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-base font-black text-[var(--on-accent)] transition-transform enabled:active:scale-[.99] disabled:cursor-wait disabled:opacity-70">
          {status === "queued" || status === "processing" ? <><FilmStrip size={20} weight="fill" /> Generating video...</> : <>{generateLabel(entitlements)} <ArrowRight size={20} weight="bold" /></>}
        </button>
        {entitlements ? <p className="mt-2 text-center text-xs font-bold text-[var(--muted)]">{creditLabel(entitlements)}</p> : null}
        {status !== "idle" ? (
          <div className={`mt-3 rounded-xl border p-3 text-sm ${status === "error" || status === "auth" || status === "upgrade" ? "border-red-500/40 bg-red-500/10" : "border-[var(--line)] bg-[var(--surface-2)]"}`} role="status">
            <div className="flex items-start gap-2">
              {status === "error" || status === "auth" || status === "upgrade" ? <WarningCircle size={18} className="mt-0.5 shrink-0" weight="bold" /> : <FilmStrip size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" weight="fill" />}
              <div className="flex-1">
                <p className="font-semibold">{message}</p>
                {status === "queued" || status === "processing" ? <GenerationSteps stage={stage} /> : null}
                {status === "auth" ? <Link href="/login?next=%2F%23generator" className="mt-2 inline-block font-bold text-[var(--accent)] underline">Continue with email</Link> : null}
                {status === "upgrade" ? <Link href="/#pricing" className="mt-2 inline-block font-bold text-[var(--accent)] underline">View plans</Link> : null}
                {status === "error" ? <button type="button" onClick={generate} className="focus-ring mt-2 font-bold text-[var(--accent)] underline">Try again</button> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function generateLabel(entitlements: UserEntitlements | null) {
  if (!entitlements || entitlements.totalCreditsRemaining > 0) return "Generate";
  return entitlements.authenticated ? "Upgrade to generate" : "Sign in to generate";
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
  const order: Record<string, number> = { queued: 0, generating_after_frame: 1, submitting_video: 2, video_submission_in_progress: 2, generating_video: 2, applying_watermark: 3, watermarking: 3, completed: 4 };
  const active = order[stage] ?? 0;
  return <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Generation progress">{stages.map((item, index) => <li key={item.key} className={`border-t-2 pt-1.5 text-[10px] font-bold ${index <= active ? "border-[var(--accent)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)]"}`}>{index < active ? <Check size={12} weight="bold" className="mb-1 text-[var(--accent)]" /> : null}{item.label}</li>)}</ol>;
}
