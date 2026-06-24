import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: { template: '%s | AttendEase', default: 'AttendEase' },
  description: 'College attendance calculator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
