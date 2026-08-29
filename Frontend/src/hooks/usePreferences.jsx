import { useState, useEffect, useMemo, createContext, useContext } from 'react'
import api from '../utils/api'

const PreferencesContext = createContext()

// ── Extract first #hex color from a gradient string ───────────────────────────
export function extractFirstColor(gradient) {
  const match = gradient.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)
  return match ? match[0] : '#00C896'
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #00C896 0%, #00A87E 100%)'
const DEFAULT_ACCENT   = '#00C896'

const defaultPreferences = {
  theme:       'light',    // 'light' | 'dark' | 'system'
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
  root.style.setProperty('--gradient-primary',    DEFAULT_GRADIENT)
  root.style.setProperty('--color-primary',       accent)
  root.style.setProperty('--color-primary-hover', accent)
  root.style.setProperty('--color-primary-muted', accent + '20')
}

// ── Apply theme class to <html> ───────────────────────────────────────────────
function applyThemeClass(theme = 'light') {
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
    try {
      localStorage.setItem('vastrams_ui_prefs', JSON.stringify({ sidebarCollapsed: collapsed }))
    } catch {
      // Ignore localStorage errors
    }
    api.put('/settings/ui-prefs', { sidebarCollapsed: collapsed })
      .catch(err => console.error('Failed to sync sidebar prefs:', err))
  }

  const [preferences, setPreferencesState] = useState(() => {
    const init = window.__INIT_PREFS__
    if (!init) return defaultPreferences
    return {
      theme:        init.theme        || defaultPreferences.theme,
      gradient:     DEFAULT_GRADIENT,
      accentColor:  DEFAULT_ACCENT,
      currency:     init.currency     || defaultPreferences.currency,
      dateFormat:   init.dateFormat   || defaultPreferences.dateFormat,
      numberFormat: init.numberFormat || defaultPreferences.numberFormat,
    }
  })

  // Synchronize Preferences with Server API
  const setPreferences = async (updater) => {
    setPreferencesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      
      // Update DOM immediately
      applyThemeClass(next.theme)
      applyGradientToDOM(DEFAULT_GRADIENT)

      // Persist locally for instant loading
      try {
        localStorage.setItem('vastrams_appearance', JSON.stringify(next))
      } catch {
        // Ignore localStorage errors
      }

      // Sync with backend API (appearance endpoint for theme & format preferences)
      api.put('/settings/appearance', {
        theme: next.theme,
        gradientValue: next.gradient,
        accentColor: next.accentColor,
        currency: next.currency,
        dateFormat: next.dateFormat,
        numberFormat: next.numberFormat
      }).catch(err => console.error('Failed to sync appearance prefs:', err))

      return next
    })
  }

  // Effect to apply theme & gradient on initial mount
  useEffect(() => {
    applyThemeClass(preferences.theme)
    applyGradientToDOM(DEFAULT_GRADIENT)
  }, [preferences.theme])

  // Listen for system theme changes when mode is set to 'system'
  useEffect(() => {
    if (preferences.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyThemeClass('system')
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [preferences.theme])

  const formatCurrency = (val) => {
    const num = Number(val) || 0
    if (preferences.numberFormat === 'Indian') {
      return num.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    }
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }

  const formatDate = (d) => {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    const day = String(dt.getDate()).padStart(2, '0')
    const month = String(dt.getMonth() + 1).padStart(2, '0')
    const year = dt.getFullYear()
    if (preferences.dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`
    if (preferences.dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`
    return `${day}-${month}-${year}`
  }

  return (
    <PreferencesContext.Provider value={{
      preferences,
      setPreferences,
      sidebarCollapsed,
      setSidebarCollapsed,
      applyGradient: () => applyGradientToDOM(DEFAULT_GRADIENT),
      formatCurrency,
      formatDate,
    }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
