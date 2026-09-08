"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { googleOAuthRequest, safeReturnTo } from "@/lib/auth/redirect";
import { track } from "@/lib/analytics/events";
import { resolveSiteUrl } from "@/lib/site";

export function AuthForm({ mode, returnTo = "/#generator", initialMessage = "" }: { mode: "login" | "signup"; returnTo?: string; initialMessage?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [pending, setPending] = useState<"google" | "email" | "resend" | null>(null);
  const [signupCooldown, setSignupCooldown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showResend, setShowResend] = useState(false);
  const target = safeReturnTo(returnTo);

  useEffect(() => {
    if (signupCooldown <= 0) return;
    const timer = window.setTimeout(() => setSignupCooldown((seconds) => Math.max(0, seconds - 1)), 1_000);
    return () => window.clearTimeout(timer);
  }, [signupCooldown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1_000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

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
    setShowResend(false);
    try {
      const client = createBrowserClient(url, key);
      const confirmationRedirect = emailConfirmationRedirect(target);
      const result = mode === "signup"
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: confirmationRedirect } })
        : await client.auth.signInWithPassword({ email, password });

      if (mode === "signup") logSignupResponse(result);

      if (result.error) {
        const emailNotConfirmed = result.error.code === "email_not_confirmed" || /email not confirmed/i.test(result.error.message);
        const rateLimited = result.error.status === 429 || result.error.code === "over_email_send_rate_limit" || /only request this after|too many requests|rate limit/i.test(result.error.message);
        if (mode === "signup" && rateLimited) setSignupCooldown(signupRateLimitCooldown(result.error.message));
        setMessage(emailNotConfirmed ? "Email not confirmed." : result.error.message);
        setShowResend(emailNotConfirmed);
        setPending(null);
        return;
      }

      if (mode === "signup") setSignupCooldown(5);
      if (!result.data.session) {
        setMessage("Check your email\nWe sent a confirmation link to your email address.");
        setShowResend(mode === "signup");
        setPending(null);
        return;
      }
      await fetch("/api/auth/claim", { method: "POST" });
      track(mode === "signup" ? "signup_completed" : "login_completed", { method: "password" });
      window.location.assign(target);
    } catch (error) {
      if (mode === "signup" && process.env.NODE_ENV !== "production") {
        console.warn("Supabase signup request failed", {
          errorMessage: error instanceof Error ? error.message : "Unknown request failure",
        });
      }
      setMessage("Unable to reach the authentication service. Please try again.");
      setPending(null);
    }
  }

  async function resendConfirmation() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || !email || resendCooldown > 0) return;
    setPending("resend");
    setResendCooldown(10);
    const client = createBrowserClient(url, key);
    const result = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: emailConfirmationRedirect(target) },
    });
    setMessage(result.error ? (/only request this after|rate limit/i.test(result.error.message) ? "Please wait a moment before trying again." : "Unable to resend confirmation email. Please try again.") : "Confirmation email sent.");
    setPending(null);
  }

  return (
    <form onSubmit={submit} className="surface soft-shadow mt-8 grid gap-4 border-transparent p-6 sm:p-7">
      <button type="button" onClick={continueWithGoogle} disabled={pending !== null} className="focus-ring flex min-h-12 items-center justify-center gap-3 rounded-lg border border-[var(--line)] bg-white px-5 py-3.5 font-black text-[#202124] hover:border-[#b8bcb9] hover:bg-[#f8f9fa] disabled:opacity-60">
        <GoogleMark /> {pending === "google" ? "Connecting to Google..." : "Continue with Google"}
      </button>
      <div className="flex items-center gap-3 py-1" aria-hidden="true"><span className="h-px flex-1 bg-[var(--line)]" /><span className="text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">or</span><span className="h-px flex-1 bg-[var(--line)]" /></div>
      <p className="text-sm font-black">Continue with email</p>
      <label className="grid gap-2 text-sm font-bold">Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="focus-ring h-12 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 font-normal text-[var(--ink)] hover:border-[var(--accent)] placeholder:text-[var(--muted)]" /></label>
      <label className="grid gap-2 text-sm font-bold">Password<input required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="focus-ring h-12 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 font-normal text-[var(--ink)] hover:border-[var(--accent)] placeholder:text-[var(--muted)]" /></label>
      <button disabled={pending !== null || (mode === "signup" && signupCooldown > 0)} className="focus-ring rounded-lg bg-[var(--accent)] px-5 py-3.5 font-black text-[var(--on-accent)] shadow-[0_10px_24px_rgba(18,75,55,.18)] hover:bg-[var(--accent-strong)] disabled:opacity-60 disabled:shadow-none">{pending === "email" ? "Please wait..." : mode === "signup" && signupCooldown > 0 ? `Try again in ${signupCooldown}s` : mode === "signup" ? "Create account" : "Sign in"}</button>
      {message ? <p role="status" className="whitespace-pre-line text-sm leading-6 text-[var(--muted)]">{message}</p> : null}
      {showResend ? <button type="button" onClick={resendConfirmation} disabled={pending !== null || resendCooldown > 0} className="focus-ring justify-self-start text-sm font-bold text-[var(--accent)] underline disabled:text-[var(--muted)]">{pending === "resend" ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend confirmation email"}</button> : null}
      <p className="text-sm text-[var(--muted)]">{mode === "signup" ? "Already have an account?" : "New to RoomFacelift?"} <Link className="font-bold text-[var(--accent)] underline" href={`${mode === "signup" ? "/login" : "/signup"}?next=${encodeURIComponent(target)}`}>{mode === "signup" ? "Sign in" : "Create one"}</Link></p>
    </form>
  );
}

function logSignupResponse(result: { data: { session: unknown }; error: { code?: string; message: string } | null }) {
  if (process.env.NODE_ENV === "production") return;
  if (result.error) {
    console.warn("Supabase signup response", {
      accepted: false,
      errorCode: result.error.code ?? "unknown",
      errorMessage: result.error.message,
    });
    return;
  }
  console.info("Supabase signup response", {
    accepted: true,
    confirmationRequired: !result.data.session,
  });
}

function signupRateLimitCooldown(message: string) {
  const retryDelay = message.match(/(?:after|in)\s+(\d+)\s*(?:seconds?|secs?|s)\b/i)?.[1];
  if (!retryDelay) return 5;
  return Math.max(1, Number(retryDelay));
}

function emailConfirmationRedirect(target: string) {
  const callback = new URL("/auth/callback", resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV));
  callback.searchParams.set("next", safeReturnTo(target));
  return callback.toString();
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>;
}
