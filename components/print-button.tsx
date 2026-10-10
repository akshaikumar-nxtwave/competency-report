"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:bg-canvas"
    >
      Download PDF
    </button>
  );
}
