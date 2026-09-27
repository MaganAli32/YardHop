/**
 * YardFront design tokens.
 *
 * Two systems live here during the redesign:
 *
 *  - `ui`, `type`, `space`, `radius` — the CURRENT system (YardFront 2 redesign).
 *    White ground, Inter Tight, terracotta accent. Use these for all new work.
 *
 *  - `colors`, `fonts`, `grid` — the LEGACY system (parchment + Cormorant).
 *    Still imported by 12 landing/marketing files. Left intact so nothing breaks;
 *    each is migrated to `ui` as its screen is rebuilt.
 *
 * The accent is identical across both (#B54419), so the brand carries over.
 */

/* ============================================================
   CURRENT SYSTEM
   ============================================================ */

export const ui = {
  /** Page ground. */
  bg: '#ffffff',
  /** Primary text, buttons, dark surfaces. */
  ink: '#0a0a0a',
  /** Body copy on white. */
  body: '#2d2d2d',
  /** Secondary text, labels beside a value. */
  muted: '#3d3d3d',
  /** Tertiary text, column headers, captions. */
  subtle: '#6b6b6b',
  /** Quaternary text, footnotes, axis labels. */
  faint: '#8a8a8a',

  /** The one accent. Prices, active marks, links that act. */
  accent: '#b54419',
  /** Positive movement only (price up, gain). Never for "success". */
  positive: '#2f6b43',

  /** Section rules and card outlines. */
  border: '#e6e6e6',
  /** Row dividers inside a table or list. */
  borderSoft: '#ededed',
  /** Input and control outlines. */
  borderControl: '#e0e0e0',

  /** Tinted panel: typical-range bands, active tab, callouts. */
  surface: '#f7f5f2',
  /** Slightly deeper panel: segmented-control track. */
  surfaceDeep: '#f4f2ef',
  /** Page-level tint for marketing sections. */
  surfacePage: '#faf9f7',
  /** Row hover. */
  surfaceHover: '#fafafa',
  /** Image placeholder ground. */
  placeholder: '#f0ece6',
  /** Icon/ink on a placeholder. */
  placeholderInk: '#b3aa9c',

  /** Chart: primary bar fill. */
  chartInk: '#323232',
  /** Chart: inactive/other-series bar fill. */
  chartMute: '#e4e1db',
  /** Chart: empty bin. */
  chartEmpty: '#f2f0ec',
  /** Tooltip ground. */
  tooltip: '#141414',
} as const;

export const type = {
  sans: '"Inter Tight", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  /** Tabular figures. Every price, count and date gets this. */
  nums: 'tabular-nums' as const,
  weight: { regular: 400, medium: 500, semibold: 600 },
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  xxl: 12,
  pill: 999,
} as const;

export const space = {
  page: 32,
  maxWidth: 1320,
  /** Marketing sections run wider than app screens. */
  maxWidthWide: 1440,
} as const;

/** Uppercase eyebrow above a section heading. */
export const eyebrow = {
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '.14em',
  color: ui.subtle,
};

/* ============================================================
   LEGACY SYSTEM — do not use in new screens
   ============================================================ */

export const colors = {
  parchment: '#F0EAE0',
  chalk: '#FFFDF7',
  forest: '#1A2A1C',
  forestHair: '#263A28',
  forestMuted: '#7A9A7C',
  forestSoft: '#4A6B4E',
  forestFaint: '#3D5C3F',
  terracotta: '#B54419',
  terracottaWarm: '#C65A2F',
  terracottaCream: '#FFF8F3',
  terracottaSoft: '#F5D5C4',
  bark: '#9E8B6F',
  sage: '#6B7A6D',
  mist: '#C9BFA9',
  ink: '#2A2822',
  /** @deprecated use terracotta */
  terra: '#B54419',
  cream: '#FFF8F3',
  stone: '#6B7A6D',
} as const;

export const grid = {
  maxWidth: 1240,
  gap: 24,
  padding: 48,
  columns: 12,
} as const;

export const fonts = {
  serif: '"Cormorant Garamond", "Times New Roman", serif',
  sans: '"Manrope", system-ui, sans-serif',
  mono: '"DM Mono", ui-monospace, Menlo, monospace',
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  spring: { type: 'spring' as const, stiffness: 150, damping: 25 },
};

export type Colors = typeof colors;
export type ColorKey = keyof Colors;
export type Ui = typeof ui;
export type UiKey = keyof Ui;
