import { useState, useEffect, createContext, useContext } from 'react'
import api from '../utils/api'

const PreferencesContext = createContext()

// ── Extract first #hex color from a gradient string ───────────────────────────
export function extractFirstColor(gradient) {
  const match = gradient.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)
  return match ? match[0] : '#00C896'
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #00C896, #6366f1)'
const DEFAULT_ACCENT   = '#00C896'

const defaultPreferences = {
  theme:       'dark',    // 'light' | 'dark' | 'system'
  gradient:    DEFAULT_GRADIENT,
  accentColor: DEFAULT_ACCENT,
  currency:    'INR',     // 'INR' | 'USD' | 'EUR'
  dateFormat:  'DD-MM-YYYY',
  numberFormat:'Indian'   // 'Indian' | 'International'
}

// ── Apply gradient + derived accent to DOM immediately ────────────────────────
function applyGradientToDOM(gradientValue) {
  const root = document.documentElement
  const accent = extractFirstColor(gradientValue)
  root.style.setProperty('--gradient-primary',    gradientValue)
  root.style.setProperty('--color-primary',       accent)
  root.style.setProperty('--color-primary-hover', accent)
  root.style.setProperty('--color-primary-muted', accent + '20')
}

// ── Apply theme class to <html> ───────────────────────────────────────────────
function applyThemeClass(theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.add('light')
  } else {
    // system
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.add(isDark ? 'dark' : 'light')
  }
}

export function PreferencesProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    const init = window.__INIT_PREFS__
    return init ? !!init.sidebarCollapsed : false
  })

  const setSidebarCollapsed = async (collapsed) => {
    setSidebarCollapsedState(collapsed)
    api.put('/settings/ui-prefs', { sidebarCollapsed: collapsed })
      .catch(err => console.error('Failed to sync sidebar prefs:', err))
  }

  const [preferences, setPreferencesState] = useState(() => {
    const init = window.__INIT_PREFS__
    if (init) {
      return {
        theme:       init.theme || 'dark',
        gradient:    init.gradientValue || DEFAULT_GRADIENT,
        accentColor: init.accentColor || DEFAULT_ACCENT,
        currency:    init.currency || 'INR',
        dateFormat:  init.dateFormat || 'DD-MM-YYYY',
        numberFormat:init.numberFormat || 'Indian'
      }
    }
    return defaultPreferences
  })

  const setPreferences = async (newPref) => {
    setPreferencesState(prev => {
      const updated = { ...prev, ...newPref }
      
      // Async database persistence
      api.put('/settings/appearance', {
        theme:       updated.theme,
        gradientValue: updated.gradient,
        accentColor: updated.accentColor,
        currency:    updated.currency,
        dateFormat:  updated.dateFormat,
        numberFormat:updated.numberFormat
      }).catch(err => console.error('Failed to save appearance settings to DB:', err))

      return updated
    })
  }

  // ── Apply gradient when it changes ──────────────────────────────────────────
  const applyGradient = (gradientValue) => {
    applyGradientToDOM(gradientValue)
    setPreferences({ gradient: gradientValue, accentColor: extractFirstColor(gradientValue) })
  }

  // ── Theme effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    applyThemeClass(preferences.theme)
  }, [preferences.theme])

  // ── Gradient effect (on mount + change) ─────────────────────────────────────
  useEffect(() => {
    const gradient = preferences.gradient || DEFAULT_GRADIENT
    applyGradientToDOM(gradient)
  }, [preferences.gradient])

  // ── System theme change listener ─────────────────────────────────────────────
  useEffect(() => {
    if (preferences.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preferences.theme])

  // ── Currency formatter ───────────────────────────────────────────────────────
  const formatCurrency = (amount) => {
    const symbolMap = { INR: '₹', USD: '$', EUR: '€' }
    const localeMap = { Indian: 'en-IN', International: 'en-US' }
    const symbol = symbolMap[preferences.currency] || '₹'
    const locale = localeMap[preferences.numberFormat] || 'en-IN'
    const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${symbol}${formatter.format(amount || 0)}`
  }

  // ── Date formatter ───────────────────────────────────────────────────────────
  const formatDate = (dateInput) => {
    if (!dateInput) return '—'
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return String(dateInput)
    const day   = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year  = date.getFullYear()
    if (preferences.dateFormat === 'MM-DD-YYYY') return `${month}-${day}-${year}`
    if (preferences.dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`
    return `${day}-${month}-${year}`
  }

  return (
    <PreferencesContext.Provider value={{ 
      preferences, setPreferences, applyGradient, formatCurrency, formatDate,
      sidebarCollapsed, setSidebarCollapsed 
    }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider')
  return context
}
