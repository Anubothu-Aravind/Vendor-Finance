import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'

/**
 * PublicRoute: wraps routes that should only be visible to unauthenticated users.
 * If a user is already logged in and tries to access /login, they get sent to /.
 */
export function PublicRoute({ children, redirectTo = '/' }) {
  const { user, loading } = useAuth()

  // While auth is being resolved (e.g. refreshing token on mount), show nothing
  if (loading) return null

  // Already authenticated → redirect to app
  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}

export default PublicRoute
