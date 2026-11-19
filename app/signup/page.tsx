import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { privatePageRobots } from "@/lib/seo";

export const metadata: Metadata = { title: "Create Account", description: "Create a RoomFacelift account to purchase credits and manage transformations.", robots: privatePageRobots };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <main className="shell py-20"><div className="mx-auto max-w-lg"><h1 className="text-5xl font-black tracking-[-0.05em]">Create your RoomFacelift account.</h1><p className="mt-5 leading-7 text-[var(--muted)]">Create an account to purchase credits and keep your results together.</p><AuthForm mode="signup" returnTo={(await searchParams).next} /></div></main>;
}
