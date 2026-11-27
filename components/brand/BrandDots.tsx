/** The guide's 3×3 dot grid. Colour follows `currentColor`. */
export default function BrandDots({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-dots ${className}`} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
