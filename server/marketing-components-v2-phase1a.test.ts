/**
 * V2 Phase 1.1A — Marketing Components (Swiss Precision)
 *
 * Minimal tests verifying:
 * A) File structure: all required files exist
 * B) MarketingStyles: exports required constants
 * C) LandingPageTemplate: exports component with correct displayName/function name
 * D) SectionHeader: exports component
 * E) Card components: FeatureCard, StepCard, TestimonialCard export
 * F) FAQAccordion: exports component
 * G) useRevealOnScroll: exports hook function
 * H) Barrel index: re-exports all components
 * I) No new libraries introduced (no new package.json deps)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const MARKETING_DIR = path.resolve(
  __dirname,
  "../client/src/components/marketing"
);
const HOOKS_DIR = path.resolve(__dirname, "../client/src/hooks");

// ─── A: File structure ────────────────────────────────────────────────────────
describe("A: File structure", () => {
  const requiredFiles = [
    "MarketingStyles.ts",
    "LandingPageTemplate.tsx",
    "SectionHeader.tsx",
    "FeatureCard.tsx",
    "StepCard.tsx",
    "TestimonialCard.tsx",
    "FAQAccordion.tsx",
    "index.ts",
  ];

  for (const file of requiredFiles) {
    it(`A${requiredFiles.indexOf(file) + 1}: ${file} exists in marketing/`, () => {
      expect(fs.existsSync(path.join(MARKETING_DIR, file))).toBe(true);
    });
  }

  it("A9: useRevealOnScroll.ts exists in client/src/hooks/", () => {
    expect(fs.existsSync(path.join(HOOKS_DIR, "useRevealOnScroll.ts"))).toBe(
      true
    );
  });
});

// ─── B: MarketingStyles constants ────────────────────────────────────────────
describe("B: MarketingStyles exports", () => {
  const stylesPath = path.join(MARKETING_DIR, "MarketingStyles.ts");
  let src: string;

  it("B0: MarketingStyles.ts is readable", () => {
    src = fs.readFileSync(stylesPath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("B1: exports MKT_BG (background #FAFAFA)", () => {
    expect(src).toMatch(/export const MKT_BG/);
    expect(src).toMatch(/#FAFAFA/);
  });

  it("B2: exports MKT_TEXT (primary text #1A1A2E)", () => {
    expect(src).toMatch(/export const MKT_TEXT/);
    expect(src).toMatch(/#1A1A2E/);
  });

  it("B3: exports MKT_ACCENT (CTA #00D4AA)", () => {
    expect(src).toMatch(/export const MKT_ACCENT/);
    expect(src).toMatch(/#00D4AA/);
  });

  it("B4: exports MKT_HEADING (DM Sans)", () => {
    expect(src).toMatch(/export const MKT_HEADING/);
    expect(src).toMatch(/DM_Sans/);
  });

  it("B5: exports MKT_BODY (Work Sans)", () => {
    expect(src).toMatch(/export const MKT_BODY/);
    expect(src).toMatch(/Work_Sans/);
  });

  it("B6: exports MKT_MONO (JetBrains Mono)", () => {
    expect(src).toMatch(/export const MKT_MONO/);
    expect(src).toMatch(/JetBrains_Mono/);
  });

  it("B7: exports MKT_CONTAINER (max-width wrapper)", () => {
    expect(src).toMatch(/export const MKT_CONTAINER/);
    expect(src).toMatch(/max-w-/);
  });

  it("B8: exports MKT_BTN_PRIMARY (CTA button)", () => {
    expect(src).toMatch(/export const MKT_BTN_PRIMARY/);
  });
});

// ─── C: LandingPageTemplate ───────────────────────────────────────────────────
describe("C: LandingPageTemplate", () => {
  const filePath = path.join(MARKETING_DIR, "LandingPageTemplate.tsx");
  let src: string;

  it("C0: file is readable", () => {
    src = fs.readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("C1: exports LandingPageTemplate function", () => {
    expect(src).toMatch(/export function LandingPageTemplate/);
  });

  it("C2: accepts hero slot prop", () => {
    expect(src).toMatch(/hero.*ReactNode|hero.*React\.ReactNode/);
  });

  it("C3: accepts sections slot prop", () => {
    expect(src).toMatch(/sections/);
  });

  it("C4: accepts footer slot prop", () => {
    expect(src).toMatch(/footer/);
  });

  it("C5: renders data-testid landing-page-template", () => {
    expect(src).toMatch(/data-testid="landing-page-template"/);
  });

  it("C6: renders data-testid landing-hero", () => {
    expect(src).toMatch(/data-testid="landing-hero"/);
  });

  it("C7: uses MKT_BG from MarketingStyles", () => {
    expect(src).toMatch(/MKT_BG/);
  });

  it("C8: uses MKT_CONTAINER for section wrapper", () => {
    expect(src).toMatch(/MKT_CONTAINER/);
  });
});

// ─── D: SectionHeader ─────────────────────────────────────────────────────────
describe("D: SectionHeader", () => {
  const filePath = path.join(MARKETING_DIR, "SectionHeader.tsx");
  let src: string;

  it("D0: file is readable", () => {
    src = fs.readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("D1: exports SectionHeader function", () => {
    expect(src).toMatch(/export function SectionHeader/);
  });

  it("D2: accepts eyebrow prop", () => {
    expect(src).toMatch(/eyebrow/);
  });

  it("D3: accepts heading prop", () => {
    expect(src).toMatch(/heading/);
  });

  it("D4: accepts subheading prop", () => {
    expect(src).toMatch(/subheading/);
  });

  it("D5: uses MKT_HEADING for heading element", () => {
    expect(src).toMatch(/MKT_HEADING/);
  });

  it("D6: uses MKT_BODY for subheading element", () => {
    expect(src).toMatch(/MKT_BODY/);
  });

  it("D7: uses MKT_MONO for eyebrow", () => {
    expect(src).toMatch(/MKT_MONO/);
  });
});

// ─── E: Card components ───────────────────────────────────────────────────────
describe("E: FeatureCard", () => {
  const filePath = path.join(MARKETING_DIR, "FeatureCard.tsx");
  let src: string;

  it("E0: file is readable", () => {
    src = fs.readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("E1: exports FeatureCard function", () => {
    expect(src).toMatch(/export function FeatureCard/);
  });

  it("E2: accepts title prop", () => {
    expect(src).toMatch(/title/);
  });

  it("E3: accepts description prop", () => {
    expect(src).toMatch(/description/);
  });

  it("E4: accepts optional metric prop", () => {
    expect(src).toMatch(/metric/);
  });

  it("E5: renders data-testid feature-card", () => {
    expect(src).toMatch(/data-testid="feature-card"/);
  });
});

describe("F: StepCard", () => {
  const filePath = path.join(MARKETING_DIR, "StepCard.tsx");
  let src: string;

  it("F0: file is readable", () => {
    src = fs.readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("F1: exports StepCard function", () => {
    expect(src).toMatch(/export function StepCard/);
  });

  it("F2: accepts step number prop", () => {
    expect(src).toMatch(/step.*number|step: number/);
  });

  it("F3: renders step number in MKT_MONO", () => {
    expect(src).toMatch(/MKT_MONO/);
  });

  it("F4: renders data-testid step-card", () => {
    expect(src).toMatch(/data-testid="step-card"/);
  });
});

describe("G: TestimonialCard", () => {
  const filePath = path.join(MARKETING_DIR, "TestimonialCard.tsx");
  let src: string;

  it("G0: file is readable", () => {
    src = fs.readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("G1: exports TestimonialCard function", () => {
    expect(src).toMatch(/export function TestimonialCard/);
  });

  it("G2: accepts quote prop", () => {
    expect(src).toMatch(/quote/);
  });

  it("G3: accepts authorName prop", () => {
    expect(src).toMatch(/authorName/);
  });

  it("G4: renders data-testid testimonial-card", () => {
    expect(src).toMatch(/data-testid="testimonial-card"/);
  });
});

// ─── H: FAQAccordion ──────────────────────────────────────────────────────────
describe("H: FAQAccordion", () => {
  const filePath = path.join(MARKETING_DIR, "FAQAccordion.tsx");
  let src: string;

  it("H0: file is readable", () => {
    src = fs.readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("H1: exports FAQAccordion function", () => {
    expect(src).toMatch(/export function FAQAccordion/);
  });

  it("H2: accepts items prop (FAQItem[])", () => {
    expect(src).toMatch(/items.*FAQItem|FAQItem\[\]/);
  });

  it("H3: uses React state for open/close (no new libs)", () => {
    expect(src).toMatch(/useState/);
    // Must NOT import any accordion library
    expect(src).not.toMatch(/from ['"]@radix-ui\/react-accordion['"]/);
    expect(src).not.toMatch(/from ['"]headlessui['"]/);
  });

  it("H4: renders data-testid faq-accordion", () => {
    expect(src).toMatch(/data-testid="faq-accordion"/);
  });

  it("H5: uses aria-expanded for accessibility", () => {
    expect(src).toMatch(/aria-expanded/);
  });

  it("H6: allows multiple open items via allowMultiple prop", () => {
    expect(src).toMatch(/allowMultiple/);
  });
});

// ─── I: useRevealOnScroll ─────────────────────────────────────────────────────
describe("I: useRevealOnScroll", () => {
  const filePath = path.join(HOOKS_DIR, "useRevealOnScroll.ts");
  let src: string;

  it("I0: file is readable", () => {
    src = fs.readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("I1: exports useRevealOnScroll function", () => {
    expect(src).toMatch(/export function useRevealOnScroll/);
  });

  it("I2: uses IntersectionObserver", () => {
    expect(src).toMatch(/IntersectionObserver/);
  });

  it("I3: returns containerRef", () => {
    expect(src).toMatch(/containerRef/);
  });

  it("I4: returns getItemClass function", () => {
    expect(src).toMatch(/getItemClass/);
  });

  it("I5: returns isVisible boolean", () => {
    expect(src).toMatch(/isVisible/);
  });

  it("I6: supports staggerMs option", () => {
    expect(src).toMatch(/staggerMs/);
  });

  it("I7: no new library imports (only React hooks)", () => {
    // Should only import from react
    const importLines = src
      .split("\n")
      .filter((l) => l.startsWith("import"));
    for (const line of importLines) {
      expect(line).toMatch(/from ['"]react['"]/);
    }
  });
});

// ─── J: Barrel index ──────────────────────────────────────────────────────────
describe("J: Barrel index.ts", () => {
  const filePath = path.join(MARKETING_DIR, "index.ts");
  let src: string;

  it("J0: file is readable", () => {
    src = fs.readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("J1: re-exports LandingPageTemplate", () => {
    expect(src).toMatch(/LandingPageTemplate/);
  });

  it("J2: re-exports SectionHeader", () => {
    expect(src).toMatch(/SectionHeader/);
  });

  it("J3: re-exports FeatureCard", () => {
    expect(src).toMatch(/FeatureCard/);
  });

  it("J4: re-exports StepCard", () => {
    expect(src).toMatch(/StepCard/);
  });

  it("J5: re-exports TestimonialCard", () => {
    expect(src).toMatch(/TestimonialCard/);
  });

  it("J6: re-exports FAQAccordion", () => {
    expect(src).toMatch(/FAQAccordion/);
  });

  it("J7: re-exports MarketingStyles", () => {
    expect(src).toMatch(/MarketingStyles/);
  });
});
