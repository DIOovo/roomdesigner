"use client";

export function SignOutButton() {
  return <form action="/api/auth/signout" method="post"><button className="focus-ring text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">Sign out</button></form>;
}
