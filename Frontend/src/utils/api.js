import axios from 'axios'
import { navigateToError } from './errorNavigation'

let token = null

export const setAuthToken = (newToken) => {
  token = newToken
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach bearer token
api.interceptors.request.use(
  (config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Status codes that trigger navigation to a dedicated error screen
// NOTE: 400 and 404 are intentionally excluded — these are handled inline
// by component catch blocks (e.g. "Vendor not found" toast on delete)
const ERROR_PAGE_CODES = new Set([401, 403, 429, 500, 503])

// Global response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred'

    // Handle 401 Unauthorized with token refresh retry
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        console.log('[API Interceptor] Token expired (401). Attempting refresh...')
        const refreshRes = await axios.post('/api/auth/refresh')
        if (refreshRes.data && refreshRes.data.success) {
          const newToken = refreshRes.data.accessToken
          setAuthToken(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          // Re-run original request with new token
          return api(originalRequest)
        }
      } catch (refreshErr) {
        console.error('[API Interceptor] Refresh failed or token invalid, redirecting to login.')
        setAuthToken(null)
        // Redirect directly to login on refresh failure
        navigateToError(401)
        return Promise.reject(new Error('Session expired. Please log in again.'))
      }
    }

    // Log error details to console
    console.error(`[API] ${status || 'Network'} Error:`, message, originalRequest?.url)

    // Redirect to setup page if forced by backend
    if (status === 403 && error.response?.data?.requiresSetup) {
      window.location.href = '/setup'
      return Promise.reject(new Error('Account setup required.'))
    }

    // Navigate to branded error screen for other codes (or 401 if refresh failed)
    if (status && ERROR_PAGE_CODES.has(status)) {
      if (status === 401) {
        // Direct redirect to login for expired sessions
        window.location.href = '/login'
      } else {
        navigateToError(status)
      }
    }

    return Promise.reject(new Error(message))
  }
)

export default api
export { api }
