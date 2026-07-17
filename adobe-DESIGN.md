---
version: alpha
name: Adobe
description: "A creative enterprise platform anchored in Adobe's iconic red (#FA0F00) against near-black surfaces (#1B1B1B) in Creative Cloud applications, with white and light gray for web and marketing. Adobe Spectrum, their comprehensive design system, uses a token-based approach with semantic color roles, precise 8px spacing, and a clean sans-serif stack (Source Sans Pro — their own creation). The visual language spans from the dark, focused professional tools (Photoshop, Premiere) to the marketing site's bright, aspirational photography-forward pages. Red is used as a brand signature, not as a warning — it means creativity and power."

colors:
  primary: "#FA0F00"
  on-primary: "#ffffff"
  primary-hover: "#E00D00"
  ink: "#1B1B1B"
  ink-muted: "#6E6E6E"
  canvas: "#ffffff"
  surface-1: "#F5F5F5"
  surface-2: "#E8E8E8"
  border: "#D3D3D3"
  app-canvas: "#1B1B1B"
  app-surface-1: "#252525"
  app-surface-2: "#303030"
  app-border: "#404040"
  app-ink: "#EBEBEB"
  blue-link: "#0265DC"
  success: "#008000"

typography:
  display:
    fontFamily: "Adobe Clean, Source Sans Pro, -apple-system, sans-serif"
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.01em
  body:
    fontFamily: "Adobe Clean, Source Sans Pro, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0

spacing:
  base: 8px
  scale: [4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96]

radius:
  sm: 2px
  md: 4px
  lg: 8px
  pill: 9999px

shadows:
  card: "0 1px 4px rgba(0,0,0,0.12)"
  elevated: "0 4px 16px rgba(0,0,0,0.15)"
  app-elevated: "0 8px 32px rgba(0,0,0,0.5)"

motion:
  duration-fast: 130ms
  duration-base: 250ms
  easing: cubic-bezier(0.45, 0, 0.40, 1)
---

## 1. Visual Theme & Atmosphere
Adobe operates at two registers: the dark, tool-focused Creative Cloud apps and the bright, marketing-forward website. Both contexts share the red signature — though in apps it appears as the product icon accent, while on the marketing site it's the CTA button. Spectrum, Adobe's design system, is one of the most comprehensive in the industry — built to support 30+ products across light and dark contexts with full accessibility compliance.

## 2. Color System
**Marketing/Web (light)**:
- Canvas white, light gray surfaces (#F5F5F5)
- Red (#FA0F00) on primary buttons, logo, key headlines
- Blue (#0265DC) for text links and secondary actions

**Creative Apps (dark)**:
- Near-black canvas (#1B1B1B) — the familiar creative professional workspace
- Dark surface layers (#252525, #303030) for panels and toolbars
- Light ink (#EBEBEB) for legible text in dark environments
- Product accent colors by app: Photoshop blue, Illustrator orange, Premiere violet

## 3. Typography
Adobe Clean is the company's custom typeface, refined from Source Sans Pro (which Adobe designed and open-sourced). Clean, humanist grotesque, purpose-built for UI legibility and marketing impact. 700 weight for display, 400 for body. Spectrum tokens specify every typographic use case with rem values mapped to a 16px base.

## 4. Components & Patterns
- **Tool panels**: Dark, icon-dense, collapsible — the classic Photoshop sidebar paradigm
- **Creative app buttons**: Small, subtle, icon-led in app contexts; large and red in marketing
- **Product cards**: Product color accent on header, app icon, one-line description
- **CC subscription table**: Feature comparison grid, tier columns, checkmark matrix
- **Spectrum components**: Detailed picker, dialog, menu, badge — all token-driven

## 5. Spacing & Layout
Spectrum base unit is 8px. Creative apps use dense panel layouts (minimum 32px panels). Marketing uses wide 1440px layouts with generous section spacing. Documentation follows a two-column layout with sticky sidebar.

## 6. Motion & Interaction
Creative apps use fast, precise interactions — tool selection is instant, panels dock with slide animation at 130ms. Marketing has more elaborate scroll-triggered reveals. The Spectrum motion spec defines distinct easing for enter/exit/move events separately.

## Rationale

**Red as power, not danger** — Adobe chose #FA0F00 as its primary brand color to signal creativity and professional power rather than warning, deliberately inverting the conventional "red means stop" semantic because their audience — designers and creative professionals — associates red with passion and bold output.

**Dual-register design system** — The split between a dark creative app environment and a light marketing site isn't inconsistency; it reflects that professional tools have different attentional requirements than marketing pages. Dark surfaces reduce eye strain during 8-hour editing sessions while light surfaces aid content discovery and purchase decisions.

**Dense spacing in apps, generous spacing in marketing** — The 8px base grid compresses to tight panel layouts in Creative Cloud applications because professionals want to see more tools, not more whitespace. The same grid expands to magazine-like proportions on the marketing site because prospective customers need breathing room to absorb value propositions.

**Spectrum token architecture** — Adobe invests in a token-based design system because they ship 30+ products that must feel like siblings without looking identical. Tokens let product teams diverge on specific brand color (Photoshop blue, Premiere violet) while maintaining shared interaction language, contrast behavior, and component logic across the portfolio.

**Adobe Clean as a custom typeface** — Commissioning their own typeface (refined from open-source Source Sans Pro) signals that type is itself a design artifact, not an afterthought. It also gives Adobe typographic consistency across every touchpoint they control — marketing, product, documentation — without licensing fees or fallback drift.

## Accessibility

### Contrast Ratios
- **Primary on background** (#FA0F00 on #ffffff): 4.0:1 — fails AA for normal text, passes AA for large text (18px+)
- **Text on surface** (#1B1B1B on #ffffff): 18.1:1 — passes AA
- **Muted on background** (#6E6E6E on #ffffff): 5.7:1 — passes AA (decorative)

### Minimum Requirements
- **Touch target**: 44×44px minimum for all interactive elements
- **Focus indicator**: #0265DC outline, 2px, 2px offset
- **Focus contrast**: 5.9:1 against #ffffff background

### Motion
- Respects `prefers-reduced-motion`: yes — scroll-triggered reveals and panel slide animations should be suppressed; Spectrum motion spec includes reduced-motion overrides
- All transitions use `@media (prefers-reduced-motion: reduce)` guard

### Notes
- Adobe's red (#FA0F00) fails AA (4.0:1) for normal body text on white — it is safe only for large text (18px+) or bold text (14px+); use it exclusively as a decorative/brand color on buttons and icons, never as small text
- Spectrum design system includes full WCAG 2.1 AA compliance targets by design — this is one of the strongest accessible design systems in the industry
- App dark context (#EBEBEB on #1B1B1B): approximately 15.8:1 — passes AAA; the dark creative app environment is highly accessible for text
- Blue link (#0265DC on #ffffff): approximately 5.9:1 — passes AA; safe for body-size text links
