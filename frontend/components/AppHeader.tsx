/**
 * App chrome for the redesigned (YardFront 2) screens.
 *
 * Uses the `ui` / `type` tokens, not the legacy parchment palette. The old
 * <Navbar /> still serves the marketing pages until those are migrated.
 */
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ui, type, space, radius } from '../lib/tokens'

interface AppHeaderProps {
  /** Optional secondary action rendered left of the primary button. */
  action?: React.ReactNode
}

const NAV = [
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'Appraise', to: '/' },
  { label: 'My appraisals', to: '/dashboard' },
]

const AppHeader: React.FC<AppHeaderProps> = ({ action }) => {
  const { pathname } = useLocation()

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: ui.bg,
        borderBottom: `1px solid ${ui.border}`,
        fontFamily: type.sans,
      }}
    >
      <div
        style={{
          maxWidth: space.maxWidth,
          margin: '0 auto',
          padding: '0 clamp(16px, 4vw, 32px)',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 36px)', minWidth: 0 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flex: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <rect width="24" height="24" rx="5" fill={ui.ink} />
              <g stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none">
                <path d="M7 16.5 12 7l5 9.5" />
                <path d="M9.6 13.5h4.8" />
              </g>
            </svg>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em', color: ui.ink }}>
              YardFront
            </span>
          </Link>
          <nav style={{ display: 'flex', gap: 'clamp(12px, 2vw, 24px)', fontSize: 14, minWidth: 0 }}>
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                style={{
                  color: pathname === n.to ? ui.ink : ui.muted,
                  fontWeight: pathname === n.to ? 500 : 400,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 'none' }}>
          {action}
          <Link
            to="/marketplace/new"
            style={{
              borderRadius: radius.md,
              background: ui.ink,
              color: '#fff',
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Create listing
          </Link>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
