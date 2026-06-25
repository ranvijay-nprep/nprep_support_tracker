/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          light:   '#3b82f6',
          dark:    '#1d4ed8',
          bg:      '#eff6ff',
          border:  '#bfdbfe',
        },
        surface: {
          bg:      '#f0f4f8',
          bg2:     '#e8eef5',
          card:    '#ffffff',
          border:  '#e2e8f0',
          border2: '#cbd5e1',
        },
        text: {
          primary:   '#0f172a',
          secondary: '#475569',
          muted:     '#94a3b8',
        },
        status: {
          success:    '#059669',
          successBg:  '#ecfdf5',
          warning:    '#d97706',
          warningBg:  '#fffbeb',
          danger:     '#dc2626',
          dangerBg:   '#fef2f2',
          info:       '#0284c7',
          infoBg:     '#f0f9ff',
          purple:     '#7c3aed',
          purpleBg:   '#f5f3ff',
        },
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)',
        md:   '0 4px 6px rgba(0,0,0,.07), 0 2px 4px rgba(0,0,0,.06)',
        lg:   '0 10px 15px rgba(0,0,0,.08), 0 4px 6px rgba(0,0,0,.05)',
      },
    },
  },
  plugins: [],
}
