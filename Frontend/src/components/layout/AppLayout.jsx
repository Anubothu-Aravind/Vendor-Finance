import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import NavigationSetter from '../NavigationSetter'
import { usePreferences } from '../../hooks/usePreferences'

export function AppLayout() {
  const location = useLocation()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { sidebarCollapsed } = usePreferences()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-canvas select-none">
      {/* Registers navigate function into api.js error navigation singleton */}
      <NavigationSetter />
      {/* Mobile backdrop — only shown when sidebar is open on mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on md+, drawer on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 md:static md:z-auto md:flex
          transform transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar onClose={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Topbar header */}
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Scrollable View Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="min-h-full flex flex-col"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default AppLayout

