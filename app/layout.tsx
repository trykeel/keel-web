import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Keel',
  description:
    'Keel finds flaky tests, explains why they fail using AI, and opens the fix PR automatically.',
  openGraph: {
    title: 'Keel',
    description: 'Find, diagnose, and fix flaky tests automatically.',
    url: 'https://trykeel.vercel.app',
    siteName: 'Keel',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
      >
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
