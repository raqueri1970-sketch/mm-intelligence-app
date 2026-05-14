import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'MM Intelligence',
  description: 'Plataforma de mineracao de produtos para dropshipping',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}