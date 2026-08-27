import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import { usePreferences } from '../hooks/usePreferences'
import { Mail, Lock, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff, ShieldAlert, Sun, Moon } from 'lucide-react'
import axios from 'axios'
import { API_BASE_URL } from '../utils/api'

export function Setup() {
  const { user, completeSetup } = useAuth()
  const { preferences, setPreferences } = usePreferences()
  const location = useLocation()
  const navigate = useNavigate()

  // Retrieve setupToken from router state or URL query parameter (invitation email link)
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const queryToken = queryParams.get('token')
  const setupToken = location.state?.setupToken || queryToken
  
  useEffect(() => {
    // If authenticated user already has setup complete in DB, bypass /setup -> redirect straight to /
    if (user && user.isDefaultCredential === false) {
      navigate('/', { replace: true })
      return
    }
    if (!setupToken) {
      navigate('/login', { replace: true })
    }
  }, [user, setupToken, navigate])

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shake, setShake] = useState(false)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  // Axios instance with setupToken
  const setupApi = useMemo(() => {
    return axios.create({
      baseURL: `${API_BASE_URL}/auth/setup`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${setupToken}`
      }
    })
  }, [setupToken])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter a valid email address')
      triggerShake()
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await setupApi.post('/send-otp', { email })
      if (res.data && res.data.success) {
        setOtpSent(true)
        setSuccess('OTP verification code has been sent!')
      } else {
        setError(res.data.message || 'Failed to send OTP')
        triggerShake()
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send OTP')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp) {
      setError('Please enter the OTP code')
      triggerShake()
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await setupApi.post('/verify-otp', { email, otp })
      if (res.data && res.data.success) {
        setSuccess('Email verified successfully!')
        setStep(2)
        setError('')
      } else {
        setError(res.data.message || 'OTP verification failed')
        triggerShake()
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'OTP verification failed')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteSetup = async (e) => {
    e.preventDefault()
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields')
      triggerShake()
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      triggerShake()
      return
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      setError('Password does not meet the complexity requirements')
      triggerShake()
      return
    }

    setError('')
    setLoading(true)
    try {
      const res = await setupApi.post('/complete', { email, password })
      if (res.data && res.data.success) {
        // completeSetup sets new main accessToken + user context and clears setupToken
        completeSetup(res.data.accessToken, res.data.user)
        navigate('/', { replace: true })
      } else {
        setError(res.data.message || 'Setup completion failed')
        triggerShake()
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Setup completion failed')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handleSkipSetup = async () => {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const res = await setupApi.post('/skip')
      if (res.data && res.data.success) {
        completeSetup(res.data.accessToken, res.data.user)
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to skip setup')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const isDark = useMemo(() => {
    if (preferences.theme === 'dark') return true
    if (preferences.theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [preferences.theme])

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    setPreferences({ theme: nextTheme })
  }

  // Theme-aware styles
  const colors = {
    bg: isDark ? '#0e1629' : '#f8fafc',
    cardBg: isDark ? '#111d38' : '#ffffff',
    cardBorder: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
    textPrimary: isDark ? '#f1f5f9' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    inputBg: isDark ? '#0e1629' : '#f8fafc',
    inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    inputText: isDark ? '#e2e8f0' : '#0f172a',
    buttonBg: 'var(--color-primary)',
    buttonHover: '#1d51c8',
    themeBtnBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    themeBtnBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    themeBtnColor: isDark ? '#cbd5e1' : '#475569',
    errorBg: isDark ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.05)',
    errorBorder: isDark ? '1px solid rgba(244,63,94,0.2)' : '1px solid rgba(244,63,94,0.15)',
    errorText: isDark ? '#f87171' : '#e11d48',
    successBg: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
    successBorder: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(16,185,129,0.15)',
    successText: isDark ? '#34d399' : '#059669',
  }

  // Check if development mode to show Skip Setup button
  const isDevMode = import.meta.env.DEV || process.env.NODE_ENV === 'development'

  if (!setupToken) return null

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: colors.bg,
      fontFamily: 'Inter, system-ui, sans-serif',
      transition: 'background-color 200ms ease',
      position: 'relative',
      padding: '24px 16px'
    }}>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: colors.themeBtnBg,
          border: `1px solid ${colors.themeBtnBorder}`,
          color: colors.themeBtnColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 200ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = colors.themeBtnBg
        }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Setup Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: colors.cardBg,
        border: colors.cardBorder,
        borderRadius: '16px',
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.25)' : '0 10px 30px rgba(0,0,0,0.05)',
        padding: '36px',
        boxSizing: 'border-box',
        position: 'relative',
        animation: shake ? 'setup-shake 0.45s ease' : 'none',
      }}>
        
        {/* Logo and Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'var(--color-primary)', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>V</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: '16px', color: colors.textPrimary, letterSpacing: '-0.02em' }}>VASTRAMS</span>
          </div>
          <div style={{
            fontSize: '12px', fontWeight: 700,
            color: 'var(--color-primary)', background: 'var(--color-primary-muted)',
            padding: '4px 10px', borderRadius: '12px',
          }}>
            Step {step} of 2
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.02em' }}>
            {step === 1 ? 'Verify your Email Address' : 'Set your New Password'}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.4 }}>
            {step === 1 
              ? 'Please verify a secure email address. We will send a case-insensitive OTP verification code.'
              : 'Update your account password. Choose a strong password that meets complexity rules.'
            }
          </p>
        </div>

        {/* Error / Success Banners */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            background: colors.errorBg, border: colors.errorBorder,
            borderRadius: '8px', padding: '12px', marginBottom: '20px',
          }}>
            <AlertCircle size={16} color={colors.errorText} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '13px', color: colors.errorText, fontWeight: 500, lineHeight: 1.4 }}>{error}</span>
          </div>
        )}

        {success && !error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            background: colors.successBg, border: colors.successBorder,
            borderRadius: '8px', padding: '12px', marginBottom: '20px',
          }}>
            <CheckCircle2 size={16} color={colors.successText} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '13px', color: colors.successText, fontWeight: 500, lineHeight: 1.4 }}>{success}</span>
          </div>
        )}

        {/* Step 1: Email Verification */}
        {step === 1 && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{
                    display: 'block', fontSize: '11px', fontWeight: 600,
                    color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px',
                  }}>Real Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, pointerEvents: 'none' }} />
                    <input
                      type="email"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      required
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); setSuccess('') }}
                      placeholder="name@company.com"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        paddingLeft: '36px', paddingRight: '12px', paddingTop: '11px', paddingBottom: '11px',
                        background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
                        borderRadius: '8px', color: colors.inputText, fontSize: '13px', fontWeight: 500,
                        outline: 'none', transition: 'all 150ms ease', fontFamily: 'inherit',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(35,94,224,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(35,94,224,0.12)' }}
                      onBlur={e  => { e.target.style.borderColor = colors.inputBorder; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px',
                    background: colors.buttonBg, border: 'none', borderRadius: '8px',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = colors.buttonHover }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = colors.buttonBg }}
                >
                  {loading ? 'Sending OTP...' : 'Send OTP Verification'}
                  <ArrowRight size={14} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{
                      display: 'block', fontSize: '11px', fontWeight: 600,
                      color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>Verification OTP Code</label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Change Email
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={e => { setOtp(e.target.value.toUpperCase()); setError(''); setSuccess('') }}
                    placeholder="ENTER OTP"
                    maxLength={6}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 12px',
                      background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
                      borderRadius: '8px', color: colors.inputText, fontSize: '16px', fontWeight: 700,
                      letterSpacing: '4px', textAlign: 'center',
                      outline: 'none', transition: 'all 150ms ease', fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(35,94,224,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(35,94,224,0.12)' }}
                    onBlur={e  => { e.target.style.borderColor = colors.inputBorder; e.target.style.boxShadow = 'none' }}
                  />
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: colors.textSecondary, fontStyle: 'italic' }}>
                    OTP is case-insensitive — type freely
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px',
                    background: colors.buttonBg, border: 'none', borderRadius: '8px',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = colors.buttonHover }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = colors.buttonBg }}
                >
                  {loading ? 'Verifying OTP...' : 'Verify OTP & Continue'}
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Step 2: Password Update */}
        {step === 2 && (
          <form onSubmit={handleCompleteSetup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* New Password */}
            <div>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px',
              }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: '36px', paddingRight: '40px', paddingTop: '11px', paddingBottom: '11px',
                    background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
                    borderRadius: '8px', color: colors.inputText, fontSize: '13px', fontWeight: 500,
                    outline: 'none', transition: 'all 150ms ease', fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(35,94,224,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(35,94,224,0.12)' }}
                  onBlur={e  => { e.target.style.borderColor = colors.inputBorder; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary,
                    padding: '4px', display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px',
              }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, pointerEvents: 'none' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: '36px', paddingRight: '40px', paddingTop: '11px', paddingBottom: '11px',
                    background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
                    borderRadius: '8px', color: colors.inputText, fontSize: '13px', fontWeight: 500,
                    outline: 'none', transition: 'all 150ms ease', fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(35,94,224,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(35,94,224,0.12)' }}
                  onBlur={e  => { e.target.style.borderColor = colors.inputBorder; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary,
                    padding: '4px', display: 'flex', alignItems: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Password Validation Criteria Info */}
            <div style={{
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              border: colors.cardBorder, borderRadius: '8px', padding: '12px',
              fontSize: '11px', color: colors.textSecondary, lineHeight: 1.5,
            }}>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Password must contain:</span>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                <li>At least 8 characters length</li>
                <li>At least 1 uppercase letter</li>
                <li>At least 1 numerical digit</li>
                <li>At least 1 special character (@$!%*?&)</li>
              </ul>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1, padding: '11px',
                  background: 'transparent', border: colors.cardBorder, borderRadius: '8px',
                  color: colors.textPrimary, fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, padding: '11px',
                  background: colors.buttonBg, border: 'none', borderRadius: '8px',
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = colors.buttonHover }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = colors.buttonBg }}
              >
                {loading ? 'Completing Setup...' : 'Complete Setup'}
                <CheckCircle2 size={14} />
              </button>
            </div>
          </form>
        )}

        {/* Floating Skip Setup option in Dev Mode */}
        {isDevMode && (
          <div style={{
            position: 'absolute', bottom: '-40px', right: '0',
            textAlign: 'right', zIndex: 1
          }}>
            <button
              onClick={handleSkipSetup}
              disabled={loading}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600, color: colors.textSecondary,
                padding: '4px', outline: 'none', transition: 'color 120ms',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = colors.textSecondary}
            >
              Skip Setup (Dev mode) <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes setup-shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}

export default Setup
