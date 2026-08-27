import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import lonely404Lottie from './assets/Lonely 404.lottie?url'

export function ErrorPage({ code = 'Oops', headline = 'Something went wrong', subtext = 'An unexpected error occurred.', onRetry }) {
  let navigate = null
  try {
    navigate = useNavigate()
  } catch {
    navigate = null
  }

  const safeNavigate = (dest, opts) => {
    if (navigate) {
      navigate(dest, opts)
    } else if (typeof dest === 'number') {
      window.history.go(dest)
    } else {
      window.location.href = dest
    }
  }

  let queryClient = null
  try { queryClient = useQueryClient() } catch { queryClient = null }

  const handleRevalidateAndRetry = async () => {
    try {
      // 1. Invalidate all TanStack Query caches
      if (queryClient) {
        await queryClient.invalidateQueries()
        queryClient.clear()
      }
    } catch (err) {
      console.error('Failed to invalidate queries during revalidation:', err)
    }

    // 2. Invoke custom retry handler if provided
    if (onRetry) {
      onRetry()
      return
    }

    // 3. Route Recovery logic
    const currentPath = window.location.pathname
    if (currentPath.startsWith('/error/')) {
      // Return to Dashboard or previous page if on explicit error route
      safeNavigate('/', { replace: true })
    } else {
      // Revalidate active route
      safeNavigate(0)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-base, #0b0f19)',
      color: 'var(--color-text-primary, #f8fafc)',
      fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
      boxSizing: 'border-box',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Grid Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Center radial glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 200, 150, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Content Container */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '480px',
        width: '100%',
      }}>
        {/* Lottie Animation (404 Page Only) */}
        {code === '404' && (
          <div style={{
            width: '200px',
            height: '200px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <DotLottieReact
              src={lonely404Lottie}
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}

        {/* Styled Error Code */}
        <h1 style={{
          margin: 0,
          fontSize: '100px',
          fontWeight: 900,
          lineHeight: '1',
          letterSpacing: '-0.04em',
          color: 'var(--color-primary, #00C896)',
          textShadow: '0 4px 20px rgba(0, 200, 150, 0.20)',
        }}>
          {code}
        </h1>

        {/* Headline */}
        <h2 style={{
          margin: '20px 0 10px',
          fontSize: '24px',
          fontWeight: 700,
          color: '#f8fafc',
          letterSpacing: '-0.02em',
        }}>
          {headline}
        </h2>

        {/* Subtext */}
        <p style={{
          margin: '0 0 32px',
          fontSize: '15px',
          color: '#94a3b8',
          lineHeight: '1.6',
        }}>
          {subtext}
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          width: '100%',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={handleRevalidateAndRetry}
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              background: 'var(--gradient-primary, linear-gradient(135deg, #00C896, #00A87E))',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 200, 150, 0.25)',
            }}
          >
            Retry & Revalidate
          </button>

          <button
            onClick={() => safeNavigate('/')}
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer',
            }}
          >
            Dashboard
          </button>

          <button
            onClick={() => window.history.back()}
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              background: 'transparent',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default ErrorPage
