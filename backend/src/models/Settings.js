const mongoose = require('mongoose')

const SettingsSchema = new mongoose.Schema({
  // Profile settings
  businessName: {
    type: String,
    required: true,
    trim: true,
    default: 'Vastrams'
  },
  ownerName: {
    type: String,
    required: true,
    trim: true,
    default: 'Admin User'
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    default: 'admin@vastrams.in'
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    default: '9876543210'
  },
  address: {
    type: String,
    required: true,
    trim: true,
    default: '123 Main St, Surat, Gujarat'
  },
  gstin: {
    type: String,
    required: true,
    trim: true,
    default: '24AAAAA0000A1Z0'
  },
  website: {
    type: String,
    trim: true,
    default: 'www.vastrams.in'
  },
  logo: {
    type: String,
    default: ''
  },

  // Appearance & Theme settings
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'dark'
  },
  gradientValue: {
    type: String,
    default: 'linear-gradient(135deg, #00C896, #6366f1)'
  },
  accentColor: {
    type: String,
    default: '#00C896'
  },

  // Locale & Format settings
  currency: {
    type: String,
    default: 'INR'
  },
  dateFormat: {
    type: String,
    default: 'DD-MM-YYYY'
  },
  numberFormat: {
    type: String,
    default: 'Indian'
  },

  // UI preferences
  sidebarCollapsed: {
    type: Boolean,
    default: false
  },

  // Lists settings
  banks: {
    type: [String],
    default: ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'PNB', 'Kotak Bank']
  },
  paymentModes: {
    type: [
      {
        name: { type: String, required: true },
        enabled: { type: Boolean, default: true }
      }
    ],
    default: [
      { name: 'Cash', enabled: true },
      { name: 'RTGS', enabled: true },
      { name: 'NEFT', enabled: true },
      { name: 'UPI', enabled: true },
      { name: 'Cheque', enabled: true }
    ]
  },
  usersList: {
    type: [
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, enum: ['Admin', 'Viewer'], default: 'Viewer' },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
      }
    ],
    default: [
      { name: 'Admin User', email: 'admin@vastrams.in', role: 'Admin', status: 'Active' }
    ]
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Settings', SettingsSchema)
