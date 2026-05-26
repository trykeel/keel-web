import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Keel — Stop losing $200k/year to flaky tests',
  description: 'Keel finds flaky tests, explains why they fail using AI, and opens the fix PR automatically.',
  openGraph: {
    title: 'Keel — AI-powered flaky test detection',
    description: 'Find, diagnose, and fix flaky tests automatically.',
    url: 'https://trykeel.vercel.app',
    siteName: 'Keel',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
