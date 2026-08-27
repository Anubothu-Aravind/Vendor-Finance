/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Primary accent
          primary:          'var(--color-primary, #00C896)',
          'primary-hover':  'var(--color-primary-hover, #00A87E)',
          'primary-muted':  'var(--color-primary-muted, rgba(0,200,150,0.12))',

          // Backgrounds
          canvas:           'var(--color-bg-base, #F8FAFC)',
          surface:          'var(--color-bg-surface, #FFFFFF)',
          elevated:         'var(--color-bg-elevated, #F1F5F9)',
          hover:            'var(--color-bg-hover, #E8EDF5)',

          // Borders
          border:           'var(--color-border, #E2E8F0)',
          'border-strong':  'var(--color-border-strong, #CBD5E1)',

          // Text
          'ink-primary':    'var(--color-text-primary, #0F172A)',
          'ink-secondary':  'var(--color-text-secondary, #475569)',
          'ink-muted':      'var(--color-text-muted, #94A3B8)',
          'ink-inverse':    'var(--color-text-inverse, #FFFFFF)',

          // Semantic
          success:          'var(--color-success, #00C896)',
          warning:          'var(--color-warning, #F5A623)',
          danger:           'var(--color-danger, #E84545)',
          info:             'var(--color-info, #4A9EFF)',

          // Sidebar
          sidebar:          'var(--color-sidebar-bg, #090D16)',
          'sidebar-active': 'var(--color-sidebar-active, rgba(0,200,150,0.14))',
          'sidebar-text':   'var(--color-sidebar-text, #8A9BB0)',

          // Table
          'table-header':   'var(--color-table-header, #F8FAFC)',
          'table-row-alt':  'var(--color-table-row-alt, #F1F5F9)',
          'table-hover':    'var(--color-table-row-hover, #EEF2F8)',

          // Legacy aliases used in older code
          panel:            'var(--color-bg-surface, #FFFFFF)',
          'border-divider': 'var(--color-border, #E2E8F0)',
          'success-bg':     'rgba(0,200,150,0.12)',
          header:           'var(--color-bg-elevated, #F1F5F9)',
        },
      },
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
