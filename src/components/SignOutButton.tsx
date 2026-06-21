"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className = "btn-secondary btn-sm" }: { className?: string }) {
  return (
    <button className={className} onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </button>
  );
}
