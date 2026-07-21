import React, { useState } from 'react'
import { Save, Trash2, ChevronUp, AlertCircle } from 'lucide-react'
import { useDirtyStateContext } from '../../context/DirtyStateContext'

export function UnsavedChangesIndicator() {
  const { dirtyCount, dirtyFormsList, saveAllDirtyForms, discardAllDirtyForms } = useDirtyStateContext()
  const [showDrawer, setShowDrawer] = useState(false)

  if (dirtyCount === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9000] flex flex-col items-end gap-2 animate-bounceIn">
      {/* Expanded Forms Review Drawer */}
      {showDrawer && (
        <div
          className="w-72 rounded-xl p-3 shadow-2xl border backdrop-blur-md space-y-2 mb-1 animate-slideUp text-xs"
          style={{
            background: 'var(--color-bg-elevated, #1e293b)',
            borderColor: 'var(--color-border, #334155)',
            color: 'var(--color-text-primary, #f8fafc)',
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold uppercase tracking-wider text-[10px] text-gray-400">
              Unsaved Forms ({dirtyCount})
            </span>
            <button
              onClick={() => setShowDrawer(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {dirtyFormsList.map(form => (
              <div key={form.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-black/20 text-gray-200">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                  <span className="truncate font-medium">{form.title}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/10 flex gap-2">
            <button
              onClick={discardAllDirtyForms}
              className="flex-1 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold text-[11px] transition-all flex items-center justify-center gap-1"
            >
              <Trash2 size={12} /> Discard All
            </button>
            <button
              onClick={saveAllDirtyForms}
              className="flex-1 py-1.5 rounded-lg text-white font-semibold text-[11px] transition-all flex items-center justify-center gap-1 shadow-sm hover:opacity-90"
              style={{ background: 'var(--color-primary, #00C896)' }}
            >
              <Save size={12} /> Save All
            </button>
          </div>
        </div>
      )}

      {/* VS Code Style Indicator Bar */}
      <div
        className="flex items-center gap-3 px-3.5 py-2 rounded-xl shadow-lg border backdrop-blur-md text-xs font-semibold"
        style={{
          background: 'rgba(30, 41, 59, 0.95)',
          borderColor: 'rgba(245, 166, 35, 0.4)',
          color: '#f8fafc',
        }}
      >
        <button
          onClick={() => setShowDrawer(prev => !prev)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
          </span>
          <span>
            Unsaved Changes ({dirtyCount} {dirtyCount === 1 ? 'form' : 'forms'})
          </span>
          <ChevronUp size={14} className={`transition-transform duration-200 ${showDrawer ? 'rotate-180' : ''}`} />
        </button>

        <div className="h-4 w-px bg-white/15 mx-0.5"></div>

        <button
          onClick={saveAllDirtyForms}
          className="px-2.5 py-1 rounded-lg text-white text-[11px] font-bold transition-all hover:opacity-90 shadow-xs flex items-center gap-1"
          style={{ background: 'var(--color-primary, #00C896)' }}
        >
          <Save size={12} /> Save All
        </button>
      </div>
    </div>
  )
}
