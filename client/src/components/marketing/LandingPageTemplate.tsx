import React from "react";
import { MKT_BG, MKT_CONTAINER, MKT_DIVIDER, MKT_SECTION_PAD } from "./MarketingStyles";

export interface LandingPageSection {
  /** Unique key for React reconciliation */
  key: string;
  /** Section content node */
  content: React.ReactNode;
  /** Whether to render a thin <hr> above this section */
  divider?: boolean;
  /** Override section padding (defaults to MKT_SECTION_PAD) */
  paddingClass?: string;
}

export interface LandingPageTemplateProps {
  /** Hero slot — rendered above all sections, full-width */
  hero: React.ReactNode;
  /** Ordered list of page sections */
  sections?: LandingPageSection[];
  /** Footer slot — rendered below all sections */
  footer?: React.ReactNode;
  /** Additional className applied to the outermost wrapper */
  className?: string;
}

/**
 * LandingPageTemplate
 *
 * Swiss Precision page shell. Provides:
 * - max-width content wrapper with responsive horizontal padding
 * - consistent section vertical padding
 * - optional thin horizontal rules between sections
 * - hero / sections / footer slot API
 *
 * Usage:
 * ```tsx
 * <LandingPageTemplate
 *   hero={<HeroSection />}
 *   sections={[
 *     { key: "features", content: <FeaturesSection />, divider: true },
 *     { key: "faq", content: <FAQSection />, divider: true },
 *   ]}
 *   footer={<SiteFooter />}
 * />
 * ```
 */
export function LandingPageTemplate({
  hero,
  sections = [],
  footer,
  className = "",
}: LandingPageTemplateProps) {
  return (
    <div
      data-testid="landing-page-template"
      className={`${MKT_BG} min-h-screen antialiased ${className}`}
    >
      {/* Hero — full width, no max-width constraint */}
      <div data-testid="landing-hero">{hero}</div>

      {/* Sections */}
      {sections.map((section) => (
        <React.Fragment key={section.key}>
          {section.divider && (
            <div className={MKT_CONTAINER}>
              <hr className={MKT_DIVIDER} />
            </div>
          )}
          <section
            data-testid={`landing-section-${section.key}`}
            className={section.paddingClass ?? MKT_SECTION_PAD}
          >
            <div className={MKT_CONTAINER}>{section.content}</div>
          </section>
        </React.Fragment>
      ))}

      {/* Footer */}
      {footer && (
        <>
          <div className={MKT_CONTAINER}>
            <hr className={MKT_DIVIDER} />
          </div>
          <footer data-testid="landing-footer">{footer}</footer>
        </>
      )}
    </div>
  );
}

export default LandingPageTemplate;
