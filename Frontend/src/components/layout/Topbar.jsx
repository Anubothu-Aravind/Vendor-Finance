import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/AuthContext'
import api from '../../utils/api'

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

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function Topbar({ onMenuClick }) {
  const { user } = useAuth()
  const initials = (user?.name || 'AU').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const location = useLocation()
  const navigate = useNavigate()
  const title = pageTitles[location.pathname] || 'Vastrams'

  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showEarlier, setShowEarlier] = useState(false)
  const dropdownRef = useRef(null)

  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('dismissed_notifications')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const fetchNotifications = async () => {
    if (!user) return
    try {
      const res = await api.get('/notifications')
      if (res.success) {
        setNotifications(res.notifications || [])
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handleDataChanged = () => {
      fetchNotifications()
    }
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const visibleNotifications = notifications.filter(n => !dismissedIds.includes(n._id))
  const unreadCount = visibleNotifications.filter(n => !n.read).length

  const handleMarkAsRead = async (id, link) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
      if (link) {
        navigate(link)
      }
      setShowDropdown(false)
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation()
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    try {
      localStorage.setItem('dismissed_notifications', JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save dismissed notifications to localStorage:', err)
    }
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const getNotificationDot = (type) => {
    const colors = { alert: '#E84545', warning: '#F5A623', success: '#00C896', info: '#4A9EFF' }
    return <span className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ background: colors[type] || colors.info }} />
  }

  const now = new Date()
  const recentNotifications = visibleNotifications.filter(n => {
    const created = n.createdAt ? new Date(n.createdAt) : now
    return (now - created) < 24 * 60 * 60 * 1000
  })
  const olderNotifications = visibleNotifications.filter(n => {
    const created = n.createdAt ? new Date(n.createdAt) : now
    return (now - created) >= 24 * 60 * 60 * 1000
  })

  const renderNotificationItem = (n) => (
    <div 
      key={n._id}
      onClick={() => handleMarkAsRead(n._id, n.link)}
      className="p-3 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer relative group"
      style={{ background: n.read ? 'transparent' : 'rgba(0, 200, 150, 0.02)' }}
    >
      {!n.read && (
        <span className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: 'var(--color-primary)' }}></span>
      )}

      {getNotificationDot(n.type)}
      
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          {n.title}
        </p>
        <p className="text-[11px] mt-0.5 leading-normal" style={{ color: 'var(--color-text-muted)' }}>
          {n.message}
        </p>
        <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {formatRelativeTime(n.createdAt)}
        </p>
      </div>

      <button
        onClick={(e) => handleDeleteNotification(e, n._id)}
        className="absolute right-2 top-3 px-1.5 py-0.5 rounded text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-hover)' }}
      >
        ✕
      </button>
    </div>
  )

  return (
    <header
      className="h-16 flex items-center justify-between px-3.5 sm:px-6 md:px-8 shrink-0 relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-30"
    >
      {/* Left: hamburger (mobile) + brand & page title */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 transition-colors shrink-0"
          aria-label="Open menu drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-sm min-w-0">
          <span className="hidden sm:inline text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 shrink-0" style={{ letterSpacing: '0.1em' }}>
            VASTRAMS
          </span>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base tracking-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 relative shrink-0" ref={dropdownRef}>
        {/* Notifications button with Bell icon */}
        <button 
          onClick={() => {
            setShowDropdown(!showDropdown)
            if (!showDropdown) fetchNotifications()
          }}
          aria-label="Notifications"
          className={`relative h-10 w-10 flex items-center justify-center rounded-xl text-xs font-semibold transition-all border ${
            showDropdown
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700'
          }`}
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center bg-rose-500 text-white shadow-xs animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showDropdown && (
          <div 
            className="absolute top-12 right-0 w-[calc(100vw-32px)] sm:w-80 max-w-[360px] max-h-[420px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200" style={{ fontFamily: 'var(--font-display)' }}>
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </span>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-700/60">
              {visibleNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No notifications available
                </div>
              ) : (
                <div>
                  {recentNotifications.map(n => renderNotificationItem(n))}
                  
                  {olderNotifications.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowEarlier(!showEarlier)}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800/40 border-y border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <span>Earlier Notifications ({olderNotifications.length})</span>
                        <span>{showEarlier ? 'Hide' : 'Show'}</span>
                      </button>
                      
                      {showEarlier && (
                        <div>
                          {olderNotifications.map(n => renderNotificationItem(n))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Avatar */}
        <div 
          className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs font-sans text-white shadow-xs select-none"
          style={{ background: 'var(--gradient-primary)' }}
          title={user?.name || 'User'}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}

export default Topbar
