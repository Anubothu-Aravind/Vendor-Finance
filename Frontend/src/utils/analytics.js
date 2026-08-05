/**
 * Analytics — pluggable event tracking
 *
 * Ships with a ConsoleProvider by default (structured JSON to console).
 * Add real analytics providers without changing any component code:
 *
 *   import analytics from '@/utils/analytics'
 *   analytics.addProvider(new SegmentProvider(writeKey))
 *   analytics.addProvider(new MixpanelProvider(token))
 *
 * Usage in components:
 *   import analytics from '@/utils/analytics'
 *   analytics.track('profile.save.failed', { stage: 'logo_upload', error: '...' })
 */

/**
 * @typedef {Object} AnalyticsEvent
 * @property {string} event
 * @property {string} timestamp
 * @property {Record<string, *>} [properties]
 */

/**
 * @typedef {Object} AnalyticsProvider
 * @property {string} name
 * @property {(payload: AnalyticsEvent) => void} track
 */

/** @type {AnalyticsProvider[]} */
const providers = []

/**
 * Console provider — always active in development.
 * Outputs structured JSON to make logs grep-able in production aggregators.
 */
const ConsoleProvider = {
  name: 'console',
  track(payload) {
    console.info('[analytics]', JSON.stringify(payload))
  },
}

providers.push(ConsoleProvider)

const analytics = {
  /**
   * Register an analytics provider.
   * @param {AnalyticsProvider} provider
   */
  addProvider(provider) {
    if (!provider?.name || typeof provider?.track !== 'function') {
      console.warn('[analytics] Invalid provider — must have .name and .track()')
      return
    }
    providers.push(provider)
  },

  /**
   * Track an event across all registered providers.
   * Failures in individual providers are caught and logged — they never
   * bubble up to interrupt the user flow.
   *
   * @param {string} event   Dot-namespaced event name, e.g. 'profile.save.failed'
   * @param {Record<string, *>} [properties]
   */
  track(event, properties = {}) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      ...properties,
    }

    for (const provider of providers) {
      try {
        provider.track(payload)
      } catch (err) {
        console.warn(`[analytics] Provider "${provider.name}" threw:`, err)
      }
    }
  },

  /**
   * Remove a provider by name (useful in tests).
   * @param {string} name
   */
  removeProvider(name) {
    const idx = providers.findIndex(p => p.name === name)
    if (idx !== -1) providers.splice(idx, 1)
  },

  /**
   * List currently registered provider names.
   * @returns {string[]}
   */
  getProviders() {
    return providers.map(p => p.name)
  },
}

export default analytics
