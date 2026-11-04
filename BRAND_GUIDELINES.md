# Brand guidelines (provisional)

> The name VYRO is provisional. Domain and trademark availability have **not** been checked. Every user-facing brand string comes from `@vyro/config` (`resolveBrand`) and can be overridden with `BRAND_NAME` / `VITE_BRAND_NAME` / `VITE_BRAND_TAGLINE`.

## Essence
**Tagline:** Your world. Your energy.  
**Personality:** bold, youthful, energetic, expressive, global, premium. Confident type and flat colour planes rather than gradients, glass or neon.

## Logo
- **Mark** (`packages/ui/assets/vyro-mark.svg`): a V built from a lime plane with a violet keystone at its base and a coral spark at the upper right. The spark is the product's "energy" signature and can animate subtly (pulse on new activity) in-product.
- **Wordmark** (`vyro-wordmark.svg`): mark + "VYRO" set in Space Grotesk Bold, tracking +0.12em.
- **App icon** (`vyro-app-icon.svg`): mark on Ink, 22% corner radius for platforms that do not mask.
- Clear space: at least the spark's diameter on all sides. Minimum size: 16 px mark, 80 px wordmark.
- Do not recolour the mark outside the palette, add effects, outline it, or place it on busy imagery without an Ink or Paper plate.

## Colour

| Token | Hex | Use |
|---|---|---|
| Electric Lime | `#B6FF4A` | Primary actions, brand moments, dark-mode links |
| Vivid Violet | `#7558FF` (text in light: `#5B3FE0`) | Secondary emphasis, focus rings, links in light mode |
| Coral | `#FF5C45` | Accent, notifications, the spark. Errors use a darker coral for contrast |
| Ink | `#11131C` | Dark backgrounds, text on lime |
| Paper | `#F4F3EF` | Light backgrounds, text on dark |

Rules: text on Lime is always Ink. Lime is never used as text on Paper (fails contrast). Every semantic text/background pair is unit-tested for WCAG AA (`packages/ui/test/contrast.test.ts`).

## Typography
- **Space Grotesk** (variable) — headings, numbers, brand moments. Tight tracking at large sizes.
- **Inter** (variable) — body and UI.
- Scale (px): 12 · 14 · 16 · 18 · 22 · 28 · 36 · 48 · 64. Body never below 14; inputs 16 to avoid mobile zoom.
- Fonts are self-hosted via Fontsource (no third-party font requests).

## Iconography
Lucide icons at 1.5–2 px stroke, 16/20/24 px sizes, never mixed with filled icon sets. Custom glyphs (spark, reel, story ring) will be drawn on the same 24 px grid with 2 px strokes.

## Layout and components
- Radius: 6 / 10 / 16 px; avoid large rounded cards everywhere. Flat planes, hairline borders (`--color-line`).
- Touch targets ≥ 44 px. Focus ring: 2 px violet, offset 2 px.
- Motion: 120 / 200 / 320 ms, ease `cubic-bezier(.2,.8,.2,1)`; respect `prefers-reduced-motion`.
- Desktop: custom left rail (icons at md, labels at xl). Mobile: bottom bar with safe-area padding.

## Design tokens
Source of truth: `packages/ui/src/tokens.ts` (TS, for React Native) mirrored in `packages/ui/src/theme.css` (Tailwind v4 `@theme`). Semantic roles: `bg, surface, raised, line, fg, muted, primary, on-primary, link, secondary, danger, focus`.

## Voice
Short, warm, direct. Second person. No exclamation marks in errors. Explain what happened and what to do next.
