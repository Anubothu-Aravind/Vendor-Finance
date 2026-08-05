import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/AuthContext'
import { usePreferences } from '../../hooks/usePreferences'
import { useDirtyStateContext } from '../../context/DirtyStateContext'
import { useCompanyProfile } from '../../context/ProfileContext'

const navGroups = [
  {
    title: 'Overview',
    items: [
      { path: '/', label: 'Dashboard' },
    ]
  },
  {
    title: 'Vendors',
    items: [
      { path: '/vendors', label: 'Vendors' },
      { path: '/bills', label: 'Purchase Bills' },
    ]
  },
  {
    title: 'Finance',
    items: [
      { path: '/financiers', label: 'Finance' },
      { path: '/loans', label: 'Loans' },
    ]
  },
  {
    title: 'Payments',
    items: [
      { path: '/payments', label: 'Vendor Payments' },
      { path: '/financier-payments', label: 'Fin. Repayments' },
      { path: '/cheques', label: 'Cheques' },
    ]
  },
  {
    title: 'Reporting',
    items: [
      { path: '/outstanding', label: 'Outstanding' },
      { path: '/ledger', label: 'Ledger' },
      { path: '/transaction-history', label: 'Transactions' },
      { path: '/reports', label: 'Reports' },
    ]
  },
  {
    title: 'System',
    items: [
      { path: '/settings', label: 'Settings' },
    ]
  }
]

export function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const { confirmNavigation } = useDirtyStateContext()
  const { sidebarCollapsed, setSidebarCollapsed } = usePreferences()
  const { companyProfile } = useCompanyProfile()
  const initials = (user?.name || 'AU').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const brandInitial = (companyProfile?.businessName || 'V')[0].toUpperCase()

  return (
    <aside
      className="sidebar-bg flex flex-col min-h-screen h-full sticky top-0 shrink-0 transition-all duration-300 w-56"
      style={{ borderRight: '1px solid rgba(255,255,255,0.06)', width: sidebarCollapsed ? '64px' : '220px' }}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center shrink-0 ${sidebarCollapsed ? 'justify-center px-0' : 'px-5 justify-between'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {sidebarCollapsed ? (
          <div
            onClick={() => setSidebarCollapsed(false)}
            className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
            style={{ background: companyProfile?.logo ? '#fff' : 'var(--gradient-primary)', color: '#fff', fontFamily: 'var(--font-display)' }}
            title="Expand Sidebar"
          >
            {companyProfile?.logo ? (
              <img src={companyProfile.logo} alt="Logo" className="h-full w-full object-contain p-0.5" />
            ) : (
              brandInitial
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 overflow-hidden"
                style={{ background: companyProfile?.logo ? '#fff' : 'var(--gradient-primary)', color: '#fff', fontFamily: 'var(--font-display)' }}
              >
                {companyProfile?.logo ? (
                  <img src={companyProfile.logo} alt="Logo" className="h-full w-full object-contain p-0.5" />
                ) : (
                  brandInitial
                )}
              </div>
              <div className="truncate">
                <p className="text-[13px] font-black tracking-wider leading-none truncate" style={{ color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                  {(companyProfile?.businessName || 'VASTRAMS').toUpperCase()}
                </p>
                <p className="text-[9px] font-medium mt-0.5 tracking-wider" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>
                  VENDOR FINANCE
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="text-[10px] font-medium px-2 py-1 rounded-lg transition-all shrink-0"
              style={{ color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
              title="Collapse"
            >
              ‹
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-5 ${sidebarCollapsed ? 'px-2' : 'px-3'}`} style={{ gap: '24px', display: 'flex', flexDirection: 'column' }}>
        {navGroups.map((group, idx) => (
          <div key={idx}>
            {!sidebarCollapsed && (
              <p
                className="text-[9.5px] font-bold uppercase px-2 mb-1.5"
                style={{ color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', fontFamily: 'var(--font-display)' }}
              >
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item, itemIdx) => (
                <NavLink
                  key={itemIdx}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) => [
                    'flex items-center rounded-lg text-[12.5px] font-semibold transition-all duration-150 relative',
                    isActive ? 'sidebar-active-indicator' : '',
                    sidebarCollapsed ? 'justify-center h-9 w-full' : 'px-3 py-1.5',
                  ].join(' ')}
                  style={({ isActive }) => ({
                    background: isActive ? 'rgba(0, 200, 150, 0.12)' : 'transparent',
                    color: isActive ? '#00C896' : 'rgba(255,255,255,0.45)',
                    fontFamily: 'var(--font-body)',
                  })}
                  onMouseEnter={e => {
                    const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                    }
                  }}
                  onMouseLeave={e => {
                    const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                    }
                  }}
                >
                  {sidebarCollapsed ? (
                    <span className="text-[10px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                      {item.label.slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer User Info */}
      <div
        className={`shrink-0 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              onClick={() => setSidebarCollapsed(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: 'var(--gradient-primary)', color: '#fff' }}
              title={`${user?.name || 'Admin User'} — Click to expand`}
            >
              {initials}
            </div>
            <button
              onClick={logout}
              className="text-[9px] font-semibold px-1 py-0.5 rounded"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#E84545'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
              title="Log Out"
            >
              Out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                style={{ background: 'var(--gradient-primary)', color: '#fff' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {user?.email || 'admin@vastrams.in'}
                </p>
              </div>
            </div>
            <button
              onClick={() => confirmNavigation(logout)}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E84545'; e.currentTarget.style.background = 'rgba(232,69,69,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              title="Log Out"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
