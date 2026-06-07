/**
 * YardFront design tokens — aligned with YardFront.html reference
 */

export const colors = {
  parchment: "#F0EAE0",
  chalk: "#FFFDF7",
  forest: "#1A2A1C",
  forestHair: "#263A28",
  forestMuted: "#7A9A7C",
  forestSoft: "#4A6B4E",
  forestFaint: "#3D5C3F",
  terracotta: "#B54419",
  terracottaWarm: "#C65A2F",
  terracottaCream: "#FFF8F3",
  terracottaSoft: "#F5D5C4",
  bark: "#9E8B6F",
  sage: "#6B7A6D",
  mist: "#C9BFA9",
  ink: "#2A2822",
  /** @deprecated use terracotta */
  terra: "#B54419",
  cream: "#FFF8F3",
  stone: "#6B7A6D",
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
  spring: { type: "spring" as const, stiffness: 150, damping: 25 },
};

export type Colors = typeof colors;
export type ColorKey = keyof Colors;
