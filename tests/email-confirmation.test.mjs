import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveSiteUrl } from "../lib/site.ts";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("a newly opened signup form is immediately submit-ready and cooldown starts only after submit", () => {
  const form = source("components/auth/auth-form.tsx");
  assert.match(form, /useState\(0\)/);
  const submit = form.slice(form.indexOf("async function submit"), form.indexOf("async function resendConfirmation"));
  assert.match(submit, /if \(mode === "signup"\) setSignupCooldown\(5\)/);
  assert.ok(submit.indexOf("setPending(\"email\")") < submit.indexOf("setSignupCooldown(5)"));
  assert.doesNotMatch(form, /localStorage|sessionStorage/);
  assert.match(form, /Try again in \$\{signupCooldown\}s/);
});

test("email confirmation callback chooses exactly one supported Supabase verification flow", () => {
  const callback = source("app/auth/callback/route.ts");
  assert.match(callback, /code\s*\? await client\.auth\.exchangeCodeForSession\(code\)\s*:\s*await client\.auth\.verifyOtp/);
  assert.match(callback, /token_hash: tokenHash as string/);
  assert.match(callback, /value === "signup" \|\| value === "email"/);
  assert.doesNotMatch(callback, /exchangeCodeForSession\(code\)[\s\S]*verifyOtp[\s\S]*exchangeCodeForSession/);
});

test("missing, malformed, and expired confirmation inputs fail safely", () => {
  const [callback, login] = [source("app/auth/callback/route.ts"), source("app/login/page.tsx")];
  assert.match(callback, /tokenHash \|\| !code \? "confirmation_failed" : "oauth_failed"/);
  assert.match(login, /We couldn't confirm your email\. The link may have expired\./);
  assert.doesNotMatch(callback, /token_hash.*console|console.*token_hash|access_token/);
});

test("valid callback establishes fresh Supabase auth before redirecting", () => {
  const callback = source("app/auth/callback/route.ts");
  assert.match(callback, /if \(!result\.error && result\.data\.user\)/);
  assert.ok(callback.indexOf("result.data.user") < callback.indexOf("NextResponse.redirect(new URL(next, url.origin))"));
  assert.match(callback, /claimAnonymousUsage/);
});

test("password sign-in trusts the fresh Supabase response and has no stale confirmation cache", () => {
  const form = source("components/auth/auth-form.tsx");
  assert.match(form, /client\.auth\.signInWithPassword\(\{ email, password \}\)/);
  assert.match(form, /if \(result\.error\)/);
  assert.match(form, /if \(!result\.data\.session\)/);
  assert.doesNotMatch(form, /emailConfirmed|email_confirmed_at|setEmailConfirmed/);
  assert.doesNotMatch(form, /localStorage|sessionStorage/);
});

test("email redirect uses the trusted canonical site URL and preserves localhost in development", () => {
  assert.equal(resolveSiteUrl("http://localhost:3000", "development"), "http://localhost:3000");
  assert.equal(resolveSiteUrl("http://localhost:3000", "production"), "https://roomfacelift.com");
  const form = source("components/auth/auth-form.tsx");
  assert.match(form, /new URL\("\/auth\/callback", resolveSiteUrl\(process\.env\.NEXT_PUBLIC_SITE_URL, process\.env\.NODE_ENV\)\)/);
  assert.match(form, /emailRedirectTo: confirmationRedirect/);
  assert.doesNotMatch(form, /emailRedirectTo: `\$\{window\.location\.origin\}/);
});

test("resend confirmation uses Supabase resend with a short non-persistent cooldown", () => {
  const form = source("components/auth/auth-form.tsx");
  assert.match(form, /client\.auth\.resend\(\{/);
  assert.match(form, /type: "signup"/);
  assert.match(form, /setResendCooldown\(10\)/);
  assert.match(form, /Confirmation email sent\./);
  assert.match(form, /Resend confirmation email/);
});

test("auth fix does not import or call payment and credit fulfillment", () => {
  const auth = [source("components/auth/auth-form.tsx"), source("app/auth/callback/route.ts"), source("app/login/page.tsx")].join("\n");
  assert.doesNotMatch(auth, /creem|stripe|grantOneTimeCredits|recordPaymentOrder|credit_grants/);
});
