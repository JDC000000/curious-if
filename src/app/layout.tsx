import type { Metadata } from 'next'
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/react'
import SiteFooter from '@/components/SiteFooter'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
})

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken-grotesk',
  display: 'swap',
  weight: ['400', '500', '600'],
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Curious If',
  description: 'One question. Every month. Answered by people like you.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://curiousif.blog'),
  openGraph: {
    siteName: 'Curious If',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? 'curiousif.blog'

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hankenGrotesk.variable} ${ibmPlexMono.variable} h-full`}
    >
      <head>
        <Script
          defer
          src="https://plausible.io/js/pa-L5yF_X8H1fqf_21oztCB-.js"
          data-domain={plausibleDomain}
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8F3E9] text-[#1A1A1A]">
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  )
}
