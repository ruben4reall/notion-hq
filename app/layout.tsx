export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { TopNav } from '@/components/TopNav'
import { BottomNav } from '@/components/BottomNav'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Manager Dashboard',
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light')}catch(e){}})()` }} />
      </head>
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
