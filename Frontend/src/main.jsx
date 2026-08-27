import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

const DEFAULT_APPEARANCE = {
  theme: 'light',
  gradientValue: 'linear-gradient(135deg, #00C896, #00A87E)',
  accentColor: '#00C896',
  currency: 'INR',
  dateFormat: 'DD-MM-YYYY',
  numberFormat: 'Indian'
}

const DEFAULT_UI_PREFS = {
  sidebarCollapsed: false
}

function applyAppearance(appearance) {
  const root = document.documentElement
  const theme = appearance?.theme || 'light'
  root.classList.remove('light', 'dark')
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.add('light')
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.add(isDark ? 'dark' : 'light')
  }

  const grad = appearance.gradientValue || 'linear-gradient(135deg, #00C896, #6366f1)'
  const acc = appearance.accentColor || '#00C896'

  root.style.setProperty('--gradient-primary', grad)
  root.style.setProperty('--color-primary', acc)
  root.style.setProperty('--color-primary-hover', acc)
  root.style.setProperty('--color-primary-muted', acc + '20')
}

Promise.all([
  fetch('/api/settings/appearance').then(r => r.json()).catch(() => DEFAULT_APPEARANCE),
  fetch('/api/settings/ui-prefs').then(r => r.json()).catch(() => DEFAULT_UI_PREFS)
])
.then(([appearance, uiPrefs]) => {
  const finalAppearance = appearance.success ? appearance : DEFAULT_APPEARANCE
  const finalUiPrefs = uiPrefs.success ? uiPrefs : DEFAULT_UI_PREFS
  applyAppearance(finalAppearance)
  window.__INIT_PREFS__ = { ...finalAppearance, ...finalUiPrefs }
})
.catch(() => {
  applyAppearance(DEFAULT_APPEARANCE)
  window.__INIT_PREFS__ = { ...DEFAULT_APPEARANCE, ...DEFAULT_UI_PREFS }
})
.finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
