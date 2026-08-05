/**
 * Feature Flags — abstracted helper
 *
 * Currently backed by localStorage so flags can be toggled at runtime
 * without a deployment. Switch the internal `readFlag` implementation
 * to read from a remote config service (LaunchDarkly, Unleash, ConfigCat,
 * environment variables, etc.) without changing any component code.
 *
 * Usage:
 *   import featureFlags from '@/utils/featureFlags'
 *   if (featureFlags.isEnabled('completionCard')) { ... }
 *
 * Toggle from browser console:
 *   featureFlags.disable('completionCard')   // turn off
 *   featureFlags.enable('completionCard')    // turn on (default)
 */

const FLAG_KEYS = {
  completionCard: 'vf_feat_completion_card',
  draftRestore:   'vf_feat_draft_restore',
  deferredLogo:   'vf_feat_deferred_logo',
  copyButtons:    'vf_feat_copy_buttons',
}

/**
 * Read a flag value from the current provider.
 * Replace this function body to swap backends.
 *
 * @param {string} storageKey  The storage key for this flag
 * @returns {boolean}          true if the flag is enabled
 */
function readFlag(storageKey) {
  try {
    // Default: ON unless explicitly set to the string 'false'
    return localStorage.getItem(storageKey) !== 'false'
  } catch {
    // localStorage unavailable (e.g. private browsing with strict settings)
    return true
  }
}

const featureFlags = {
  /**
   * Check if a named feature flag is enabled.
   * @param {keyof FLAG_KEYS} flag
   * @returns {boolean}
   */
  isEnabled(flag) {
    const key = FLAG_KEYS[flag]
    if (!key) {
      console.warn(`[featureFlags] Unknown flag: "${flag}". Available flags:`, Object.keys(FLAG_KEYS))
      return false
    }
    return readFlag(key)
  },

  /**
   * Enable a feature flag for this browser session.
   * @param {keyof FLAG_KEYS} flag
   */
  enable(flag) {
    const key = FLAG_KEYS[flag]
    if (!key) return
    try {
      localStorage.removeItem(key) // removing = use default (true)
    } catch {}
  },

  /**
   * Disable a feature flag for this browser session.
   * @param {keyof FLAG_KEYS} flag
   */
  disable(flag) {
    const key = FLAG_KEYS[flag]
    if (!key) return
    try {
      localStorage.setItem(key, 'false')
    } catch {}
  },

  /**
   * List all flags with their current state (useful for debugging).
   * @returns {Record<string, boolean>}
   */
  getAll() {
    return Object.fromEntries(
      Object.entries(FLAG_KEYS).map(([name, key]) => [name, readFlag(key)])
    )
  },
}

// Expose to browser console for manual toggling during development
if (typeof window !== 'undefined') {
  window.__featureFlags = featureFlags
}

export default featureFlags
