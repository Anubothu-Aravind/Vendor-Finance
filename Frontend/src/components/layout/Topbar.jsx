import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, AlertTriangle, XCircle, CheckCircle2, Info, X } from 'lucide-react'
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
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert':
        return <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
      case 'info':
      default:
        return <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
    }
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

      {getNotificationIcon(n.type)}
      
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-xs font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {n.title}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-normal">
          {n.message}
        </p>
        <p className="text-[10px] text-gray-400 mt-1 font-mono">
          {formatRelativeTime(n.createdAt)}
        </p>
      </div>

      <button
        onClick={(e) => handleDeleteNotification(e, n._id)}
        className="absolute right-2 top-3 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
      >
        <X size={12} />
      </button>
    </div>
  )

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0 relative"
      style={{
        background: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border)',
        zIndex: 40
      }}
    >
      {/* Left: hamburger (mobile) + breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center space-x-2 text-sm">
          <span className="hidden sm:inline font-medium" style={{ color: 'var(--color-text-muted)' }}>VASTRAMS</span>
          <span className="hidden sm:inline" style={{ color: 'var(--color-text-muted)' }}>›</span>
          <span className="page-title" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{title}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3 relative" ref={dropdownRef}>
        {/* Bell icon */}
        <button 
          onClick={() => {
            setShowDropdown(!showDropdown)
            if (!showDropdown) fetchNotifications()
          }}
          className="relative p-2 rounded-lg transition-all"
          style={{ color: showDropdown ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
          onMouseEnter={e => { if (!showDropdown) e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          onMouseLeave={e => { if (!showDropdown) e.currentTarget.style.color = 'var(--color-text-muted)' }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full text-[9px] px-1 font-bold h-4 min-w-4 flex items-center justify-center scale-90 border border-white dark:border-slate-900">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showDropdown && (
          <div 
            className="absolute top-12 right-0 w-80 max-h-[420px] rounded-xl border shadow-xl z-50 flex flex-col"
            style={{ 
              background: 'var(--color-bg-elevated)', 
              borderColor: 'var(--color-border)' 
            }}
          >
            {/* Header */}
            <div className="p-3.5 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </span>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y" style={{ divideColor: 'var(--color-border)' }}>
              {visibleNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  No notifications available
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {recentNotifications.map(n => renderNotificationItem(n))}
                  
                  {olderNotifications.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowEarlier(!showEarlier)}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/10 border-y border-gray-100 dark:border-slate-800 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <span>Earlier Notifications ({olderNotifications.length})</span>
                        <span>{showEarlier ? 'Hide' : 'Show'}</span>
                      </button>
                      
                      {showEarlier && (
                        <div className="divide-y divide-gray-100 dark:divide-slate-800">
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
        <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs font-sans select-none"
          style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)' }}>
          {initials}
        </div>
      </div>
    </header>
  )
}

export default Topbar
