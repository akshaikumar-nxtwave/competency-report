import { Suspense } from "react";
import { AppHeader, PageSkeleton } from "@/components/app-header";
import { Dashboard } from "@/components/report/dashboard";
import { requireStudent } from "@/lib/auth";

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const student = await requireStudent();
  return (
    <>
      <AppHeader name={student.name} email={student.email} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Dashboard email={student.email} name={student.name} />
      </main>
    </>
  );
}
