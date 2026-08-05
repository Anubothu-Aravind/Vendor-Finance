import React from 'react'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import { PreferencesProvider } from './hooks/usePreferences'
import { AuthProvider } from './hooks/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // data stays fresh for 30s
      retry: 1,                  // retry once on failure
      refetchOnWindowFocus: true, // background refresh when tab regains focus
    },
  },
})

import { ConfirmationDialogProvider } from './components/ui/ConfirmationDialog'
import { DirtyStateProvider } from './context/DirtyStateContext'
import { ProfileProvider } from './context/ProfileContext'

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <PreferencesProvider>
              <ConfirmationDialogProvider>
                <DirtyStateProvider>
                  <ProfileProvider>
                    <RouterProvider router={router} />
                  </ProfileProvider>
                </DirtyStateProvider>
              </ConfirmationDialogProvider>
            </PreferencesProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App

