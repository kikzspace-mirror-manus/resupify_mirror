import React from "react";
import {
  MKT_ACCENT,
  MKT_BODY,
  MKT_CARD_BG,
  MKT_HEADING,
  MKT_MUTED,
  MKT_RULE,
  MKT_SHADOW,
  MKT_TEXT,
} from "./MarketingStyles";

export interface TestimonialCardProps {
  /** The testimonial quote (without surrounding quotation marks) */
  quote: string;
  /** Author name */
  authorName: string;
  /** Author title / role (e.g. "Software Engineer, Google") */
  authorTitle?: string;
  /** Optional avatar URL */
  avatarUrl?: string;
  /** Additional className on the card wrapper */
  className?: string;
}

/**
 * TestimonialCard
 *
 * Swiss Precision testimonial / social proof card.
 * Large opening quotation mark in accent color, author attribution below.
 */
export function TestimonialCard({
  quote,
  authorName,
  authorTitle,
  avatarUrl,
  className = "",
}: TestimonialCardProps) {
  return (
    <div
      data-testid="testimonial-card"
      className={`
        ${MKT_CARD_BG} ${MKT_SHADOW}
        rounded-xl border ${MKT_RULE}
        p-6 flex flex-col gap-4
        ${className}
      `}
    >
      {/* Opening quote mark */}
      <span
        aria-hidden="true"
        className={`text-5xl leading-none font-serif ${MKT_ACCENT} select-none`}
      >
        &ldquo;
      </span>

      <p
        data-testid="testimonial-quote"
        className={`text-base ${MKT_BODY} ${MKT_TEXT} -mt-4`}
      >
        {quote}
      </p>

      {/* Author */}
      <div className="mt-auto flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={authorName}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-[#1A1A2E]/10 flex items-center justify-center text-sm font-semibold text-[#1A1A2E]/60">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p
            data-testid="testimonial-author-name"
            className={`text-sm ${MKT_HEADING} ${MKT_TEXT}`}
          >
            {authorName}
          </p>
          {authorTitle && (
            <p
              data-testid="testimonial-author-title"
              className={`text-xs ${MKT_MUTED}`}
            >
              {authorTitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestimonialCard;
