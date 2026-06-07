# Part 1 — Pixel-perfect spec for LandingPage.tsx

Use this document when changing the landing page. **Do not improvise** — use the exact values below so the design stays consistent.

---

## Color system (CSS variables)

Use these in Tailwind or inline styles. Define on `.landing-page` (or `:root`):

| Variable       | Value                 | Usage |
|----------------|-----------------------|--------|
| `--black`      | `#0A0A0A`             | Primary text, nav logo "Yard", buttons, dark card bg |
| `--dark`       | `#1A1A1A`             | Body text, upload "Drop a photo" |
| `--gray-600`   | `#6B6B6B`             | Subtitle, nav links, chip text, pricing subtext |
| `--gray-400`   | `#9A9A9A`             | Meta text, hints, demo range, footer, nav link hover |
| `--gray-200`   | `#E0E0E0`             | Borders, ghost button border, upload dashed border |
| `--gray-100`   | `#F2F2F2`             | Demo card header bg, bar track, step number (faded), footer border |
| `--white`      | `#FAFAFA`             | Demo card background |
| `--pure-white` | `#FFFFFF`             | Page background, Pro card button text on black |
| `--orange`     | `#FF6B35`             | Accent: logo "Front", italic headlines, CTAs accent, confidence bar, badges |
| `--orange-soft`| `rgba(255,107,53,0.08)`| Hover bg (upload zone, chips), step number on hover |

**Demo card / macOS dots (fixed):**
- Red: `#FF5F57`
- Yellow: `#FFBD2E`
- Green: `#28C840`, status badge bg `rgba(22,163,74,0.08)`, text `#16A34A` for checkmarks

---

## Typography

- **Font families**
  - **Serif (headlines):** `"Instrument Serif", serif` — use for: hero h1, section titles ("Photo in, price out.", "Built different.", etc.), demo item name, final CTA headline.
  - **Sans (body, UI):** `"Satoshi", -apple-system, BlinkMacSystemFont, sans-serif` — nav, buttons, body copy, labels, chips.
- **Google Fonts link** (in `frontend/index.html`):
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Satoshi:wght@300;400;500;700&display=swap" rel="stylesheet">
  ```

**Font sizes (exact):**
- Nav logo: `18px`, weight `700`, letter-spacing `-0.3px`
- Nav links: `14px`, weight `500`
- Nav button: `13px`, weight `600`
- Hero label ("Now live in Berkeley"): `13px`, weight `600`, letter-spacing `0.5px`
- Hero headline: `clamp(52px, 7vw, 96px)`, weight `400`, letter-spacing `-2px`, line-height `1.05`
- Hero subtitle: `18px`, line-height `1.6`
- Hero buttons: `15px`, weight `600`
- Section eyebrow: `12px`, weight `700`, uppercase, letter-spacing `2px`
- Section titles: `clamp(36px, 4.5vw, 56px)`, weight `400`, letter-spacing `-1px`
- Demo card: header label `13px`; item name `22px` (serif); meta `13px`; price `36px` bold, letter-spacing `-1.5px`; range `14px`; confidence label `12px` uppercase, letter-spacing `0.8px`; confidence value `13px` semibold; tags `12px`, weight `500`
- Steps: number `64px` (serif), gray-100; step title `18px`, weight `700`, letter-spacing `-0.3px`; step body `15px`, line-height `1.7`
- Features (dark): number `18px` (serif) orange; title `22px`, weight `600`, letter-spacing `-0.3px`; body `15px`, line-height `1.7`, `rgba(255,255,255,0.4)`
- Upload: title same as section titles; subtitle `17px`; main line `16px`, weight `500`; hint `13px`; chips `13px`, weight `500`
- Pricing: plan name `13px`, weight `700`, uppercase, letter-spacing `1.5px`; price `44px`, weight `700`, letter-spacing `-2px`; price suffix `16px`, weight `500`; period `14px`; features `14px`; button `14px`, weight `600`
- Final CTA headline: `clamp(44px, 6vw, 80px)`, weight `400`, letter-spacing `-2px`, line-height `1.05`
- Final CTA button: `17px`, weight `600`
- Footer: `13px`

---

## Spacing & layout

- **Nav:** height `64px`; padding horizontal `56px` (desktop), `24px` (mobile). Gap between nav links `32px`. Button padding `8px 20px`.
- **Hero:** padding top `140px` (desktop) / `120px` (mobile), bottom `100px` (desktop) / `80px` (mobile), horizontal `24px`. Margin between badge and headline `40px`; headline to subtitle `28px`; subtitle to buttons `48px`. Scroll hint from bottom `40px`.
- **Demo section:** padding bottom `160px`, horizontal `24px`. Card max-width `720px`. Card header padding `20px 28px`; body padding `36px 32px`; row gap `24px`; thumbnail `100×100px`, border-radius `14px`. Confidence block margin-top `28px`, padding-top `28px`; bar height `4px`; tags margin-top `20px`, gap `8px`; tag padding `5px 12px` (or `7px 16px` for chips section).
- **Steps:** section padding `160px 56px` (desktop), `100px 24px` (mobile). Max-width `1100px`. Section head margin-bottom `100px`; eyebrow margin-bottom `20px`. Grid 3 columns, gap `64px` (desktop), single column gap `48px` (mobile). Step number margin-bottom `24px`; step title margin-bottom `12px`.
- **Features (dark):** section padding `160px 56px` (desktop), `100px 24px` (mobile). Max-width `1100px`. Head margin-bottom `100px`. Row grid `200px 1fr`, gap `48px`; row padding `48px 0`; border-top `1px solid rgba(255,255,255,0.08)`; last row also border-bottom. Hover: `padding-left: 12px`.
- **Upload:** section padding `160px 24px` (desktop), `100px 24px` (mobile). Eyebrow; title margin-bottom `16px`; subtitle margin-bottom `56px`, max-width `380px`. Upload box max-width `520px`, padding `64px 40px`; icon circle `56px`, margin-bottom `20px`; hint margin-top `8px`. Chips margin-top `28px`, gap `8px`; chip padding `7px 16px`.
- **Pricing:** section padding `160px 56px` (desktop), `100px 24px` (mobile). Max-width `1100px`. Section head margin-bottom `72px`; subtitle margin-top `12px`. Grid 3 columns, gap `20px`; card padding `40px 32px`. Popular badge top `-10px`. Plan name margin-bottom `20px`; period margin-top `4px`, margin-bottom `32px`; features gap `12px`, margin-bottom `36px`; button padding `12px 24px`.
- **Final CTA:** padding `200px 24px` (desktop), `120px 24px` (mobile). Headline margin-bottom `40px`. Button padding `16px 40px`.
- **Footer:** padding `48px 56px` (desktop), `40px 24px` (mobile). Border-top `1px solid var(--gray-100)`. Links gap `28px`.

---

## Border radius

- Buttons, pills, tags, chips, badge: `100px` (fully rounded).
- Demo card, upload box, pricing cards: `20px`.
- Demo thumbnail: `14px`.
- Bar track/fill: `2px` (or `rounded-sm`).

---

## Animations

- **Scroll reveal (fade-up):**  
  Initial: `opacity: 0`, `transform: translateY(30px)`.  
  Visible: `opacity: 1`, `transform: translateY(0)`.  
  Transition: `opacity 0.9s cubic-bezier(0.25, 1, 0.5, 1)`, `transform 0.9s cubic-bezier(0.25, 1, 0.5, 1)`.  
  Stagger delays: `.d1` `0.1s`, `.d2` `0.2s`, `.d3` `0.3s`, `.d4` `0.4s`.  
  IntersectionObserver: `threshold: 0.15`, `rootMargin: '0px 0px -40px 0px'`.

- **Hero dot (pulse):**  
  Keyframes: `0%, 100% { opacity: 0.4 }`, `50% { opacity: 1 }`.  
  Animation: `breathe 3s ease-in-out infinite`.  
  Dot size: `6px`.

- **Scroll line (orange fill):**  
  Container: `1px × 32px`, `overflow: hidden`.  
  Inner: `background: var(--orange)`, `top: -100%` → `top: 100%`.  
  Keyframes: `0% { top: -100%; }`, `50%, 100% { top: 100%; }`.  
  Animation: `scrolld 2s ease-in-out infinite`.

- **Confidence bar (demo card):**  
  Width: `0%` → `87%` when card scrolls into view.  
  Transition: `width 1.8s cubic-bezier(0.25, 1, 0.5, 1)`.

- **Step number hover:**  
  Default color `var(--gray-100)`; on step hover `color: var(--orange-soft)`.  
  Transition: `color 0.4s ease`.

- **Nav/buttons/cards:**  
  Nav button hover: `opacity: 0.8`.  
  Hero primary button hover: `transform: translateY(-2px)`, `box-shadow: 0 12px 40px rgba(0,0,0,0.15)`.  
  Ghost button hover: `border-color: var(--gray-400)`, `color: var(--black)`.  
  Demo card hover: `box-shadow: 0 24px 80px rgba(0,0,0,0.06)`, transition `0.6s`.  
  Pricing card hover: `transform: translateY(-4px)`, `box-shadow: 0 20px 60px rgba(0,0,0,0.06)`.

---

## Responsive breakpoint

- **768px:**  
  Nav: hide text links, keep logo + Get Started.  
  Hero: buttons stack, full width.  
  Steps: single column.  
  Features: single column (number above content).  
  Pricing: single column, max-width `400px` centered.  
  Footer: column, centered, reduced padding.

---

## Section IDs and behavior

- `#steps` — How It Works section (nav "How It Works" and "Learn More" scroll here).
- `#upload` — Try It / upload section ("Try a Free Appraisal" scrolls here).
- `#pricing` — Pricing section (nav "Pricing" scrolls here).

---

## Functional requirements (do not remove)

- Upload zone: hidden `<input type="file" accept="image/*">` with `capture="environment"` for mobile. On file select or drop: validate ≤10MB, `POST /api/appraise` with `FormData` field `image`. On success: `sessionStorage.setItem('appraisalResult', JSON.stringify(result))`, `navigate('/appraise/results')`. Show loading state ("Scanning eBay, Mercari, Craigslist...") and error message in zone.
- "Get Started" → `/signup`. Pro "Start Free Trial" → `/signup`. Footer Privacy/Terms/Contact → `/privacy-policy`, `/terms-of-service`, `/community`.

This spec is the single source of truth for landing page visuals and layout; match it exactly when making changes.
