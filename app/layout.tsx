import type { Metadata, Viewport } from 'next'
import './globals.css'
import { TopNav } from '@/components/TopNav'
import { BottomNav } from '@/components/BottomNav'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Notion HQ',
  description: 'Dashboard connecté à Notion — Tâches, CRM & Idées',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#070710',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <TopNav />
          <main style={{ paddingTop: '56px' }}>
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
