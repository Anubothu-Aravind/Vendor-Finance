const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : null)

// Static explicitly allowed origins
const getStaticAllowedOrigins = () => [
  normalizeOrigin(process.env.FRONTEND_URL),
  normalizeOrigin(process.env.CLIENT_URL),
  'https://vastrams.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5001'
].filter(Boolean)

// Safe regex allowlist for Vastrams Vercel project preview and deployment domains
// e.g. https://vastrams-hnxxkpee5-purushottam897s-projects.vercel.app
//      https://vastrams-git-main-purushottam897s-projects.vercel.app
//      https://vastrams-preview.vercel.app
//      https://vendor-finance-*.vercel.app
const VASTRAMS_VERCEL_REGEX = /^https:\/\/(vastrams|vendor-finance)[a-z0-9-]*\.vercel\.app$/i

const isOriginAllowed = (origin) => {
  // Allow non-browser requests (e.g. server-to-server, curl, Postman, mobile apps)
  if (!origin) return true
  const cleanOrigin = normalizeOrigin(origin)
  const allowed = getStaticAllowedOrigins()
  if (allowed.includes(cleanOrigin)) return true
  if (VASTRAMS_VERCEL_REGEX.test(cleanOrigin)) return true
  return false
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  credentials: true, // Allow HttpOnly cookie transmission
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-refresh-token', 'X-Refresh-Token'],
  optionsSuccessStatus: 200
}

module.exports = {
  normalizeOrigin,
  getStaticAllowedOrigins,
  VASTRAMS_VERCEL_REGEX,
  isOriginAllowed,
  corsOptions
}

