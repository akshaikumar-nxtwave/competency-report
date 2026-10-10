import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export function AppHeader({ name, email }: { name: string; email: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-ink">
          Interview Report
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-ink">{name}</p>
            <p className="text-xs text-muted">{email}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

export function HeaderSkeleton() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-[57px] max-w-5xl items-center px-4 sm:px-6">
        <span className="font-semibold tracking-tight text-ink">Interview Report</span>
      </div>
    </header>
  );
}

export function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading">
      <div className="h-8 w-64 rounded bg-line" />
      <div className="h-4 w-96 max-w-full rounded bg-line" />
      <div className="mt-8 h-40 rounded-2xl bg-line/60" />
      <div className="h-40 rounded-2xl bg-line/60" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <ContentSkeleton />
      </main>
    </>
  );
}
