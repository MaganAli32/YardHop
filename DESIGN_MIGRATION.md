# YardFront UI Migration Guide — "The Storefront" Design System

## Overview

All pages and components must be migrated to the warm analog editorial aesthetic.
Do NOT deviate from this system. When in doubt, refer back here.

---

## Typography

- **Display / Headlines**: `Cormorant Garamond` (weight 300–400, italic where elegant)
- **Body / UI**: `Manrope` (weight 400–500)
- **Monospace / Data / Prices**: `DM Mono`
- Import via Google Fonts if not already present.

## Color Palette (CSS variables)

```css
--color-parchment: #F5F0E8;     /* page background */
--color-forest: #2C4A3E;        /* primary text, CTAs */
--color-terracotta: #C4622D;    /* accent, highlights */
--color-cream: #FAF7F2;         /* card backgrounds */
--color-ink: #1A1A18;           /* headings */
--color-mist: #E8E2D9;          /* borders, dividers */
```

## Spacing & Layout

- Generous padding: sections use `py-20` to `py-32` (Tailwind) or `5rem`–`8rem`
- Max content width: `1200px`, centered
- Editorial grid: asymmetric column layouts preferred over equal 3-col grids
- Cards: subtle border `1px solid var(--color-mist)`, no heavy drop shadows

## Buttons

- Primary: `bg-forest text-parchment`, hover lightens slightly, no border-radius > 2px
- Secondary: outline style, `border-forest text-forest`
- Destructive/accent: `bg-terracotta text-cream`
- No pill-shaped buttons unless in tag/badge context

## Components to Update

Apply the above system to ALL of:

- `frontend/pages/Home.tsx` (or Landing)
- `frontend/pages/Business.tsx`
- `frontend/pages/Dashboard.tsx`
- `frontend/pages/Appraisal.tsx`
- `frontend/components/Navbar.tsx`
- `frontend/components/Footer.tsx`
- `frontend/components/PriceCard.tsx`
- *(add any others as needed)*

## What to Replace

| Old | New |
|-----|-----|
| `font-sans` (Inter/system) | `font-['Manrope']` |
| Purple/blue gradients | Parchment/forest palette |
| `rounded-xl` cards | Minimal border, `rounded-sm` or none |
| Heavy box shadows | `border` + subtle `shadow-sm` |
| Bold orange `#FF6B35` CTAs | Forest green `#2C4A3E` CTAs |
| White `#FFFFFF` background | Parchment `#F5F0E8` background |

## Cursor Instructions

1. Open `DESIGN_MIGRATION.md` and keep it pinned as context.
2. For each file: replace colors, fonts, spacing, and component styles to match this system.
3. Do NOT rewrite logic or functionality — only update visual/style code.
4. After each file, confirm what changed before moving to the next.
