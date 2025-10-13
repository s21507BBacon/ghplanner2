import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

// Force dynamic rendering to prevent build-time database access
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'GH Planner',
  description: 'A comprehensive GitHub PR inspector and project planner',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/custom_static/css/custom-styles.css" />
      </head>
      <body className={inter.className}>
        <Providers>
          <Navigation />
          <main>
            {children}
          </main>
        </Providers>
        <script src="/custom_static/js/custom-scripts.js"></script>
      </body>
    </html>
  )
}
