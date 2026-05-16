export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { TopNav } from '@/components/TopNav'
import { BottomNav } from '@/components/BottomNav'
import { Chat } from '@/components/Chat'
import { GlobalTimerBar } from '@/components/GlobalTimerBar'
import { OnboardingWatcher } from '@/components/OnboardingWatcher'
import { StreakWatcher } from '@/components/StreakWatcher'
import { Providers } from '@/components/Providers'
import { PageTransition } from '@/components/PageTransition'
import PageTracker from '@/components/PageTracker'

export const metadata: Metadata = {
  title: 'Manager Dashboard',
  description: 'Dashboard — Tâches, CRM & Idées',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
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
          <GlobalTimerBar />
          <main>
            <PageTransition>{children}</PageTransition>
          </main>
          <BottomNav />
          <Chat />
          <OnboardingWatcher />
          <StreakWatcher />
          <PageTracker />
        </Providers>
      </body>
    </html>
  )
}
