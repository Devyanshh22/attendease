import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { SplashScreen } from '@/components/SplashScreen'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: { template: '%s | AttendEase', default: 'AttendEase' },
  description: 'College attendance calculator',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AttendEase',
  },
  themeColor: '#3B6FE8',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>
        {/* Inline splash — renders instantly before any JS, removed by SplashScreen after hydration */}
        <div
          id="app-splash"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#3B6FE8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          {/* Icon — inline SVG so it renders with zero network requests */}
          <svg width="88" height="88" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <rect width="44" height="44" rx="11" fill="white" fillOpacity="0.15"/>
            <circle cx="22" cy="11" r="5.5" fill="none" stroke="white" strokeWidth="2.6"/>
            <path d="M13 27.5 L19.5 34.5 L32 20.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'white', fontSize: '22px', fontWeight: '600', letterSpacing: '-0.3px', margin: 0 }}>
              AttendEase
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '4px', margin: '4px 0 0 0' }}>
              College attendance, simplified.
            </p>
          </div>

          {/* Loading bar */}
          <div style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120px',
            height: '3px',
            borderRadius: '99px',
            background: 'rgba(255,255,255,0.2)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '99px',
              background: 'white',
              animation: 'splash-bar 1.2s ease-in-out infinite',
            }} />
          </div>
        </div>

        <style>{`
          @keyframes splash-bar {
            0%   { transform: translateX(-100%) scaleX(0.3); }
            50%  { transform: translateX(30%)   scaleX(0.7); }
            100% { transform: translateX(200%)  scaleX(0.3); }
          }
        `}</style>

        <SplashScreen />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
