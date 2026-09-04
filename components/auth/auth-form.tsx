"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { track } from "@/lib/analytics/events";

export function AuthForm({ mode, returnTo = "/#generator" }: { mode: "login" | "signup"; returnTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const target = safeReturnTo(returnTo);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "signup") track("signup_started", { method: "password" });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setMessage("Supabase Auth is not configured in this environment."); return; }
    setLoading(true);
    setMessage("");
    const client = createBrowserClient(url, key);
    const result = mode === "signup"
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}` } })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }
    if (!result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      setLoading(false);
      return;
    }
    await fetch("/api/auth/claim", { method: "POST" });
    track(mode === "signup" ? "signup_completed" : "login_completed", { method: "password" });
    window.location.assign(target);
  }

  return (
    <form onSubmit={submit} className="surface mt-8 grid gap-4 p-6">
      <label className="grid gap-2 text-sm font-bold">Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="focus-ring h-12 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 font-normal text-[var(--ink)] placeholder:text-[var(--muted)]" /></label>
      <label className="grid gap-2 text-sm font-bold">Password<input required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="focus-ring h-12 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 font-normal text-[var(--ink)] placeholder:text-[var(--muted)]" /></label>
      <button disabled={loading} className="focus-ring rounded-xl bg-[var(--accent)] px-5 py-3.5 font-black text-[var(--on-accent)] disabled:opacity-60">{loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}</button>
      {message ? <p role="status" className="text-sm leading-6 text-[var(--muted)]">{message}</p> : null}
      <p className="text-sm text-[var(--muted)]">{mode === "signup" ? "Already have an account?" : "New to Roomorphic?"} <Link className="font-bold text-[var(--accent)] underline" href={`${mode === "signup" ? "/login" : "/signup"}?next=${encodeURIComponent(target)}`}>{mode === "signup" ? "Sign in" : "Create one"}</Link></p>
    </form>
  );
}

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/#generator";
}
