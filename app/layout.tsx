import type { Metadata, Viewport } from 'next'
import './globals.css'
import './theme-blue.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'MM Intelligence',
  description: 'Plataforma de inteligência e mineração de produtos físicos',
  applicationName: 'MM Shopee',
  appleWebApp: { capable: true, title: 'MM Shopee', statusBarStyle: 'black' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09111a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt"><body><ClientLayout>{children}</ClientLayout></body></html>
}
