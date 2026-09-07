"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { googleOAuthRequest, safeReturnTo } from "@/lib/auth/redirect";
import { track } from "@/lib/analytics/events";

export function AuthForm({ mode, returnTo = "/#generator", initialMessage = "" }: { mode: "login" | "signup"; returnTo?: string; initialMessage?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [pending, setPending] = useState<"google" | "email" | null>(null);
  const target = safeReturnTo(returnTo);

  async function continueWithGoogle() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setMessage("Supabase Auth is not configured in this environment."); return; }
    setPending("google");
    setMessage("");
    if (mode === "signup") track("signup_started", { method: "google" });
    try {
      const client = createBrowserClient(url, key);
      const result = await client.auth.signInWithOAuth(googleOAuthRequest(window.location.origin, target));
      if (result.error) throw result.error;
    } catch {
      setMessage("Unable to start Google sign-in. Please try again.");
      setPending(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "signup") track("signup_started", { method: "password" });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setMessage("Supabase Auth is not configured in this environment."); return; }
    setPending("email");
    setMessage("");
    const client = createBrowserClient(url, key);
    const result = mode === "signup"
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}` } })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) {
      setMessage(result.error.message);
      setPending(null);
      return;
    }
    if (!result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      setPending(null);
      return;
    }
    await fetch("/api/auth/claim", { method: "POST" });
    track(mode === "signup" ? "signup_completed" : "login_completed", { method: "password" });
    window.location.assign(target);
  }

  return (
    <form onSubmit={submit} className="surface mt-8 grid gap-4 p-6">
      <button type="button" onClick={continueWithGoogle} disabled={pending !== null} className="focus-ring flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-white px-5 py-3.5 font-black text-[#202124] shadow-sm transition-colors hover:bg-[#f8f9fa] disabled:opacity-60">
        <GoogleMark /> {pending === "google" ? "Connecting to Google..." : "Continue with Google"}
      </button>
      <div className="flex items-center gap-3 py-1" aria-hidden="true"><span className="h-px flex-1 bg-[var(--line)]" /><span className="text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">or</span><span className="h-px flex-1 bg-[var(--line)]" /></div>
      <p className="text-sm font-black">Continue with email</p>
      <label className="grid gap-2 text-sm font-bold">Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="focus-ring h-12 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 font-normal text-[var(--ink)] placeholder:text-[var(--muted)]" /></label>
      <label className="grid gap-2 text-sm font-bold">Password<input required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="focus-ring h-12 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 font-normal text-[var(--ink)] placeholder:text-[var(--muted)]" /></label>
      <button disabled={pending !== null} className="focus-ring rounded-xl bg-[var(--accent)] px-5 py-3.5 font-black text-[var(--on-accent)] disabled:opacity-60">{pending === "email" ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}</button>
      {message ? <p role="status" className="text-sm leading-6 text-[var(--muted)]">{message}</p> : null}
      <p className="text-sm text-[var(--muted)]">{mode === "signup" ? "Already have an account?" : "New to RoomFacelift?"} <Link className="font-bold text-[var(--accent)] underline" href={`${mode === "signup" ? "/login" : "/signup"}?next=${encodeURIComponent(target)}`}>{mode === "signup" ? "Sign in" : "Create one"}</Link></p>
    </form>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>;
}
