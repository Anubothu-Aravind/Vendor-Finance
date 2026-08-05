const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false // Exclude passwordHash by default on all Mongoose database lookups
  },
  role: {
    type: String,
    enum: ['Admin', 'Viewer'],
    default: 'Viewer',
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    required: true
  },
  isDefaultCredential: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false
  return bcrypt.compare(candidatePassword, this.passwordHash)
}

module.exports = mongoose.model('User', UserSchema)
