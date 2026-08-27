import type { Metadata } from 'next'
import './globals.css'
import './theme-blue.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'MM Intelligence',
  description: 'Plataforma de inteligência e mineração de produtos físicos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt"><body><ClientLayout>{children}</ClientLayout></body></html>
}
