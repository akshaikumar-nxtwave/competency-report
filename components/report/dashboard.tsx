"use client";

import Link from "next/link";
import { COMPETENCIES } from "@/lib/competencies";
import { bestAttempt, countInterviews, getAttempts } from "@/lib/report/parse";
import { useStoredReport } from "@/lib/report/store";
import { ContentSkeleton } from "@/components/app-header";
import { NoStoredData, RefetchBar } from "./refetch-bar";

export function Dashboard({ email, name }: { email: string; name: string }) {
  const data = useStoredReport(email);
  if (data === undefined) return <ContentSkeleton />;

  const firstName = name.split(/\s+/)[0] || "there";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hi {firstName}</h1>
          <p className="mt-1 text-muted">Pick a competency to see your interview feedback.</p>
        </div>
        {data && <RefetchBar fetchedAt={data.fetchedAt} />}
      </div>

      {data === null ? (
        <NoStoredData />
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {COMPETENCIES.map((c) => {
            const count = countInterviews(data, c);
            const best = count > 0 ? bestAttempt(getAttempts(data, c)) : undefined;
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-ink">{c.title}</h2>
                  {count === 0 ? (
                    <span className="shrink-0 rounded-full bg-canvas px-2.5 py-0.5 text-xs text-muted">No interview</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
                      {count} {count === 1 ? "attempt" : "attempts"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{c.blurb}</p>
                {count > 0 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted">
                      {best ? (
                        <>
                          Best score <span className="font-semibold text-ink tabular-nums">{best.score}</span>/100
                        </>
                      ) : (
                        "Not scored yet"
                      )}
                    </span>
                    <span className="font-medium text-accent">View report →</span>
                  </div>
                )}
              </>
            );
            return (
              <li key={c.slug}>
                {count > 0 ? (
                  <Link href={`/${c.slug}`} className="block h-full rounded-2xl border border-line bg-surface p-5 transition hover:border-accent hover:shadow-sm">
                    {body}
                  </Link>
                ) : (
                  <div className="h-full rounded-2xl border border-line bg-surface p-5 opacity-75">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
