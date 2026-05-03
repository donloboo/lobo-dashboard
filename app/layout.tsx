import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Don Loboo — Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="bg-black text-white min-h-screen">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
