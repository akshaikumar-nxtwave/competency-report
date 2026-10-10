import { formatDate } from "@/lib/report/fields";
import type { Interview, SkillResult } from "@/lib/report/parse";
import { PrintButton } from "@/components/print-button";
import { ExpandableText } from "./expandable-text";

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  no_show: {
    title: "You missed this interview",
    body: "This interview was marked as a no-show, so there's no feedback for it. Reach out to your coordinator to reschedule.",
  },
  cancelled: {
    title: "This interview was cancelled",
    body: "There's no feedback for a cancelled interview. Your coordinator will share a new slot.",
  },
  scheduled: {
    title: "Interview scheduled",
    body: "Your feedback will appear here after the interview is completed and reviewed.",
  },
};

export function InterviewMeta({ interview }: { interview: Interview }) {
  return (
    <p className="text-sm text-muted">
      {[
        interview.format,
        interview.round,
        `${formatDate(interview.date)}${interview.time ? `, ${interview.time}` : ""}`,
        `Attempt ${interview.attemptNo}`,
      ]
        .filter(Boolean)
        .join(" · ")}
    </p>
  );
}

export function InterviewReport({ interview }: { interview: Interview }) {
  if (interview.status !== "completed") {
    const msg = STATUS_MESSAGES[interview.status] ?? STATUS_MESSAGES.scheduled;
    return (
      <>
        <InterviewMeta interview={interview} />
        <Notice title={msg.title} body={msg.body} />
      </>
    );
  }

  if (!interview.released) {
    return (
      <>
        <InterviewMeta interview={interview} />
        <Notice
          title="Your report is being finalised"
          body="Your interview is complete. Feedback is reviewed before it's shared, and will show up here once it's released."
        />
      </>
    );
  }

  const assessed = interview.skills.filter((s) => s.rating !== null);
  const strengths = assessed.filter((s) => (s.rating ?? 0) >= 4);
  const focus = assessed.filter((s) => (s.rating ?? 0) <= 2).sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InterviewMeta interview={interview} />
        <PrintButton />
      </div>

      <Summary interview={interview} />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-3">
          <h2 className="font-semibold">Skill profile</h2>
          <p className="mt-0.5 text-sm text-muted">Each skill is rated on a 0–5 rubric.</p>
          <ul className="mt-5 space-y-3.5">
            {interview.skills.map((s) => (
              <SkillBar key={s.id} skill={s} />
            ))}
          </ul>
        </section>

        <section className="space-y-6 lg:col-span-2">
          <Highlights title="Strengths" tone="good" items={strengths} empty="Keep practising — skills rated 4 or above will show up here." />
          <Highlights
            title="Focus areas"
            tone="bad"
            items={focus}
            empty="No skill was rated 2 or below. Use the next-level guidance below to keep improving."
          />
        </section>
      </div>

      {interview.overallFeedback && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="font-semibold">Overall feedback</h2>
          <div className="mt-3 border-l-2 border-accent pl-4 text-ink/90">
            <ExpandableText text={interview.overallFeedback} lines={4} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Skill-by-skill feedback</h2>
        <div className="mt-4 grid gap-4">
          {interview.skills.map((s) => (
            <SkillCard key={s.id} skill={s} />
          ))}
        </div>
      </section>

      {interview.integrityChecks.length > 0 && <Integrity interview={interview} />}
    </>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-8">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-prose text-muted">{body}</p>
    </div>
  );
}

export function verdictTone(band: string): string {
  const b = band.toLowerCase();
  if (b.includes("strong")) return "bg-good-soft text-good";
  if (b.includes("medium")) return "bg-accent-soft text-accent";
  if (b.includes("low")) return "bg-warn-soft text-warn";
  return "bg-bad-soft text-bad";
}

export function isCleared(clearance: string): boolean {
  return /^cleared/i.test(clearance);
}

function Summary({ interview }: { interview: Interview }) {
  const score = interview.score;
  return (
    <section className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-[1.2fr_1fr_1fr]">
      <div className="bg-surface p-5 sm:p-6">
        <p className="text-sm text-muted">Overall score</p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="text-5xl font-semibold tabular-nums tracking-tight">{score ?? "—"}</span>
          <span className="text-muted">/ 100</span>
        </p>
        {score !== null && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-canvas" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
          </div>
        )}
      </div>

      <div className="bg-surface p-5 sm:p-6">
        <p className="text-sm text-muted">Result</p>
        {interview.clearance ? (
          <p
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              isCleared(interview.clearance) ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
            }`}
          >
            {interview.clearance}
          </p>
        ) : (
          <p className="mt-2 text-muted">Pending</p>
        )}
        {interview.verdictBand && (
          <p className="mt-3 text-sm">
            <span className="text-muted">Verdict: </span>
            <span className={`rounded px-1.5 py-0.5 font-medium ${verdictTone(interview.verdictBand)}`}>{interview.verdictBand}</span>
          </p>
        )}
      </div>

      <div className="bg-surface p-5 sm:p-6">
        <p className="text-sm text-muted">Level achieved</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{interview.level || "—"}</p>
        {interview.placementEligible && <p className="mt-3 text-sm font-medium text-good">✓ Eligible for placement pool</p>}
      </div>
    </section>
  );
}

function ratingTone(rating: number): string {
  if (rating >= 4) return "bg-good";
  if (rating >= 3) return "bg-accent";
  if (rating >= 2) return "bg-warn";
  return "bg-bad";
}

function SkillTitle({ skill }: { skill: SkillResult }) {
  return (
    <>
      {skill.tag && (
        <span className="mr-1.5 rounded bg-canvas px-1.5 py-0.5 align-[1px] text-[11px] font-medium text-muted">{skill.tag}</span>
      )}
      {skill.title}
    </>
  );
}

function SkillBar({ skill }: { skill: SkillResult }) {
  return (
    <li className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_2.5rem]">
      <span className="truncate text-ink">
        <SkillTitle skill={skill} />
      </span>
      {skill.rating === null ? (
        <span className="text-xs text-muted">Not assessed</span>
      ) : (
        <span className="h-2.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
          <span className={`block h-full rounded-full ${ratingTone(skill.rating)}`} style={{ width: `${Math.max(4, (skill.rating / 5) * 100)}%` }} />
        </span>
      )}
      <span className="text-right font-medium tabular-nums">{skill.rating ?? "–"}</span>
    </li>
  );
}

function Highlights({ title, tone, items, empty }: { title: string; tone: "good" | "bad"; items: SkillResult[]; empty: string }) {
  const dot = tone === "good" ? "bg-good" : "bg-bad";
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((s) => (
            <li key={s.id} className="flex gap-2.5 text-sm">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
              <span>
                <span className="font-medium">
                  <SkillTitle skill={s} />
                </span>
                <span className="text-muted"> · {s.rating}/5</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RatingSteps({ rating }: { rating: number }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`h-1.5 w-5 rounded-full ${n <= rating ? ratingTone(rating) : "bg-line"}`} />
      ))}
    </span>
  );
}

function SkillCard({ skill }: { skill: SkillResult }) {
  if (skill.rating === null) {
    return (
      <article className="rounded-2xl border border-dashed border-line bg-surface/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">
            <SkillTitle skill={skill} />
          </h3>
          <span className="text-xs text-muted">Not assessed in this interview</span>
        </div>
      </article>
    );
  }

  const topLevel = Math.round(skill.rating) >= 5;

  return (
    <article className="break-inside-avoid rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">
          <SkillTitle skill={skill} />
        </h3>
        <div className="flex items-center gap-3">
          <RatingSteps rating={skill.rating} />
          <span className="font-semibold tabular-nums">{skill.rating}/5</span>
        </div>
      </div>

      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Where you are</dt>
          <dd className="mt-1">{skill.observed || "—"}</dd>
        </div>
        {(skill.nextLevel || topLevel) && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">{topLevel ? "Next step" : "To reach the next level"}</dt>
            <dd className="mt-1">{skill.nextLevel ?? "Top of the rubric — keep this sharp with real projects."}</dd>
          </div>
        )}
      </dl>

      {skill.remarks && (
        <div className="mt-4 rounded-xl bg-canvas p-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Interviewer remarks</p>
          <div className="mt-1">
            <ExpandableText text={skill.remarks} />
          </div>
        </div>
      )}
    </article>
  );
}

function Integrity({ interview }: { interview: Interview }) {
  const failed = interview.integrityChecks.filter((c) => !c.passed);
  return (
    <section className="mt-8 break-inside-avoid rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Interview setup &amp; integrity</h2>
        {interview.integrityScore !== null && (
          <span className="text-sm text-muted">
            Score <span className="font-semibold text-ink">{interview.integrityScore}</span> / 5
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted">
        {failed.length === 0
          ? "Your setup met every requirement."
          : `${failed.length} ${failed.length === 1 ? "check was" : "checks were"} not met — please fix ${failed.length === 1 ? "it" : "these"} for your next interview.`}
      </p>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {interview.integrityChecks.map((c) => (
          <li key={c.label} className="flex items-start gap-2">
            <span className={`mt-0.5 font-semibold ${c.passed ? "text-good" : "text-bad"}`} aria-hidden>
              {c.passed ? "✓" : "✕"}
            </span>
            <span className={c.passed ? "" : "font-medium"}>
              {c.label}
              <span className="sr-only">{c.passed ? " — met" : " — not met"}</span>
            </span>
          </li>
        ))}
      </ul>
      {interview.integrityRemarks && (
        <div className="mt-4 rounded-xl bg-canvas p-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Interviewer remarks</p>
          <div className="mt-1">
            <ExpandableText text={interview.integrityRemarks} />
          </div>
        </div>
      )}
    </section>
  );
}
