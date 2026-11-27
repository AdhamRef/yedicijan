import type { SVGProps } from "react";

/** Lucide has no mosque glyph; drawn on the same 24px / 2px-stroke grid. */
export default function MosqueIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M5 21v-7a7 7 0 0 1 14 0v7M3 21h18M12 7V3M10 21v-3a2 2 0 0 1 4 0v3" />
      <path d="M12 3c1 0 1.6.6 1.6 1.3" />
    </svg>
  );
}
