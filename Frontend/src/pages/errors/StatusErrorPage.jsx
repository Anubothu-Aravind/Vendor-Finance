import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ErrorIcons = {
  400: (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" />
      <path d="M16 18l16 16M32 18L16 34" />
    </svg>
  ),
  401: (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="22" width="28" height="20" rx="2" />
      <path d="M16 22v-6a8 8 0 1 1 16 0v6" />
      <circle cx="24" cy="32" r="2.5" />
      <path d="M24 35v4" />
    </svg>
  ),
  403: (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" />
      <path d="M10.5 37.5l27-27" />
    </svg>
  ),
  404: (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="20" r="12" />
      <path d="M28 28l14 14" />
      <path d="M16 20h8M20 16v8" />
    </svg>
  ),
  429: (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" />
      <path d="M24 12v12l7 4" />
      <path d="M8 38l6-6M40 38l-6-6" />
    </svg>
  ),
  500: (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 6l18 32H6L24 6z" />
      <path d="M24 20v8" />
      <circle cx="24" cy="34" r="1.5" fill="currentColor" />
    </svg>
  ),
  503: (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14h36M6 24h28M6 34h18" />
      <circle cx="36" cy="32" r="8" />
      <path d="M36 28v4l3 2" />
    </svg>
  ),
}

const colorSchemes = {
  400: { accent: 'text-orange-500 dark:text-orange-400', ring: 'ring-orange-200 dark:ring-orange-800', grad: 'from-orange-50/70 to-amber-50/50 dark:from-orange-950/50 dark:to-amber-950/30' },
  401: { accent: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-200 dark:ring-yellow-700', grad: 'from-yellow-50/70 to-amber-50/50 dark:from-yellow-950/50 dark:to-amber-950/30' },
  403: { accent: 'text-red-500 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-800', grad: 'from-red-50/70 to-rose-50/50 dark:from-red-950/50 dark:to-rose-950/30' },
  404: { accent: 'text-blue-500 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-700', grad: 'from-blue-50/70 to-sky-50/50 dark:from-blue-950/50 dark:to-sky-950/30' },
  429: { accent: 'text-purple-500 dark:text-purple-400', ring: 'ring-purple-200 dark:ring-purple-700', grad: 'from-purple-50/70 to-violet-50/50 dark:from-purple-950/50 dark:to-violet-950/30' },
  500: { accent: 'text-red-600 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-800', grad: 'from-red-50/70 to-rose-50/50 dark:from-red-950/50 dark:to-rose-950/30' },
  503: { accent: 'text-slate-500 dark:text-slate-400', ring: 'ring-slate-200 dark:ring-slate-700', grad: 'from-slate-50/70 to-gray-50/50 dark:from-slate-900/50 dark:to-gray-900/30' },
}

export function StatusErrorPage({ code = 404, heading, message, action }) {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(code === 429 ? 10 : 0)
  const [btnDisabled, setBtnDisabled] = useState(code === 429)

  const colors = colorSchemes[code] || colorSchemes[404]
  const icon = ErrorIcons[code] || ErrorIcons[404]

  useEffect(() => {
    if (code !== 429) return
    if (countdown <= 0) {
      setBtnDisabled(false)
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, code])

  const handleAction = () => {
    if (action?.onClick) { action.onClick(); return }
    const dest = action?.href || '/'
    if (dest === 'back') navigate(-1)
    else if (dest === 'reload') window.location.reload()
    else navigate(dest)
  }

  const btnLabel = code === 429 && btnDisabled
    ? `${action?.label || 'Try Again'} (${countdown}s)`
    : (action?.label || 'Go to Dashboard')

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-md text-center rounded-2xl overflow-hidden border border-white/25 dark:border-slate-700/50 shadow-2xl shadow-black/10 dark:shadow-black/50 backdrop-blur-2xl bg-white/65 dark:bg-slate-900/55">
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.grad} pointer-events-none`} />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/40 dark:ring-white/5 pointer-events-none" />
        <div className="relative z-10 px-8 py-12 flex flex-col items-center gap-5">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-white/60 dark:bg-slate-800/60 ring-2 ${colors.ring} backdrop-blur-sm shadow-inner ${colors.accent}`}>
            {icon}
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-widest bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-slate-700/40 ${colors.accent}`}>
            {code}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50 leading-tight">{heading}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed max-w-xs">{message}</p>
          <button
            onClick={handleAction}
            disabled={btnDisabled}
            className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-brand-primary text-white hover:bg-brand-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StatusErrorPage
