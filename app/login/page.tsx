import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { privatePageRobots } from "@/lib/seo";
export const metadata: Metadata = { title: "Sign In", description: "Sign in to RoomFacelift to use your second free preview, manage credits, and access paid exports.", robots: privatePageRobots };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; confirmed?: string }> }) {
  const query = await searchParams;
  const initialMessage = query.confirmed === "1"
    ? "Email confirmed. You can sign in now."
    : query.error === "confirmation_failed"
      ? "We couldn't confirm your email. The link may have expired."
      : query.error
        ? "Unable to complete sign-in. Please try again."
        : "";
  return <main className="shell py-20"><div className="mx-auto max-w-lg"><h1 className="text-5xl font-black tracking-[-0.05em]">Sign in to keep creating.</h1><p className="mt-5 leading-7 text-[var(--muted)]">Your first preview needs no account. Sign in to claim the second and keep your results together.</p><AuthForm mode="login" returnTo={query.next} initialMessage={initialMessage} /></div></main>;
}
