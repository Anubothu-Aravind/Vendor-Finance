import { useEffect, useRef } from 'react'
import featureFlags from '@/utils/featureFlags'
import analytics from '@/utils/analytics'

const DB_NAME    = 'vf-app'
const DB_VERSION = 1
const STORE      = 'drafts'
const DRAFT_KEY  = 'profile'
const EXPIRY_MS  = 24 * 60 * 60 * 1000 // 24 hours
const LS_KEY     = 'vf_profile_draft'   // localStorage fallback
const INTERVAL   = 30_000              // auto-save every 30s

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess  = (e) => resolve(e.target.result)
    req.onerror    = (e) => reject(e.target.error)
  })
}

async function idbSet(data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(data, DRAFT_KEY)
    tx.oncomplete = resolve
    tx.onerror    = (e) => reject(e.target.error)
  })
}

async function idbGet() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(DRAFT_KEY)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

async function idbDelete() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(DRAFT_KEY)
    tx.oncomplete = resolve
    tx.onerror    = (e) => reject(e.target.error)
  })
}

// ─── localStorage fallback ────────────────────────────────────────────────────

function lsSet(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

function lsGet() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function lsDelete() {
  try { localStorage.removeItem(LS_KEY) } catch {}
}

// ─── Universal save / load / delete (IDB with LS fallback) ───────────────────

async function saveDraft(formState) {
  const entry = { data: formState, timestamp: Date.now() }
  try {
    await idbSet(entry)
  } catch {
    lsSet(entry) // IDB unavailable — fall back to localStorage
  }
}

async function loadDraft() {
  let entry = null
  try {
    entry = await idbGet()
  } catch {
    entry = lsGet()
  }
  if (!entry) return null
  // Discard if expired
  if (Date.now() - entry.timestamp > EXPIRY_MS) {
    deleteDraft()
    return null
  }
  return entry
}

async function deleteDraft() {
  try { await idbDelete() } catch {}
  lsDelete()
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useProfileDraft
 *
 * Auto-saves the profile form to IndexedDB (localStorage fallback) every 30s
 * while the form is dirty. On mount, checks for an unexpired draft and returns
 * it so the parent can show a restore banner.
 *
 * Feature-flagged: if 'draftRestore' is disabled, the hook is a no-op.
 *
 * @param {object}  formState   Current form values
 * @param {boolean} isDirty     Whether the form has unsaved changes
 * @returns {{ draft, restoreDraft, discardDraft }}
 *   draft        — { data, timestamp } | null  (non-null when a valid saved draft exists)
 *   restoreDraft — call this when user clicks "Restore Draft"; returns the data
 *   discardDraft — call this after successful save or user dismissal
 */
export function useProfileDraft(formState, isDirty) {
  // We return stable function refs via useRef so callers don't need to
  // worry about stale closures when using these as callbacks.
  const draftRef = useRef(null)

  // This ref holds the setter from the parent — we use a callback pattern
  // so the hook itself doesn't hold any React state (callers do).
  const onDraftLoadedRef = useRef(null)

  if (!featureFlags.isEnabled('draftRestore')) {
    return {
      draft:        null,
      restoreDraft: async () => null,
      discardDraft: async () => {},
    }
  }

  return {
    /**
     * Load any existing draft from storage.
     * Call this once on mount (inside a useEffect in the parent).
     * @returns {Promise<{ data, timestamp } | null>}
     */
    async loadDraftOnMount() {
      const entry = await loadDraft()
      draftRef.current = entry
      return entry
    },

    /**
     * Start the auto-save interval. Returns a cleanup function.
     * Call this inside a useEffect in the parent, passing isDirty.
     */
    startAutoSave(formStateGetter, isDirtyGetter) {
      const id = setInterval(async () => {
        if (isDirtyGetter()) {
          await saveDraft(formStateGetter())
        }
      }, INTERVAL)
      return () => clearInterval(id)
    },

    /**
     * Immediately save the current form state to the draft store.
     * Useful to call before navigation or beforeunload.
     */
    async flush(currentFormState) {
      if (isDirty) await saveDraft(currentFormState)
    },

    /**
     * Return the draft data and track the event.
     * @returns {Promise<object | null>}  The saved form data, or null
     */
    async restoreDraft() {
      const entry = draftRef.current || await loadDraft()
      if (entry?.data) {
        analytics.track('profile.draft.restored', {
          draftAge: Math.round((Date.now() - entry.timestamp) / 60000), // minutes
        })
        return entry.data
      }
      return null
    },

    /**
     * Delete the draft from storage. Call after a successful save.
     */
    async discardDraft() {
      draftRef.current = null
      await deleteDraft()
    },
  }
}

export default useProfileDraft
