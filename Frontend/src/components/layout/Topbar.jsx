import React from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/AuthContext'

const pageTitles = {
  '/': 'Dashboard',
  '/vendors': 'Vendors',
  '/bills': 'Purchase bills',
  '/payments': 'Vendor Payments',
  '/financiers': 'Finance',
  '/loans': 'Loans',
  '/financier-payments': 'Fin. Repayments',
  '/cheques': 'Cheque Management',
  '/outstanding': 'Outstanding',
  '/ledger': 'Ledger',
  '/transaction-history': 'Transaction History',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export function Topbar({ onMenuClick }) {
  const { user } = useAuth()
  const initials = (user?.name || 'AU').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Vastrams'

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0"
      style={{
        background: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Left: hamburger (mobile) + breadcrumb */}
      <div className="flex items-center space-x-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="hidden sm:inline font-medium" style={{ color: 'var(--color-text-muted)' }}>VASTRAMS</span>
          <span className="hidden sm:inline" style={{ color: 'var(--color-text-muted)' }}>›</span>
          <span className="page-title" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{title}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Bell icon */}
        <button className="relative p-2 rounded-lg transition-all"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--color-primary)' }}></span>
        </button>

        {/* User Avatar */}
        <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs font-sans"
          style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)' }}>
          {initials}
        </div>
      </div>
    </header>
  )
}

export default Topbar
