require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const rateLimit = require('express-rate-limit')
const passport = require('passport')
const path = require('path')

const connectDB = require('./config/db')
const errorHandler = require('./middleware/errorHandler')

// Loud validation of basic environment variables
const PORT = process.env.PORT || 5000

// Initialize Express App
const app = express()

// 1. Helmet HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local dev assets / inline styles
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))

// 2. NoSQL Injection Prevention (express-mongo-sanitize)
// Strips keys beginning with '$' or '.' to neutralize NoSQL injection attacks
app.use(mongoSanitize({
  replaceWith: '_'
}))

// 3. Passport.js Authentication Strategy Initialization
require('./config/passport')(passport)
app.use(passport.initialize())

// 4. Initialize SMTP Transporter Verification
require('./config/mailer')

// Connect to Database and seed initial data
connectDB().then(() => {
  const seedAdminUser = require('./config/seed')
  seedAdminUser()
})

// 4. Strict CORS configuration bounded to explicit FRONTEND_URL destination
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean)

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server) or listed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} not permitted`))
    }
  },
  credentials: true, // Allow HttpOnly cookie transmission
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

// 5. Rate Limiting Protection
// Dedicated strict rate limiter for login endpoint to prevent brute-forcing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  }
})
app.use('/api/auth/login', loginLimiter)

// General API rate limiter to prevent mass database scraping
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 500, // Max 500 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many API requests. Please slow down.'
  }
})
app.use('/api/', apiLimiter)

// Parsing middleware
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
app.use(cookieParser())

// Request ID tracking middleware
const requestId = require('./middleware/requestId.middleware')
app.use(requestId)

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../upload')))

// Base Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() })
})

// Global Setup Verification Middleware
const requiresSetupComplete = require('./middleware/requiresSetupComplete')
app.use(requiresSetupComplete)

// Route definitions
app.use('/api/auth/setup', require('./routes/auth/setup'))
app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/dashboard', require('./routes/dashboard.routes'))
app.use('/api/vendors', require('./routes/vendor.routes'))
app.use('/api/bills', require('./routes/bill.routes'))
app.use('/api/payments', require('./routes/payment.routes'))
app.use('/api/financiers', require('./routes/financier.routes'))
app.use('/api/loans', require('./routes/loan.routes'))
app.use('/api/cheques', require('./routes/cheque.routes'))
app.use('/api/ledger', require('./routes/ledger.routes'))
app.use('/api/reports', require('./routes/reports.routes'))
app.use('/api/settings', require('./routes/settings.routes'))
app.use('/api/notifications', require('./routes/notification.routes'))

const { sseHandler } = require('./utils/sse')
app.get('/api/events', sseHandler)
app.use('/api', require('./routes/backup.routes'))

// Serve Frontend static assets in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../../Frontend/dist')
  app.use(express.static(frontendBuildPath))
  
  // Wildcard handler for client-side routing
  app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
      return res.status(404).json({ success: false, message: 'API route not found' })
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'))
  })
}

// Global Error Handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `Server running on port ${PORT}`)
})
