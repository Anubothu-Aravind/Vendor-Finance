/**
 * Job Queue — named interface
 *
 * Provides a stable API for enqueueing background work. Component and
 * controller code calls named methods (enqueueDeleteLogo, etc.) and never
 * knows about the underlying implementation.
 *
 * Current implementation: in-process via setImmediate (zero dependencies).
 * To migrate to BullMQ, SQS, or RabbitMQ: replace the internals of this
 * file only — controllers stay untouched.
 */

const fs   = require('fs')
const path = require('path')

// ─── Internal dispatcher ────────────────────────────────────────────────────

function processJob(type, payload) {
  switch (type) {
    case 'delete-logo':
      _deleteLogoFile(payload)
      break
    default:
      console.warn(`[jobQueue] Unknown job type: "${type}"`)
  }
}

function _enqueue(type, payload) {
  setImmediate(() => {
    try {
      processJob(type, payload)
    } catch (err) {
      console.error(`[jobQueue] Unhandled error in job "${type}":`, err.message)
    }
  })
}

// ─── Job handler: delete-logo ────────────────────────────────────────────────

function _deleteLogoFile({ logoUrl }) {
  if (!logoUrl || typeof logoUrl !== 'string') return

  // logoUrl is a public path like /uploads/user/abc123_logo.jpg
  // Resolve to the actual filesystem path
  const relPath = logoUrl.replace(/^\//, '') // strip leading slash
  const absPath = path.join(__dirname, '../../upload', relPath.replace(/^uploads\//, ''))

  fs.unlink(absPath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Already deleted — not an error
        console.info(`[jobQueue:delete-logo] File already gone: ${absPath}`)
      } else {
        console.warn(`[jobQueue:delete-logo] Failed to delete "${absPath}":`, err.message)
      }
    } else {
      console.info(`[jobQueue:delete-logo] Deleted: ${absPath}`)
    }
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

const jobQueue = {
  /**
   * Queue the deletion of an old logo file from disk.
   * Safe to call even if logoUrl is empty/null — no-op in that case.
   *
   * @param {{ logoUrl: string }} payload  The public URL of the logo to delete
   */
  enqueueDeleteLogo(payload) {
    if (!payload?.logoUrl) return
    _enqueue('delete-logo', payload)
  },

  // Future named methods go here, e.g.:
  // enqueueSendEmail(payload) { _enqueue('send-email', payload) }
  // enqueueResizeImage(payload) { _enqueue('resize-image', payload) }
}

module.exports = jobQueue
