import React, { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import PublicRoute from '../components/PublicRoute'

// Lazy loaded page components
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Vendors = lazy(() => import('../pages/Vendors'))
const PurchaseBills = lazy(() => import('../pages/PurchaseBills'))
const VendorPayments = lazy(() => import('../pages/VendorPayments'))
const Financiers = lazy(() => import('../pages/Financiers'))
const FinancierProfile = lazy(() => import('../pages/FinancierProfile'))
const Loans = lazy(() => import('../pages/Loans'))
const FinancierPayments = lazy(() => import('../pages/FinancierPayments'))
const ChequeRegistry = lazy(() => import('../pages/ChequeRegistry'))
const OutstandingStatement = lazy(() => import('../pages/OutstandingStatement'))
const RunningLedger = lazy(() => import('../pages/RunningLedger'))
const TransactionHistory = lazy(() => import('../pages/TransactionHistory'))
const Reports = lazy(() => import('../pages/Reports'))
const Settings = lazy(() => import('../pages/Settings').then(module => ({ default: module.Settings })))
const Login = lazy(() => import('../pages/Login'))
const Setup = lazy(() => import('../pages/Setup'))
const PrintDocument = lazy(() => import('../pages/PrintDocument'))

// Lazy loaded error pages
const Error400 = lazy(() => import('../pages/errors/Error400'))
const Error401 = lazy(() => import('../pages/errors/Error401'))
const Error403 = lazy(() => import('../pages/errors/Error403'))
const Error404 = lazy(() => import('../pages/errors/Error404'))
const Error429 = lazy(() => import('../pages/errors/Error429'))
const Error500 = lazy(() => import('../pages/errors/Error500'))
const Error503 = lazy(() => import('../pages/errors/Error503'))

// Loading placeholder
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px] w-full">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
  </div>
)

const lazyLoad = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        {lazyLoad(Login)}
      </PublicRoute>
    ),
  },
  {
    path: '/print/:type/:id',
    element: (
      <ProtectedRoute>
        {lazyLoad(PrintDocument)}
      </ProtectedRoute>
    )
  },
  {
    path: '/setup',
    element: lazyLoad(Setup)
  },
  {
    path: '/error/400',
    element: lazyLoad(Error400)
  },
  {
    path: '/error/401',
    element: lazyLoad(Error401)
  },
  {
    path: '/error/403',
    element: lazyLoad(Error403)
  },
  {
    path: '/error/404',
    element: lazyLoad(Error404)
  },
  {
    path: '/error/429',
    element: lazyLoad(Error429)
  },
  {
    path: '/error/500',
    element: lazyLoad(Error500)
  },
  {
    path: '/error/503',
    element: lazyLoad(Error503)
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: lazyLoad(Dashboard) },
      { path: 'vendors', element: lazyLoad(Vendors) },
      { path: 'bills', element: lazyLoad(PurchaseBills) },
      { path: 'payments', element: lazyLoad(VendorPayments) },
      { path: 'financiers', element: lazyLoad(Financiers) },
      { path: 'financiers/:id', element: lazyLoad(FinancierProfile) },
      { path: 'loans', element: lazyLoad(Loans) },
      { path: 'financier-payments', element: lazyLoad(FinancierPayments) },
      { path: 'cheques', element: lazyLoad(ChequeRegistry) },
      { path: 'outstanding', element: lazyLoad(OutstandingStatement) },
      { path: 'ledger', element: lazyLoad(RunningLedger) },
      { path: 'transaction-history', element: lazyLoad(TransactionHistory) },
      { path: 'reports', element: lazyLoad(Reports) },
      { path: 'settings', element: lazyLoad(Settings) },
    ]
  },
  {
    path: '*',
    element: lazyLoad(Error404)
  }
])

export default router
