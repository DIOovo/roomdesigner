import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { googleOAuthRequest, safeReturnTo } from "../lib/auth/redirect.ts";

test("Google OAuth request uses Supabase Google provider and preserves a safe next path", () => {
  const request = googleOAuthRequest("http://localhost:3000", "/#generator");
  const callback = new URL(request.options.redirectTo);
  assert.equal(request.provider, "google");
  assert.equal(callback.origin, "http://localhost:3000");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/#generator");
});

test("auth return paths reject external, protocol-relative, and backslash redirects", () => {
  for (const unsafe of ["https://evil.example", "//evil.example/path", "/\\evil.example/path", "javascript:alert(1)", "account"]) {
    assert.equal(safeReturnTo(unsafe), "/#generator");
  }
  assert.equal(safeReturnTo("/account?page=2#generation-history-title"), "/account?page=2#generation-history-title");
});

test("auth UI starts Google OAuth through the existing Supabase browser client", () => {
  const form = source("components/auth/auth-form.tsx");
  assert.match(form, /createBrowserClient\(url, key\)/);
  assert.match(form, /client\.auth\.signInWithOAuth\(googleOAuthRequest\(window\.location\.origin, target\)\)/);
  assert.match(form, /Continue with Google/);
  assert.match(form, /Connecting to Google\.\.\./);
  assert.match(form, /Unable to start Google sign-in\. Please try again\./);
});

test("OAuth callback exchanges the code, uses Supabase user id, claims anonymous work, and redirects safely", () => {
  const callback = source("app/auth/callback/route.ts");
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /safeReturnTo\(url\.searchParams\.get\("next"\)\)/);
  assert.match(callback, /userId: result\.data\.user\.id/);
  assert.match(callback, /claimAnonymousUsage/);
  assert.match(callback, /NextResponse\.redirect\(new URL\(next, url\.origin\)\)/);
  assert.match(callback, /"confirmation_failed" : "oauth_failed"/);
  assert.doesNotMatch(callback, /access_token|localStorage|GOOGLE_CLIENT_SECRET/);
});

test("email/password authentication and automatic profile provisioning remain in place", () => {
  const form = source("components/auth/auth-form.tsx");
  const migration = source("supabase/migrations/003_auth_credits.sql");
  assert.match(form, /signInWithPassword\(\{ email, password \}\)/);
  assert.match(form, /client\.auth\.signUp/);
  assert.match(migration, /create or replace function public\.handle_new_user\(\)/i);
  assert.match(migration, /new\.id/);
  assert.match(migration, /insert into public\.profiles/i);
});

test("Google secrets are documented as Supabase-only and are not required by app code", () => {
  const setup = source("docs/google-oauth-setup.md");
  const form = source("components/auth/auth-form.tsx");
  assert.match(setup, /supabase\.co\/auth\/v1\/callback/);
  assert.match(setup, /http:\/\/localhost:3000\/auth\/callback/);
  assert.doesNotMatch(form, /GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET/);
});

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
