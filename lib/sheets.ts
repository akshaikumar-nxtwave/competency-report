import { ALL_SHEET_NAMES } from "./competencies";
import { field, normalizeKey, type SheetRow } from "./report/fields";
import { RELEASED_KEY, type StudentData } from "./report/parse";

type SheetsResponse = {
  ok: boolean;
  data?: Record<string, { count: number; rows: SheetRow[] }>;
  errors?: Record<string, string>;
};

/** Internal columns that never leave the server. */
const PRIVATE_COLUMNS = new Set(
  [
    "",
    "Interviewer",
    "Meet Link",
    "Recording Link",
    "Transcript Link",
    "AI Report",
    "Comments",
    "Questions Asked",
    "Auditing Status",
    "Audit Remarks",
    "Feedback Submitted At",
    "Candidate Offline Cleared Date",
    "Program",
    "Template",
    "Partial Completion Reason",
  ].map(normalizeKey),
);

/** Columns kept for an interview whose result hasn't been released yet. */
const UNRELEASED_COLUMNS = new Set(["UID", "Candidate Name", "Candidate Email", "Round", "Date", "Time", "Status"].map(normalizeKey));

function sanitize(row: SheetRow): SheetRow {
  const completed = field(row, "Status").toLowerCase() === "completed";
  const released = !completed || process.env.REPORT_REQUIRE_SHARED === "false" || field(row, "Result shared with students status") !== "";

  const clean: SheetRow = {};
  for (const [k, v] of Object.entries(row)) {
    const key = normalizeKey(k);
    const value = String(v ?? "").trim();
    if (!value || PRIVATE_COLUMNS.has(key)) continue;
    if (!released && !UNRELEASED_COLUMNS.has(key)) continue;
    clean[k] = value;
  }
  clean[RELEASED_KEY] = released ? "yes" : "no";
  return clean;
}

/** The same interview can appear more than once; keep the most complete copy. */
function dedupe(rows: SheetRow[]): SheetRow[] {
  const byKey = new Map<string, SheetRow>();
  for (const row of rows) {
    const key = ["UID", "Date", "Time", "Status"].map((c) => field(row, c).toLowerCase()).join("|");
    const existing = byKey.get(key);
    if (!existing || Object.keys(row).length > Object.keys(existing).length) byKey.set(key, row);
  }
  return [...byKey.values()];
}

/**
 * Fetches one student's interviews across every competency sheet. Only called on
 * login and when the student presses Refetch; the result is kept in localStorage.
 */
export async function fetchStudentData(email: string): Promise<StudentData> {
  const base = process.env.SHEETS_API_URL;
  if (!base) throw new Error("SHEETS_API_URL is not set");

  const url = new URL(base);
  url.searchParams.set("email", email);
  url.searchParams.set("sheets", ALL_SHEET_NAMES.join(","));

  const res = await fetch(url, { redirect: "follow", cache: "no-store" });
  if (!res.ok) throw new Error(`Sheets API responded ${res.status}`);

  const json = (await res.json()) as SheetsResponse;
  if (!json.ok || !json.data) throw new Error(`Sheets API error: ${JSON.stringify(json.errors ?? {})}`);

  const sheets: StudentData["sheets"] = {};
  let name = "";
  for (const [sheet, { rows }] of Object.entries(json.data)) {
    sheets[sheet] = dedupe((rows ?? []).map(sanitize));
    name ||= field(sheets[sheet][0] ?? {}, "Candidate Name");
  }

  return { v: 1, email, name, fetchedAt: Date.now(), sheets };
}

export function hasInterviews(data: StudentData): boolean {
  return Object.values(data.sheets).some((rows) => rows.length > 0);
}
