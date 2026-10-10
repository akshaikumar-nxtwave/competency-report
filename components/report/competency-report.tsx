"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { getCompetency } from "@/lib/competencies";
import { formatDate } from "@/lib/report/fields";
import { bestAttempt, getAttempts, isScored, type Interview } from "@/lib/report/parse";
import { useStoredReport } from "@/lib/report/store";
import { ContentSkeleton } from "@/components/app-header";
import { InterviewReport, isCleared, verdictTone } from "./interview-report";
import { NoStoredData, RefetchBar } from "./refetch-bar";

type Tab = "best" | "latest" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "best", label: "Best" },
  { id: "latest", label: "Latest" },
  { id: "history", label: "History" },
];

export function CompetencyReport({ slug, email }: { slug: string; email: string }) {
  const competency = getCompetency(slug);
  const data = useStoredReport(email);
  const [tab, setTab] = useState<Tab>("best");
  const [selected, setSelected] = useState<string | null>(null);
  const baseId = useId();

  if (data === undefined) return <ContentSkeleton />;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <Link href="/" className="no-print text-sm text-muted hover:text-ink">
          ← All competencies
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{competency.title}</h1>
      </div>
      {data && <RefetchBar fetchedAt={data.fetchedAt} />}
    </div>
  );

  if (data === null) {
    return (
      <>
        {header}
        <NoStoredData />
      </>
    );
  }

  const attempts = getAttempts(data, competency);
  if (attempts.length === 0) {
    return (
      <>
        {header}
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-medium">No {competency.title} interview yet</p>
          <p className="mt-1 text-sm text-muted">Once you take this interview, your feedback will appear here. Use Refetch to check for new results.</p>
        </div>
      </>
    );
  }

  const latest = attempts[0];
  const best = bestAttempt(attempts);
  const historyPick = attempts.find((a) => a.key === selected);

  return (
    <>
      {header}

      <div role="tablist" aria-label={`${competency.title} reports`} className="no-print mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              id={`${baseId}-${t.id}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              onClick={() => {
                setTab(t.id);
                setSelected(null);
              }}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.id === "history" && <span className="ml-1.5 rounded-full bg-canvas px-1.5 text-xs text-muted">{attempts.length}</span>}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${tab}`} className="mt-6">
        {tab === "best" &&
          (best ? (
            <>
              {best.key === latest.key && attempts.length > 1 && (
                <p className="mb-4 rounded-lg bg-good-soft px-3 py-2 text-sm text-good">Your latest interview is also your best so far.</p>
              )}
              <InterviewReport interview={best} />
            </>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-8">
              <p className="font-semibold">No scored interview yet</p>
              <p className="mt-1 text-muted">Your best result will show here once a completed interview has been reviewed and released.</p>
            </div>
          ))}

        {tab === "latest" && <InterviewReport interview={latest} />}

        {tab === "history" &&
          (historyPick ? (
            <>
              <button type="button" onClick={() => setSelected(null)} className="no-print mb-4 text-sm text-muted hover:text-ink">
                ← Back to all attempts
              </button>
              <InterviewReport interview={historyPick} />
            </>
          ) : (
            <History attempts={attempts} bestKey={best?.key} onOpen={setSelected} />
          ))}
      </div>
    </>
  );
}

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Cancelled",
};

function History({ attempts, bestKey, onOpen }: { attempts: Interview[]; bestKey?: string; onOpen: (key: string) => void }) {
  const showFormat = attempts.some((a) => a.format);
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">#</th>
            <th scope="col" className="px-4 py-3 font-medium">Date</th>
            {showFormat && <th scope="col" className="px-4 py-3 font-medium">Format</th>}
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Score</th>
            <th scope="col" className="px-4 py-3 font-medium">Result</th>
            <th scope="col" className="px-4 py-3 font-medium">Level</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {attempts.map((a) => {
            const scored = isScored(a);
            const status = a.status === "completed" && !a.released ? "Under review" : STATUS_LABEL[a.status] ?? "Scheduled";
            return (
              <tr key={a.key} className="hover:bg-canvas/60">
                <td className="px-4 py-3 tabular-nums text-muted">{a.attemptNo}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {formatDate(a.date)}
                  {a.key === bestKey && <span className="ml-2 rounded bg-good-soft px-1.5 py-0.5 text-xs font-medium text-good">Best</span>}
                </td>
                {showFormat && <td className="px-4 py-3 text-muted">{a.format}</td>}
                <td className="px-4 py-3">{status}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{scored ? a.score : "—"}</td>
                <td className="px-4 py-3">
                  {scored && a.clearance ? (
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${isCleared(a.clearance) ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
                      {a.clearance}
                    </span>
                  ) : scored && a.verdictBand ? (
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${verdictTone(a.verdictBand)}`}>{a.verdictBand}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{scored ? a.level || "—" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => onOpen(a.key)} className="font-medium text-accent hover:underline">
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
