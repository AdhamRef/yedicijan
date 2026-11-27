import React from "react";
import BrandDots from "./BrandDots";

interface SectionHeadingProps {
  eyebrow?: string;
  /** Plain part of the title. */
  title: React.ReactNode;
  /** Optional emphasised words — red with the yellow brand swash. */
  mark?: string;
  /** Put the marked words on their own line. */
  markOnNewLine?: boolean;
  subtitle?: React.ReactNode;
  align?: "start" | "center";
  tone?: "light" | "dark";
  as?: "h1" | "h2";
  className?: string;
}

/**
 * Eyebrow with the dot grid, then a title whose key words carry the
 * red-with-yellow-swash treatment from the brand's social templates.
 */
export default function SectionHeading({
  eyebrow,
  title,
  mark,
  markOnNewLine,
  subtitle,
  align = "start",
  tone = "light",
  as: Tag = "h2",
  className = "",
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : "text-start"} ${className}`}>
      {eyebrow && (
        <span
          className={`inline-flex items-center gap-2.5 text-[13px] font-bold ${dark ? "text-gold" : "text-burgundy"} ${
            align === "center" ? "justify-center" : ""
          }`}
        >
          <BrandDots />
          {eyebrow}
        </span>
      )}
      <Tag
        className={`mt-3 font-extrabold leading-[1.25] tracking-tight ${
          Tag === "h1" ? "text-[34px] sm:text-5xl lg:text-[56px]" : "text-[28px] sm:text-4xl lg:text-[44px]"
        } ${dark ? "text-white" : "text-deep"}`}
      >
        {title}
        {mark && (
          <>
            {markOnNewLine ? <br /> : " "}
            <span className={`brand-mark ${dark ? "!text-gold after:!bg-burgundy" : ""}`}>{mark}</span>
          </>
        )}
      </Tag>
      {subtitle && (
        <p
          className={`mt-4 text-base leading-8 sm:text-[17px] ${dark ? "text-ice/80" : "text-gray-500"} ${
            align === "center" ? "mx-auto max-w-2xl" : "max-w-xl"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
