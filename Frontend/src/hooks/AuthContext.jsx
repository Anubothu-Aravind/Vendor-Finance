import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../utils/api'

const AuthContext = createContext(null)

// Create a dedicated axios instance for auth actions targeting the backend API URL
const authApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('vastrams_user_cache')
      if (cached) return JSON.parse(cached)
    } catch {}
    return null
  })
  const [loading, setLoading] = useState(!user)

  const logout = useCallback(async () => {
    try {
      await authApi.post('/auth/logout')
    } catch (err) {
      console.error('Logout request failed:', err)
    } finally {
      setUser(null)
      try { localStorage.removeItem('vastrams_user_cache') } catch {}
    }
  }, [])

  const silentRefresh = useCallback(async () => {
    try {
      const res = await authApi.post('/auth/refresh')
      if (res.data && res.data.success) {
        const u = res.data.user
        if (u) {
          setUser(u)
          try { localStorage.setItem('vastrams_user_cache', JSON.stringify(u)) } catch {}
          return true
        }
        // Fallback in case user object was not included in refresh response
        const meRes = await authApi.get('/auth/me')
        if (meRes.data && meRes.data.success && meRes.data.user) {
          setUser(meRes.data.user)
          try { localStorage.setItem('vastrams_user_cache', JSON.stringify(meRes.data.user)) } catch {}
          return true
        }
      }
    } catch (err) {
      setUser(null)
      try { localStorage.removeItem('vastrams_user_cache') } catch {}
    }
    return false
  }, [])

  // On mount: attempt initial silent refresh once
  useEffect(() => {
    let isMounted = true
    const initAuth = async () => {
      await silentRefresh()
      if (isMounted) {
        setLoading(false)
      }
    }
    initAuth()
    return () => { isMounted = false }
  }, [])

  // Set up token refresh timer (every 10 minutes before 15-minute cookie expiration)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      console.log('[AuthContext] Refreshing session cookie automatically...')
      await silentRefresh()
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user, silentRefresh])

  const login = async (email, password) => {
    try {
      const res = await authApi.post('/auth/login', { email, password })
      if (res.data && res.data.success) {
        if (res.data.requiresSetup) {
          return { success: true, requiresSetup: true, setupToken: res.data.setupToken }
        }
        setUser(res.data.user)
        return { success: true }
      }
      return { success: false, message: 'Invalid server response' }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed'
      return { success: false, message: errMsg }
    }
  }

  const completeSetup = (_token, userObj) => {
    if (userObj) {
      setUser(userObj)
    } else {
      silentRefresh()
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    silentRefresh,
    completeSetup
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
