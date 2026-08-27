import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  FileText,
  Landmark,
  Coins,
  CreditCard,
  ArrowLeftRight,
  CheckSquare,
  Clock,
  BookOpen,
  History,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../hooks/AuthContext'
import { usePreferences } from '../../hooks/usePreferences'
import { useDirtyStateContext } from '../../context/DirtyStateContext'
import { useCompanyProfile } from '../../context/ProfileContext'
import { hasPermission } from '../../utils/permissions'

const navGroups = [
  {
    title: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', permission: 'dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Vendors',
    items: [
      { path: '/vendors', label: 'Vendors', permission: 'vendors', icon: Building2 },
      { path: '/bills', label: 'Purchase Bills', permission: 'purchase_bills', icon: FileText },
    ]
  },
  {
    title: 'Finance',
    items: [
      { path: '/financiers', label: 'Finance', permission: 'finance', icon: Landmark },
      { path: '/loans', label: 'Loans', permission: 'loans', icon: Coins },
    ]
  },
  {
    title: 'Payments',
    items: [
      { path: '/payments', label: 'Vendor Payments', permission: 'vendor_payments', icon: CreditCard },
      { path: '/financier-payments', label: 'Fin. Repayments', permission: 'financial_repayments', icon: ArrowLeftRight },
      { path: '/cheques', label: 'Cheques', permission: 'cheques', icon: CheckSquare },
    ]
  },
  {
    title: 'Reporting',
    items: [
      { path: '/outstanding', label: 'Outstanding', permission: 'outstanding', icon: Clock },
      { path: '/ledger', label: 'Ledger', permission: 'ledger', icon: BookOpen },
      { path: '/transaction-history', label: 'Transactions', permission: 'transactions', icon: History },
      { path: '/reports', label: 'Reports', permission: 'reports', icon: BarChart3 },
    ]
  },
  {
    title: 'System',
    items: [
      { path: '/settings', label: 'Settings', permission: 'settings', icon: Settings },
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

  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => hasPermission(user, item.permission))
  })).filter(group => group.items.length > 0)

  return (
    <aside
      className="sidebar-bg flex flex-col min-h-screen h-full sticky top-0 shrink-0 transition-all duration-300"
      style={{ borderRight: '1px solid rgba(255,255,255,0.06)', width: sidebarCollapsed ? '68px' : '236px' }}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center shrink-0 ${sidebarCollapsed ? 'justify-center px-0' : 'px-5 justify-between'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {sidebarCollapsed ? (
          <div
            onClick={() => setSidebarCollapsed(false)}
            className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm cursor-pointer hover:opacity-80 transition-opacity overflow-hidden shadow-sm"
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
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 overflow-hidden shadow-sm"
                style={{ background: companyProfile?.logo ? '#fff' : 'var(--gradient-primary)', color: '#fff', fontFamily: 'var(--font-display)' }}
              >
                {companyProfile?.logo ? (
                  <img src={companyProfile.logo} alt="Logo" className="h-full w-full object-contain p-0.5" />
                ) : (
                  brandInitial
                )}
              </div>
              <div className="truncate">
                <p className="text-[14px] font-black tracking-wider leading-none truncate" style={{ color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                  {(companyProfile?.businessName || 'VASTRAMS').toUpperCase()}
                </p>
                <p className="text-[10px] font-semibold mt-1 tracking-wider text-slate-400" style={{ letterSpacing: '0.12em' }}>
                  VENDOR FINANCE
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="text-xs font-semibold px-2 py-1 rounded-lg transition-all shrink-0"
              style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              title="Collapse"
            >
              ‹
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-5 ${sidebarCollapsed ? 'px-2' : 'px-3.5'}`} style={{ gap: '22px', display: 'flex', flexDirection: 'column' }}>
        {visibleGroups.map((group, idx) => (
          <div key={idx}>
            {!sidebarCollapsed && (
              <p
                className="text-[10.5px] font-bold uppercase px-3 mb-1.5 tracking-wider"
                style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-display)' }}
              >
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const ItemIcon = item.icon
                return (
                  <NavLink
                    key={itemIdx}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onClose}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) => [
                      'flex items-center rounded-xl text-sm font-semibold transition-all duration-150 relative group',
                      isActive ? 'sidebar-active-indicator' : '',
                      sidebarCollapsed ? 'justify-center h-10 w-full' : 'px-3 py-2.5 gap-3',
                    ].join(' ')}
                    style={({ isActive }) => ({
                      background: isActive ? 'rgba(0, 200, 150, 0.12)' : 'transparent',
                      color: isActive ? '#00C896' : 'rgba(255,255,255,0.65)',
                      fontFamily: 'var(--font-body)',
                    })}
                    onMouseEnter={e => {
                      const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.95)'
                      }
                    }}
                    onMouseLeave={e => {
                      const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                      }
                    }}
                  >
                    {ItemIcon && (
                      <ItemIcon className="w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105" />
                    )}
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                )
              })}
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
              className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: 'var(--gradient-primary)', color: '#fff' }}
              title={`${user?.name || 'Admin User'} — Click to expand`}
            >
              {initials}
            </div>
            <button
              onClick={logout}
              className="text-[10px] font-semibold px-1 py-0.5 rounded"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#E84545'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              title="Log Out"
            >
              Out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                style={{ background: 'var(--gradient-primary)', color: '#fff' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate text-white">
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-[11px] truncate text-slate-400">
                  {user?.email || 'admin@vastrams.in'}
                </p>
              </div>
            </div>
            <button
              onClick={() => confirmNavigation(logout)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
              style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E84545'; e.currentTarget.style.background = 'rgba(232,69,69,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
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
