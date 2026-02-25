/**
 * MarketingStyles.ts
 * Swiss Precision design token constants for marketing components.
 * Apply these classNames ONLY within the marketing/ folder.
 * Do NOT import into shared components or global theme.
 */

// ─── Palette ──────────────────────────────────────────────────────────────────
/** Background: off-white #FAFAFA */
export const MKT_BG = "bg-[#FAFAFA]";
/** Primary text + rules: deep navy #1A1A2E */
export const MKT_TEXT = "text-[#1A1A2E]";
/** CTA accent: teal #00D4AA */
export const MKT_ACCENT = "text-[#00D4AA]";
export const MKT_ACCENT_BG = "bg-[#00D4AA]";
export const MKT_ACCENT_BORDER = "border-[#00D4AA]";
/** Subtle rule / divider color */
export const MKT_RULE = "border-[#1A1A2E]/10";
/** Card background */
export const MKT_CARD_BG = "bg-white";
/** Muted text */
export const MKT_MUTED = "text-[#1A1A2E]/60";

// ─── Typography ───────────────────────────────────────────────────────────────
/**
 * DM Sans bold — headings.
 * Loaded via Google Fonts CDN in index.html (scoped to marketing components).
 */
export const MKT_HEADING = "font-['DM_Sans'] font-bold tracking-tight text-[#1A1A2E]";
/**
 * Work Sans — body copy.
 */
export const MKT_BODY = "font-['Work_Sans'] text-[#1A1A2E]/80 leading-relaxed";
/**
 * JetBrains Mono — computed/metric labels.
 */
export const MKT_MONO = "font-['JetBrains_Mono'] font-medium text-[#00D4AA] tracking-tight";

// ─── Layout ───────────────────────────────────────────────────────────────────
/** Max-width content wrapper */
export const MKT_CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
/** Standard section vertical padding */
export const MKT_SECTION_PAD = "py-16 sm:py-20 lg:py-24";
/** Thin horizontal rule */
export const MKT_DIVIDER = `border-t ${MKT_RULE}`;

// ─── Buttons ──────────────────────────────────────────────────────────────────
/** Primary CTA button */
export const MKT_BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-md bg-[#00D4AA] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#00bfa0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D4AA] transition-colors";
/** Ghost / outline CTA */
export const MKT_BTN_GHOST =
  "inline-flex items-center justify-center rounded-md border border-[#1A1A2E]/20 px-6 py-3 text-sm font-semibold text-[#1A1A2E] hover:bg-[#1A1A2E]/5 transition-colors";

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const MKT_SHADOW = "shadow-[0_1px_4px_rgba(26,26,46,0.08)]";
export const MKT_SHADOW_HOVER = "hover:shadow-[0_4px_16px_rgba(26,26,46,0.12)]";
