import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forkboard - Arbitrage Scanner',
  description: 'Scan binary markets from Polymarket and Kalshi for arbitrage opportunities',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}

