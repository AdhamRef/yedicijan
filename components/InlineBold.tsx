import { Fragment } from "react";
import { splitBoldMarkers } from "@/lib/text/inline-bold";

/**
 * Renders text with Markdown-style **bold** as real <strong>, without the
 * asterisks. <strong> uses `font-weight: bolder`, so it stays bold inside text
 * that is already bold (headings) and turns bold inside normal text.
 */
export default function InlineBold({ text }: { text: string | null | undefined }) {
  return (
    <>
      {splitBoldMarkers(text).map((seg, i) =>
        seg.bold ? <strong key={i}>{seg.text}</strong> : <Fragment key={i}>{seg.text}</Fragment>,
      )}
    </>
  );
}
