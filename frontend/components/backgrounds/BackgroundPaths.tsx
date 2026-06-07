import { motion } from "framer-motion";
import { colors } from "../../lib/tokens";

interface FloatingPathsProps {
  position: number;
}

/**
 * Generates flowing SVG path curves that animate continuously.
 * Based on the 21st.dev BackgroundPaths component, tuned for
 * The Storefront's warm parchment background.
 *
 * Opacity is intentionally very low (max ~0.12) so paths read
 * as atmospheric texture, not foreground elements.
 */
function FloatingPaths({ position }: FloatingPathsProps) {
  const paths = Array.from({ length: 18 }, (_, i) => {
    const idx = i * 2;
    return {
      id: i,
      d: `M-${380 - idx * 5 * position} -${189 + idx * 6}C-${
        380 - idx * 5 * position
      } -${189 + idx * 6} -${312 - idx * 5 * position} ${216 - idx * 6} ${
        152 - idx * 5 * position
      } ${343 - idx * 6}C${616 - idx * 5 * position} ${470 - idx * 6} ${
        684 - idx * 5 * position
      } ${875 - idx * 6} ${684 - idx * 5 * position} ${875 - idx * 6}`,
      width: 0.4 + idx * 0.02,
      strokeOpacity: 0.015 + idx * 0.003,
      duration: 25 + ((i * 2.7) % 15),
    };
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <svg
        style={{ width: "100%", height: "100%", color: colors.forest }}
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.strokeOpacity}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.1, 0.4, 0.1],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Full background paths layer — renders two mirrored sets of curves.
 * Place as an absolutely-positioned child of the hero section.
 */
export function BackgroundPaths() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  );
}
