import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Dashboard from '../pages/Dashboard'
import Vendors from '../pages/Vendors'
import PurchaseBills from '../pages/PurchaseBills'
import VendorPayments from '../pages/VendorPayments'
import Financiers from '../pages/Financiers'
import FinancierProfile from '../pages/FinancierProfile'
import Loans from '../pages/Loans'
import FinancierPayments from '../pages/FinancierPayments'
import ChequeRegistry from '../pages/ChequeRegistry'
import OutstandingStatement from '../pages/OutstandingStatement'
import RunningLedger from '../pages/RunningLedger'
import TransactionHistory from '../pages/TransactionHistory'
import Reports from '../pages/Reports'
import { Settings } from '../pages/Settings'
import Login from '../pages/Login'
import Setup from '../pages/Setup'
import ProtectedRoute from '../components/ProtectedRoute'
import PublicRoute from '../components/PublicRoute'
import Error400 from '../pages/errors/Error400'
import Error401 from '../pages/errors/Error401'
import Error403 from '../pages/errors/Error403'
import Error404 from '../pages/errors/Error404'
import Error429 from '../pages/errors/Error429'
import Error500 from '../pages/errors/Error500'
import Error503 from '../pages/errors/Error503'

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/setup',
    element: <Setup />
  },
  {
    path: '/error/400',
    element: <Error400 />
  },
  {
    path: '/error/401',
    element: <Error401 />
  },
  {
    path: '/error/403',
    element: <Error403 />
  },
  {
    path: '/error/404',
    element: <Error404 />
  },
  {
    path: '/error/429',
    element: <Error429 />
  },
  {
    path: '/error/500',
    element: <Error500 />
  },
  {
    path: '/error/503',
    element: <Error503 />
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'vendors', element: <Vendors /> },
      { path: 'bills', element: <PurchaseBills /> },
      { path: 'payments', element: <VendorPayments /> },
      { path: 'financiers', element: <Financiers /> },
      { path: 'financiers/:id', element: <FinancierProfile /> },
      { path: 'loans', element: <Loans /> },
      { path: 'financier-payments', element: <FinancierPayments /> },
      { path: 'cheques', element: <ChequeRegistry /> },
      { path: 'outstanding', element: <OutstandingStatement /> },
      { path: 'ledger', element: <RunningLedger /> },
      { path: 'transaction-history', element: <TransactionHistory /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
    ]
  },
  {
    path: '*',
    element: <Error404 />
  }
])

export default router
