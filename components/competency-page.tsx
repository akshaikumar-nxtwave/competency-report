import { Suspense } from "react";
import { AppHeader, PageSkeleton } from "@/components/app-header";
import { CompetencyReport } from "@/components/report/competency-report";
import { requireStudent } from "@/lib/auth";

/** Server shell for a competency route: checks the session cookie, then the client renders from localStorage. */
export function CompetencyPage({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Shell slug={slug} />
    </Suspense>
  );
}

async function Shell({ slug }: { slug: string }) {
  const student = await requireStudent();
  return (
    <>
      <AppHeader name={student.name} email={student.email} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <CompetencyReport slug={slug} email={student.email} />
      </main>
    </>
  );
}
