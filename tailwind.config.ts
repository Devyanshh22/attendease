import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAFA',
        surface: '#FFFFFF',
        border: '#EBEBEB',
        accent: '#5B5BD6',
        success: '#1A9E5F',
        warning: '#D97706',
        danger: '#DC2626',
        'text-primary': '#111111',
        'text-secondary': '#6B6B6B',
        'text-muted': '#ABABAB',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        btn: '8px',
        badge: '6px',
      },
      spacing: {
        '18': '4.5rem',
        '60': '15rem',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
    },
  },
  plugins: [],
}
export default config
