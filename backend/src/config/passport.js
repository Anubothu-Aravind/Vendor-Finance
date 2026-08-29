const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt')
const User = require('../models/User')

const cookieExtractor = (req) => {
  let token = null
  if (req && req.cookies) {
    token = req.cookies['accessToken'] || req.cookies['jwt']
  }
  return token
}

const opts = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    cookieExtractor
  ]),
  secretOrKey: process.env.JWT_SECRET || 'vastrams_access_secret_key',
  algorithms: ['HS256'] // Explicitly restrict verified JWT header algorithm to HS256 ONLY
}

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id).select('-passwordHash')
        if (user) {
          if (user.status !== 'Active') {
            return done(null, false, { message: 'Your account is inactive. Contact Administrator.' })
          }
          return done(null, user)
        }
        return done(null, false)
      } catch (err) {
        return done(err, false)
      }
    })
  )
}
