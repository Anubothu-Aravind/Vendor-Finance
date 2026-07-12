import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { setAuthToken } from '../utils/api'

const AuthContext = createContext(null)

// Create a local axios instance for auth actions to avoid request/response interceptors recursion loop
const authApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Keep API bearer token utility in sync with context access token
  useEffect(() => {
    setAuthToken(accessToken)
  }, [accessToken])

  const logout = useCallback(async () => {
    try {
      await authApi.post('/auth/logout')
    } catch (err) {
      console.error('Logout request failed:', err)
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  const silentRefresh = useCallback(async () => {
    try {
      const res = await authApi.post('/auth/refresh')
      if (res.data && res.data.success) {
        const token = res.data.accessToken
        setAccessToken(token)

        // Fetch user profile using the new token
        const meRes = await authApi.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (meRes.data && meRes.data.success) {
          setUser(meRes.data.user)
          return token
        }
      }
    } catch (err) {
      // Silent refresh failed, clear tokens (expected if cookie expired/absent)
      setAccessToken(null)
      setUser(null)
    }
    return null
  }, [])

  // On mount: attempt initial silent refresh
  useEffect(() => {
    const initAuth = async () => {
      await silentRefresh()
      setLoading(false)
    }
    initAuth()
  }, [silentRefresh])

  // Set up token refresh timer (every 50 minutes)
  useEffect(() => {
    if (!accessToken) return

    const interval = setInterval(async () => {
      console.log('[AuthContext] Refreshing token automatically...')
      await silentRefresh()
    }, 50 * 60 * 1000) // 50 minutes

    return () => clearInterval(interval)
  }, [accessToken, silentRefresh])

  const login = async (email, password) => {
    try {
      const res = await authApi.post('/auth/login', { email, password })
      if (res.data && res.data.success) {
        if (res.data.requiresSetup) {
          return { success: true, requiresSetup: true, setupToken: res.data.setupToken }
        }
        setAccessToken(res.data.accessToken)
        setUser(res.data.user)
        return { success: true }
      }
      return { success: false, message: 'Invalid server response' }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed'
      return { success: false, message: errMsg }
    }
  }

  const completeSetup = (token, userObj) => {
    setAccessToken(token)
    setUser(userObj)
  }

  const value = {
    user,
    accessToken,
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
