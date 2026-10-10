"use client";

import { logout } from "@/app/actions";
import { clearReport } from "@/lib/report/store";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        clearReport();
        await logout();
      }}
    >
      <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas">
        Sign out
      </button>
    </form>
  );
}
