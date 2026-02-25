import React from "react";
import {
  MKT_ACCENT,
  MKT_BODY,
  MKT_CARD_BG,
  MKT_HEADING,
  MKT_MUTED,
  MKT_RULE,
  MKT_SHADOW,
  MKT_SHADOW_HOVER,
  MKT_TEXT,
} from "./MarketingStyles";

export interface FeatureCardProps {
  /** Icon node (e.g. an SVG or lucide-react icon) */
  icon?: React.ReactNode;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Optional metric label displayed in monospace accent (e.g. "10× faster") */
  metric?: string;
  /** Additional className on the card wrapper */
  className?: string;
}

/**
 * FeatureCard
 *
 * Swiss Precision feature highlight card.
 * White background, subtle shadow, optional metric label in JetBrains Mono.
 */
export function FeatureCard({
  icon,
  title,
  description,
  metric,
  className = "",
}: FeatureCardProps) {
  return (
    <div
      data-testid="feature-card"
      className={`
        ${MKT_CARD_BG} ${MKT_SHADOW} ${MKT_SHADOW_HOVER}
        rounded-xl border ${MKT_RULE}
        p-6 flex flex-col gap-4
        transition-shadow duration-200
        ${className}
      `}
    >
      {icon && (
        <div
          data-testid="feature-card-icon"
          className={`h-10 w-10 ${MKT_ACCENT} flex items-center justify-center`}
        >
          {icon}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3
          data-testid="feature-card-title"
          className={`text-lg ${MKT_HEADING} ${MKT_TEXT}`}
        >
          {title}
        </h3>
        <p
          data-testid="feature-card-description"
          className={`text-sm ${MKT_BODY} ${MKT_MUTED}`}
        >
          {description}
        </p>
      </div>

      {metric && (
        <p
          data-testid="feature-card-metric"
          className="mt-auto text-sm font-['JetBrains_Mono'] font-medium text-[#00D4AA]"
        >
          {metric}
        </p>
      )}
    </div>
  );
}

export default FeatureCard;
