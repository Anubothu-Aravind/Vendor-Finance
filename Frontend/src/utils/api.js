import axios from 'axios'
import { navigateToError } from './errorNavigation'

export const setAuthToken = () => {
  // Access tokens are now managed purely via HttpOnly cookies by the browser.
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Automatically send HttpOnly cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
})

// Status codes that trigger navigation to a dedicated error screen (excluding 401 to prevent login loops)
const ERROR_PAGE_CODES = new Set([403, 429, 500, 503])

// Global response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config || {}
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred'
    const requestUrl = originalRequest.url || ''

    // Skip retry logic for auth endpoints themselves to prevent recursion loops
    const isAuthEndpoint = requestUrl.includes('/auth/login') ||
                          requestUrl.includes('/auth/refresh') ||
                          requestUrl.includes('/auth/me') ||
                          requestUrl.includes('/auth/logout')

    // Handle 401 Unauthorized with automatic cookie token refresh retry for normal data calls
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        const refreshRes = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        if (refreshRes.data && refreshRes.data.success) {
          return api(originalRequest)
        }
      } catch (refreshErr) {
        return Promise.reject(new Error('Session expired. Please log in again.'))
      }
    }

    if (status === 403 && error.response?.data?.requiresSetup) {
      if (window.location.pathname !== '/setup') {
        window.location.href = '/setup'
      }
      return Promise.reject(new Error('Account setup required.'))
    }

    // Only navigate to dedicated error pages for non-auth endpoints if not already on a public/error page
    const currentPath = window.location.pathname
    const isPublicPage = currentPath === '/login' || currentPath === '/setup' || currentPath.startsWith('/error')

    if (status && ERROR_PAGE_CODES.has(status) && !isPublicPage && !isAuthEndpoint) {
      navigateToError(status)
    }

    return Promise.reject(new Error(message))
  }
)

export default api
export { api }
