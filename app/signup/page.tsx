import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { privatePageRobots } from "@/lib/seo";

export const metadata: Metadata = { title: "Create Account", description: "Create a Roomorphic account and claim your remaining free room transformation preview.", robots: privatePageRobots };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <main className="shell py-20"><div className="mx-auto max-w-lg"><h1 className="text-5xl font-black tracking-[-0.05em]">Create your Roomorphic account.</h1><p className="mt-5 leading-7 text-[var(--muted)]">Keep your first anonymous result and unlock your second lifetime free preview.</p><AuthForm mode="signup" returnTo={(await searchParams).next} /></div></main>;
}
