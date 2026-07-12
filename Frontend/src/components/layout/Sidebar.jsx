import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  Coins,
  CreditCard,
  History,
  CheckSquare,
  BookOpen,
  ScrollText,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../hooks/AuthContext'
import { usePreferences } from '../../hooks/usePreferences'

const navGroups = [
  {
    title: 'OVERVIEW',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'VENDORS',
    items: [
      { path: '/vendors', label: 'Vendors', icon: Users },
      { path: '/bills', label: 'Purchase bills', icon: FileText },
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { path: '/financiers', label: 'Finance', icon: Building2 },
      { path: '/loans', label: 'Loans', icon: Coins },
    ]
  },
  {
    title: 'PAYMENTS',
    items: [
      { path: '/payments', label: 'Vendor Payments', icon: CreditCard },
      { path: '/financier-payments', label: 'Fin. Repayments', icon: History },
      { path: '/cheques', label: 'Cheques', icon: CheckSquare },
    ]
  },
  {
    title: 'REPORTING',
    items: [
      { path: '/outstanding', label: 'Outstanding', icon: BookOpen },
      { path: '/ledger', label: 'Ledger', icon: ScrollText },
      { path: '/transaction-history', label: 'Transactions', icon: FileText },
      { path: '/reports', label: 'Reports', icon: BarChart2 },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
    ]
  }
]

export function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const { sidebarCollapsed, setSidebarCollapsed } = usePreferences()
  const initials = (user?.name || 'AU').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside 
      style={{ background: 'var(--color-sidebar-bg)', borderRight: '1px solid var(--color-border)' }}
      className={`flex flex-col h-screen shrink-0 transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
    >
      {/* Brand Header */}
      <div style={{ borderBottom: '1px solid var(--color-border)' }} className={`h-14 flex items-center shrink-0 ${sidebarCollapsed ? 'justify-center' : 'px-5'}`}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center justify-center space-y-1">
            <div 
              onClick={() => setSidebarCollapsed(false)}
              className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm nav-logo cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: 'var(--gradient-primary)', color: '#fff' }}
              title="Expand Sidebar"
            >
              V
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm nav-logo"
                style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
                V
              </div>
              <span className="font-bold tracking-wide text-sm nav-logo" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>VASTRAMS</span>
            </div>
            <button 
              onClick={() => setSidebarCollapsed(true)} 
              className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-100"
              title="Collapse Sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-5 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-0.5">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pb-1"
                style={{ color: 'var(--color-text-muted)' }}>
                {group.title}
              </p>
            )}
            {group.items.map((item, itemIdx) => (
              <NavLink
                key={itemIdx}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) => [
                  'flex items-center py-2 rounded-lg text-[13px] font-medium transition-all relative',
                  isActive ? 'sidebar-active-indicator' : '',
                  sidebarCollapsed ? 'justify-center px-0' : 'pl-3 pr-2.5 space-x-2.5'
                ].join(' ')}
                style={({ isActive }) => ({
                  background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                  color: isActive ? 'var(--color-sidebar-active-text)' : 'var(--color-sidebar-text)',
                })}
                onMouseEnter={e => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
                  if (!isActive) e.currentTarget.style.background = 'var(--color-bg-hover)'
                }}
                onMouseLeave={e => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', flexShrink: 0 }} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer User Info */}
      <div 
        style={{ borderTop: '1px solid var(--color-border)' }} 
        className={`p-4 shrink-0 flex ${sidebarCollapsed ? 'flex-col items-center space-y-3 justify-center' : 'items-center justify-between'}`}
      >
        {sidebarCollapsed ? (
          <>
            <div 
              onClick={() => setSidebarCollapsed(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer hover:opacity-80"
              style={{ background: 'var(--gradient-primary)', color: '#fff' }}
              title={`${user?.name || 'Admin User'} (Click to expand)`}
            >
              {initials}
            </div>
            <button onClick={logout}
              className="p-1 transition-colors rounded"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
              title="Log Out">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{user?.name || 'Admin User'}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{user?.email || 'admin@vastrams.in'}</p>
              </div>
            </div>
            <button onClick={logout}
              className="p-1 transition-colors rounded"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
              title="Log Out">
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
