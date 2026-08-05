import DOMPurify from 'dompurify'

/**
 * Sanitize HTML or raw string input using DOMPurify
 * Prevents XSS vector injections
 */
export function sanitizeHTML(dirty) {
  if (typeof dirty !== 'string') return dirty
  return DOMPurify.sanitize(dirty)
}

export function sanitizeText(text) {
  if (typeof text !== 'string') return text
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}

export default sanitizeHTML
