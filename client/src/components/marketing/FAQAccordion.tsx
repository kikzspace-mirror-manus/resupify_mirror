import React, { useState } from "react";
import {
  MKT_BODY,
  MKT_HEADING,
  MKT_MUTED,
  MKT_RULE,
  MKT_TEXT,
} from "./MarketingStyles";

export interface FAQItem {
  /** Unique key */
  id: string;
  /** Question text */
  question: string;
  /** Answer text or node */
  answer: React.ReactNode;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  /** Allow multiple items open simultaneously (default: false) */
  allowMultiple?: boolean;
  /** Additional className on the wrapper */
  className?: string;
}

/**
 * FAQAccordion
 *
 * Swiss Precision minimal accordion. Uses only React state — no new libraries.
 * Implements smooth height transition via max-height animation.
 */
export function FAQAccordion({
  items,
  allowMultiple = false,
  className = "",
}: FAQAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div
      data-testid="faq-accordion"
      className={`divide-y ${MKT_RULE} ${className}`}
    >
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id} data-testid={`faq-item-${item.id}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              onClick={() => toggle(item.id)}
              className={`
                w-full flex items-center justify-between gap-4
                py-5 text-left
                ${MKT_HEADING} ${MKT_TEXT} text-base
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4AA] rounded
              `}
            >
              <span data-testid={`faq-question-${item.id}`}>{item.question}</span>
              <span
                aria-hidden="true"
                className={`
                  flex-shrink-0 h-5 w-5 text-[#1A1A2E]/40
                  transition-transform duration-200
                  ${isOpen ? "rotate-180" : "rotate-0"}
                `}
              >
                {/* Chevron down */}
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>

            <div
              id={`faq-answer-${item.id}`}
              role="region"
              aria-labelledby={`faq-question-${item.id}`}
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${isOpen ? "max-h-[600px] opacity-100 pb-5" : "max-h-0 opacity-0"}
              `}
            >
              <div
                data-testid={`faq-answer-${item.id}`}
                className={`text-sm ${MKT_BODY} ${MKT_MUTED}`}
              >
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FAQAccordion;
