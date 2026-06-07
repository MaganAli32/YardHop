import { motion } from "framer-motion";
import { colors, ease } from "../../lib/tokens";

interface AnimatedWordProps {
  word: string;
  wordIndex: number;
  delayOffset?: number;
  isItalic?: boolean;
  isTerra?: boolean;
}

/**
 * Renders a word with per-letter spring animation.
 * Each letter slides up from y:80 with a staggered delay.
 */
export function AnimatedWord({
  word,
  wordIndex,
  delayOffset = 0,
  isItalic = false,
  isTerra = false,
}: AnimatedWordProps) {
  return (
    <span
      style={{
        display: "inline-block",
        marginRight: "0.25em",
        fontStyle: isItalic ? "italic" : "normal",
        color: isTerra ? colors.terra : "inherit",
      }}
    >
      {word.split("").map((letter, letterIndex) => (
        <motion.span
          key={`${wordIndex}-${letterIndex}`}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: delayOffset + wordIndex * 0.1 + letterIndex * 0.03,
            ...ease.spring,
          }}
          style={{ display: "inline-block" }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  );
}
