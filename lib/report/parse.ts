import type { Competency, Rubric, SheetDef } from "../competencies";
import { field, interviewTimestamp, num, timeMinutes, type SheetRow } from "./fields";

/** Set by the server on every row: whether the result has been released to the student. */
export const RELEASED_KEY = "__released";

export type StudentData = {
  v: 1;
  email: string;
  name: string;
  fetchedAt: number;
  sheets: Record<string, SheetRow[]>;
};

export type SkillResult = {
  id: string;
  title: string;
  tag?: string;
  /** null when the skill wasn't assessed in this interview. */
  rating: number | null;
  observed: string;
  nextLevel: string | null;
  remarks: string;
};

export type IntegrityCheck = { label: string; passed: boolean };

export type Interview = {
  key: string;
  /** 1 = the student's first attempt in this competency. */
  attemptNo: number;
  format?: string;
  round: string;
  date: string;
  time: string;
  status: string;
  released: boolean;
  score: number | null;
  verdictBand: string;
  clearance: string;
  level: string;
  placementEligible: boolean;
  overallFeedback: string;
  integrityScore: number | null;
  integrityChecks: IntegrityCheck[];
  integrityRemarks: string;
  skills: SkillResult[];
};

/** "Card 1 — HTML & CSS: 3 - Flexbox basics…\nHTML & CSS Remarks: …\nDomain Rating: 3" */
function parseCard(text: string): { rating: number | null; observed: string; inlineRemarks: string } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const m = (lines[0] ?? "").match(/:\s*(\d+(?:\.\d+)?)\s*-\s*(.+)$/);
  const inlineRemarks =
    lines.find((l) => /remarks\s*:/i.test(l))?.replace(/^.*?remarks\s*:\s*/i, "").trim() ?? "";
  return { rating: m ? Number(m[1]) : null, observed: m?.[2]?.trim() ?? "", inlineRemarks };
}

/** "Student camera is ON: 1 - Yes | … \nDomain Rating: 0.9" */
function parseIntegrity(text: string): IntegrityCheck[] {
  const body = text.split(/\n\s*Domain Rating/i)[0] ?? "";
  return body
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.lastIndexOf(":");
      const label = (idx >= 0 ? part.slice(0, idx) : part).trim();
      const answer = (idx >= 0 ? part.slice(idx + 1) : "").trim();
      return { label, passed: /^1\b|yes/i.test(answer) };
    });
}

function nextLevel(rubric: Rubric, rating: number | null): string | null {
  if (rating === null) return null;
  const level = Math.round(rating);
  return level < 5 ? rubric[level + 1] ?? null : null;
}

function toInterview(row: SheetRow, sheet: SheetDef, multiFormat: boolean): Omit<Interview, "attemptNo"> {
  const skills: SkillResult[] = sheet.skills.map((skill) => {
    const key = skill.key ?? skill.column;
    const card = parseCard(field(row, skill.column));
    const rating = num(field(row, `${key} – Domain Rating`)) ?? card.rating;
    const level = rating === null ? null : Math.round(rating);
    return {
      id: skill.id,
      title: skill.title,
      tag: skill.tag,
      rating,
      observed: card.observed || (level !== null ? skill.rubric[level] ?? "" : ""),
      nextLevel: nextLevel(skill.rubric, rating),
      remarks: field(row, `${key} – Remarks`) || card.inlineRemarks,
    };
  });

  const score100 = num(field(row, "Overall Score (out of 100)"));
  const score5 = num(field(row, "Overall Score", "Final Verdict"));

  return {
    key: [sheet.name, field(row, "UID"), field(row, "Date"), field(row, "Time")].join("|"),
    format: multiFormat ? sheet.label ?? sheet.name : undefined,
    round: field(row, "Round"),
    date: field(row, "Date"),
    time: field(row, "Time"),
    status: (field(row, "Status") || "scheduled").toLowerCase(),
    released: row[RELEASED_KEY] !== "no",
    score: score100 ?? (score5 !== null ? Math.round(score5 * 20) : null),
    verdictBand: field(row, "Verdict Band"),
    clearance: field(row, "Clearance Status"),
    level: field(row, "Levels", "Level"),
    placementEligible: /^yes/i.test(field(row, "Eligible for Placement Pool", "Elgible for Placement Pool")),
    overallFeedback: field(
      row,
      "Overall Feedback",
      "Overall Feedback – Remarks",
      "Overall Remarks",
      "Overall Remarks – Remarks",
    ).replace(/^overall remarks\s*:\s*/i, ""),
    integrityScore: num(field(row, "Integrity Score")),
    integrityChecks: parseIntegrity(field(row, "Interview Integrity")),
    integrityRemarks: field(row, "Interview Integrity – Remarks"),
    skills,
  };
}

function sortValue(i: { date: string; time: string }): number {
  return interviewTimestamp(i.date) + timeMinutes(i.time) * 60_000;
}

/** Every attempt the student has in a competency, newest first. */
export function getAttempts(data: StudentData, competency: Competency): Interview[] {
  const multiFormat = competency.sheets.length > 1;
  return competency.sheets
    .flatMap((sheet) => (data.sheets[sheet.name] ?? []).map((row) => toInterview(row, sheet, multiFormat)))
    .sort((a, b) => sortValue(a) - sortValue(b))
    .map((interview, i) => ({ ...interview, attemptNo: i + 1 }))
    .reverse();
}

export function isScored(i: Interview): boolean {
  return i.status === "completed" && i.released && i.score !== null;
}

/** Highest-scoring released attempt; the more recent one wins a tie. */
export function bestAttempt(attempts: Interview[]): Interview | undefined {
  let best: Interview | undefined;
  for (const a of attempts) {
    if (isScored(a) && (!best || (a.score ?? 0) > (best.score ?? 0))) best = a;
  }
  return best;
}

export function countInterviews(data: StudentData, competency: Competency): number {
  return competency.sheets.reduce((n, s) => n + (data.sheets[s.name]?.length ?? 0), 0);
}
