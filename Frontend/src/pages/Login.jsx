import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import { Mail, Lock, Eye, EyeOff, BarChart3, FileText, CreditCard, CheckCircle2 } from 'lucide-react'

// ── Feature list shown on the left panel ─────────────────────────────────────
const FEATURES = [
  { icon: FileText,     text: 'Purchase Bills & FIFO payables tracking' },
  { icon: CreditCard,   text: 'Vendor & financier payment reconciliation' },
  { icon: BarChart3,    text: 'Real-time ledger, outstanding & reports' },
  { icon: CheckCircle2, text: 'Cheque lifecycle management' },
]

export function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')
  const [shake, setShake]               = useState(false)
  const [fieldErrors, setFieldErrors]   = useState({ email: '', password: '' })
  const emailRef = useRef(null)

  const from = location.state?.from?.pathname || '/'

  useEffect(() => { emailRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    // ── Manual field validation (so we fully control the error UI) ──
    const newFieldErrors = { email: '', password: '' }
    if (!email.trim())    newFieldErrors.email    = 'Email is required'
    if (!password.trim()) newFieldErrors.password = 'Password is required'
    if (newFieldErrors.email || newFieldErrors.password) {
      setFieldErrors(newFieldErrors)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await login(email, password)
      if (result?.success) {
        if (result?.requiresSetup) {
          navigate('/setup', { replace: true, state: { setupToken: result.setupToken } })
        } else {
          navigate(from, { replace: true })
        }
      } else {
        const msg = result?.message || 'Invalid email or password. Please try again.'
        setError(msg)
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid email or password. Please try again.'
      setError(msg)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--color-bg-base)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Left Panel (40%) ───────────────────────────────────────────── */}
      <div style={{
        width: '40%',
        minHeight: '100vh',
        background: 'var(--color-bg-elevated)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative dot grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
          opacity: 0.6,
        }} />

        {/* Gradient orb */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '-10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,200,150,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Bottom fade overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(to top, var(--color-bg-base), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Logo + brand */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '56px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '20px',
            boxShadow: '0 0 0 1px rgba(0,200,150,0.25), 0 4px 24px rgba(0,200,150,0.20)',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>V</span>
          </div>
          <h1 style={{
            margin: 0, fontSize: '28px', fontWeight: 800,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.03em', lineHeight: 1.15,
          }}>VASTRAMS</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            Vendor &amp; Finance Management
          </p>
        </div>

        {/* Feature list */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            What's inside
          </p>
          {FEATURES.map(({ icon: Icon, text }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(0,200,150,0.08)',
                border: '1px solid rgba(0,200,150,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} color="var(--color-primary)" />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{
          position: 'relative', zIndex: 1, marginTop: 'auto', paddingTop: '48px',
          fontSize: '11px', color: 'var(--color-text-muted)',
        }}>
          © {new Date().getFullYear()} Vastrams · Internal tool
        </p>
      </div>

      {/* ── Right Panel (60%) ──────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        background: 'var(--color-bg-base)',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Card */}
          <div style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '40px',
          }}>
            {/* Heading */}
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{
                margin: 0, fontSize: '22px', fontWeight: 700,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.025em',
              }}>Sign in to your account</h2>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Enter your credentials to continue
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(232,69,69,0.08)',
                borderLeft: '3px solid var(--color-danger)',
                borderRadius: '6px', padding: '10px 12px', marginBottom: '20px',
                animation: shake ? 'login-shake 0.45s ease' : 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="var(--color-danger)" strokeWidth="1.4"/>
                  <path d="M7 4v3.5M7 9.5v.01" stroke="var(--color-danger)" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: 600,
                  color: 'var(--color-text-muted)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: '6px',
                }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                  <input
                    ref={emailRef}
                    type="email"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); setFieldErrors(fe => ({ ...fe, email: '' })) }}
                    placeholder="name@company.com"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px',
                      background: 'var(--color-bg-elevated)',
                      border: `1px solid ${fieldErrors.email ? 'var(--color-danger)' : 'var(--color-border)'}`,
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px', fontWeight: 500,
                      outline: 'none', transition: 'border-color 150ms ease, box-shadow 150ms ease',
                      fontFamily: 'var(--font-body)',
                    }}
                    onFocus={e => { e.target.style.borderColor = fieldErrors.email ? 'var(--color-danger)' : 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,200,150,0.14)' }}
                    onBlur={e  => { e.target.style.borderColor = fieldErrors.email ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                {fieldErrors.email && (
                  <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-danger)', fontWeight: 500 }}>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: 600,
                  color: 'var(--color-text-muted)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: '6px',
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); setFieldErrors(fe => ({ ...fe, password: '' })) }}
                    placeholder="••••••••"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: '36px', paddingRight: '40px', paddingTop: '10px', paddingBottom: '10px',
                      background: 'var(--color-bg-elevated)',
                      border: `1px solid ${fieldErrors.password ? 'var(--color-danger)' : 'var(--color-border)'}`,
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px', fontWeight: 500,
                      outline: 'none', transition: 'border-color 150ms ease, box-shadow 150ms ease',
                      fontFamily: 'var(--font-body)',
                    }}
                    onFocus={e => { e.target.style.borderColor = fieldErrors.password ? 'var(--color-danger)' : 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,200,150,0.14)' }}
                    onBlur={e  => { e.target.style.borderColor = fieldErrors.password ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-muted)',
                      padding: '4px', display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-danger)', fontWeight: 500 }}>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: '8px',
                  width: '100%', padding: '11px',
                  background: 'var(--gradient-primary)',
                  border: 'none', borderRadius: '10px',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'filter 150ms, transform 100ms',
                  letterSpacing: '-0.01em',
                  opacity: submitting ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.filter = 'brightness(0.9)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = '' }}
                onMouseDown={e  => { if (!submitting) e.currentTarget.style.transform = 'scale(0.985)' }}
                onMouseUp={e    => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {submitting ? (
                  <>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}

export default Login
