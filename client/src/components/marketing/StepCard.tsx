import React from "react";
import {
  MKT_BODY,
  MKT_CARD_BG,
  MKT_HEADING,
  MKT_MONO,
  MKT_MUTED,
  MKT_RULE,
  MKT_SHADOW,
  MKT_TEXT,
} from "./MarketingStyles";

export interface StepCardProps {
  /** Step number (1-based) */
  step: number;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Optional icon node */
  icon?: React.ReactNode;
  /** Additional className on the card wrapper */
  className?: string;
}

/**
 * StepCard
 *
 * Swiss Precision numbered step card for "How it works" sections.
 * Step number rendered in JetBrains Mono accent.
 */
export function StepCard({
  step,
  title,
  description,
  icon,
  className = "",
}: StepCardProps) {
  return (
    <div
      data-testid="step-card"
      className={`
        ${MKT_CARD_BG} ${MKT_SHADOW}
        rounded-xl border ${MKT_RULE}
        p-6 flex flex-col gap-3
        ${className}
      `}
    >
      <div className="flex items-center gap-3">
        <span
          data-testid="step-card-number"
          className={`text-2xl ${MKT_MONO} leading-none`}
        >
          {String(step).padStart(2, "0")}
        </span>
        {icon && (
          <span
            data-testid="step-card-icon"
            className="h-5 w-5 text-[#1A1A2E]/40"
          >
            {icon}
          </span>
        )}
      </div>

      <h3
        data-testid="step-card-title"
        className={`text-lg ${MKT_HEADING} ${MKT_TEXT}`}
      >
        {title}
      </h3>
      <p
        data-testid="step-card-description"
        className={`text-sm ${MKT_BODY} ${MKT_MUTED}`}
      >
        {description}
      </p>
    </div>
  );
}

export default StepCard;
