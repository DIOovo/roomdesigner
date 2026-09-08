import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveSiteUrl } from "../lib/site.ts";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("a newly opened signup form is immediately submit-ready and cooldown starts only after Supabase responds", () => {
  const form = source("components/auth/auth-form.tsx");
  assert.match(form, /useState\(0\)/);
  const submit = form.slice(form.indexOf("async function submit"), form.indexOf("async function resendConfirmation"));
  const signupCall = submit.indexOf("await client.auth.signUp");
  const errorBranch = submit.indexOf("if (result.error)");
  const acceptedCooldown = submit.lastIndexOf('if (mode === "signup") setSignupCooldown(5)');
  assert.ok(signupCall > -1);
  assert.doesNotMatch(submit.slice(0, signupCall), /setSignupCooldown\(5\)/);
  assert.ok(signupCall < errorBranch);
  assert.ok(errorBranch < acceptedCooldown);
  assert.doesNotMatch(form, /localStorage|sessionStorage/);
  assert.match(form, /Try again in \$\{signupCooldown\}s/);
});

test("signup loading wins over cooldown text and ordinary failures restore the button", () => {
  const form = source("components/auth/auth-form.tsx");
  const button = form.slice(form.indexOf("<button disabled={pending"), form.indexOf("</button>", form.indexOf("<button disabled={pending")));
  const buttonLabel = button.slice(button.indexOf(">") + 1);
  assert.ok(buttonLabel.indexOf('pending === "email"') < buttonLabel.indexOf("signupCooldown > 0"));
  assert.match(button, /pending === "email" \? "Please wait\.\.\."/);
  const errorBranch = form.slice(form.indexOf("if (result.error)"), form.indexOf("if (mode === \"signup\") setSignupCooldown(5)", form.indexOf("if (result.error)")));
  assert.match(errorBranch, /if \(mode === "signup" && rateLimited\) setSignupCooldown\(signupRateLimitCooldown\(result\.error\.message\)\)/);
  assert.match(errorBranch, /setMessage\(emailNotConfirmed \? "Email not confirmed\." : result\.error\.message\)/);
  assert.match(errorBranch, /setPending\(null\)/);
  assert.match(form, /message\.match\(\/\(\?:after\|in\)\\s\+\(\\d\+\)/);
  assert.match(form, /if \(!retryDelay\) return 5/);
});

test("accepted signup shows a confirmation state and exposes a separate resend action", () => {
  const form = source("components/auth/auth-form.tsx");
  assert.match(form, /Check your email\\nWe sent a confirmation link to your email address\./);
  assert.match(form, /whitespace-pre-line/);
  assert.match(form, /setShowResend\(mode === "signup"\)/);
  assert.match(form, /Resend confirmation email/);
});

test("development signup logs expose acceptance or safe Supabase errors without secrets", () => {
  const form = source("components/auth/auth-form.tsx");
  const logger = form.slice(form.indexOf("function logSignupResponse"), form.indexOf("function emailConfirmationRedirect"));
  assert.match(logger, /process\.env\.NODE_ENV === "production"/);
  assert.match(logger, /accepted: false/);
  assert.match(logger, /errorCode: result\.error\.code/);
  assert.match(logger, /errorMessage: result\.error\.message/);
  assert.match(logger, /accepted: true/);
  assert.match(logger, /confirmationRequired: !result\.data\.session/);
  assert.doesNotMatch(logger, /password|access.?token|refresh.?token|email,/i);
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
