import React from "react";
import { grid } from "../../lib/tokens";

interface GridProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * 12-column grid container.
 * Max-width 1200px, 24px gutters, 52px page padding.
 */
export function Grid({ children, style = {}, as: Tag = "div" }: GridProps) {
  return (
    <Tag
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${grid.columns}, 1fr)`,
        gap: grid.gap,
        maxWidth: grid.maxWidth,
        margin: "0 auto",
        padding: `0 ${grid.padding}px`,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

interface ColProps {
  span?: number;
  start?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Grid column. Spans 1–12 columns.
 * Optional `start` to place at a specific grid line.
 */
export function Col({ span = 12, start, children, style = {} }: ColProps) {
  return (
    <div
      style={{
        gridColumn: start ? `${start} / span ${span}` : `span ${span}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
