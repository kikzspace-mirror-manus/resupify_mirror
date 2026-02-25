import React from "react";
import { MKT_ACCENT, MKT_BODY, MKT_HEADING, MKT_MONO, MKT_MUTED } from "./MarketingStyles";

export interface SectionHeaderProps {
  /** Optional eyebrow line above the heading (e.g. "HOW IT WORKS") */
  eyebrow?: string;
  /** Main heading text */
  heading: string;
  /** Optional subheading / body copy below the heading */
  subheading?: string;
  /** Text alignment */
  align?: "left" | "center";
  /** Heading size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Additional className on the wrapper */
  className?: string;
}

const SIZE_MAP: Record<NonNullable<SectionHeaderProps["size"]>, string> = {
  sm: "text-xl sm:text-2xl",
  md: "text-2xl sm:text-3xl",
  lg: "text-3xl sm:text-4xl",
  xl: "text-4xl sm:text-5xl lg:text-6xl",
};

/**
 * SectionHeader
 *
 * Swiss Precision section heading component.
 * - DM Sans bold for heading (scoped className)
 * - Work Sans for body/subheading (scoped className)
 * - JetBrains Mono for eyebrow (monospace accent)
 */
export function SectionHeader({
  eyebrow,
  heading,
  subheading,
  align = "center",
  size = "lg",
  className = "",
}: SectionHeaderProps) {
  const alignClass = align === "center" ? "text-center" : "text-left";

  return (
    <div
      data-testid="section-header"
      className={`${alignClass} ${className}`}
    >
      {eyebrow && (
        <p
          data-testid="section-eyebrow"
          className={`mb-3 text-xs uppercase tracking-widest ${MKT_MONO} ${MKT_ACCENT}`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        data-testid="section-heading"
        className={`${MKT_HEADING} ${SIZE_MAP[size]} leading-tight`}
      >
        {heading}
      </h2>
      {subheading && (
        <p
          data-testid="section-subheading"
          className={`mt-4 text-base sm:text-lg ${MKT_BODY} ${MKT_MUTED} ${
            align === "center" ? "mx-auto max-w-2xl" : ""
          }`}
        >
          {subheading}
        </p>
      )}
    </div>
  );
}

export default SectionHeader;
