// Content written in the dashboard sometimes uses Markdown-style **bold** (most
// campaign titles are wrapped in it). These helpers turn that marker into real
// bold in the UI (see components/InlineBold.tsx) and remove it wherever bold
// can't be shown: page titles, metadata, alt text, search, analytics.

const BOLD_PAIR = /\*\*([\s\S]+?)\*\*/g;

export type BoldSegment = { text: string; bold: boolean };

/** Split text on **…** pairs. Unpaired `**` is dropped, not shown. */
export function splitBoldMarkers(input: string | null | undefined): BoldSegment[] {
  const text = input ?? "";
  if (!text.includes("**")) return text ? [{ text, bold: false }] : [];
  const out: BoldSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(BOLD_PAIR)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ text: text.slice(last, start).replace(/\*\*/g, ""), bold: false });
    out.push({ text: m[1], bold: true });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last).replace(/\*\*/g, ""), bold: false });
  return out.filter((s) => s.text.length > 0);
}

/** The same text with every `**` marker removed, for places that can't show bold. */
export function stripBoldMarkers(input: string | null | undefined): string {
  return (input ?? "").replace(BOLD_PAIR, "$1").replace(/\*\*/g, "");
}
