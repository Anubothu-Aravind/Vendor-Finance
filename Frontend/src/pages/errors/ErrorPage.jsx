import React from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import lonely404Lottie from './assets/Lonely 404.lottie?url'

export function ErrorPage({ code = 'Oops', headline = 'Something went wrong', subtext = 'An unexpected error occurred.' }) {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-base)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
      boxSizing: 'border-box',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Faint Background Grid Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Decorative center radial glow */}
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
        {/* Lottie Animation (404 Page Only, max 200px, positioned above the error code) */}
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

        {/* Large Styled Error Code */}
        <h1 style={{
          margin: 0,
          fontSize: '120px',
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
          textBalance: 'balance',
        }}>
          {subtext}
        </p>

        {/* Buttons (Side by Side) */}
        <div style={{
          display: 'flex',
          gap: '12px',
          width: '100%',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '11px 20px',
              borderRadius: '8px',
              background: 'var(--gradient-primary, linear-gradient(135deg, #00C896, #00A87E))',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'filter 150ms, transform 100ms',
              flex: '1',
              maxWidth: '160px',
              boxShadow: '0 4px 12px rgba(0, 200, 150, 0.25)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '11px 20px',
              borderRadius: '8px',
              background: 'transparent',
              color: '#cbd5e1',
              fontSize: '14px',
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
              transition: 'background 150ms, color 150ms, transform 100ms',
              flex: '1',
              maxWidth: '160px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#cbd5e1'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default ErrorPage
