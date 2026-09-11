/**
 * Reveal — slide-in-on-scroll wrapper used across brand pages.
 * Slides children up/left/right with a fade as they enter the viewport.
 * Respects prefers-reduced-motion.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type Direction = 'up' | 'left' | 'right'

export interface RevealProps {
  children: ReactNode
  /** Slide direction the content arrives from. Default: 'up'. */
  direction?: Direction
  /** Transition delay in ms (use for stagger). */
  delay?: number
  /** Slide distance in px. Default 28. */
  distance?: number
  className?: string
  style?: CSSProperties
}

const OFFSETS: Record<Direction, (d: number) => string> = {
  up: (d) => `translateY(${d}px)`,
  left: (d) => `translateX(${d}px)`,
  right: (d) => `translateX(-${d}px)`,
}

export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  distance = 28,
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : OFFSETS[direction](distance),
        transition: `opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
