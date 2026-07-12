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
          canvas:           'var(--color-bg-base, #0B0F1A)',
          surface:          'var(--color-bg-surface, #111827)',
          elevated:         'var(--color-bg-elevated, #1A2235)',
          hover:            'var(--color-bg-hover, #1F2D42)',

          // Borders
          border:           'var(--color-border, #1E2D40)',
          'border-strong':  'var(--color-border-strong, #2A3F5A)',

          // Text
          'ink-primary':    'var(--color-text-primary, #F0F4F8)',
          'ink-secondary':  'var(--color-text-secondary, #8A9BB0)',
          'ink-muted':      'var(--color-text-muted, #4A5E72)',
          'ink-inverse':    'var(--color-text-inverse, #0B0F1A)',

          // Semantic
          success:          'var(--color-success, #00C896)',
          warning:          'var(--color-warning, #F5A623)',
          danger:           'var(--color-danger, #E84545)',
          info:             'var(--color-info, #4A9EFF)',

          // Sidebar
          sidebar:          'var(--color-sidebar-bg, #0D1320)',
          'sidebar-active': 'var(--color-sidebar-active, rgba(0,200,150,0.08))',
          'sidebar-text':   'var(--color-sidebar-text, #8A9BB0)',

          // Table
          'table-header':   'var(--color-table-header, #111827)',
          'table-row-alt':  'var(--color-table-row-alt, #0F1824)',
          'table-hover':    'var(--color-table-row-hover, #1A2235)',

          // Legacy aliases used in older code
          panel:            'var(--color-bg-surface, #111827)',
          'border-divider': 'var(--color-border, #1E2D40)',
          'success-bg':     'rgba(0,200,150,0.08)',
          header:           'var(--color-bg-elevated, #1A2235)',
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
