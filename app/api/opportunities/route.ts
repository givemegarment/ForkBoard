import { NextResponse } from 'next/server'
import { fetchPolymarketMarkets } from '@/lib/polymarket'
import { fetchKalshiMarkets } from '@/lib/kalshi'
import { matchMarkets } from '@/lib/matching'
import { calculateArbitrage } from '@/lib/arbitrage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Fetch markets from both platforms in parallel
    const [polymarketMarkets, kalshiMarkets] = await Promise.all([
      fetchPolymarketMarkets(),
      fetchKalshiMarkets(),
    ])

    // Match markets
    const matchedEvents = matchMarkets(polymarketMarkets, kalshiMarkets)

    // Calculate arbitrage opportunities
    const opportunities = matchedEvents
      .map(calculateArbitrage)
      .filter((opp): opp is NonNullable<typeof opp> => opp !== null)
      .sort((a, b) => b.profitAfterFees - a.profitAfterFees) // Sort by profit descending

    return NextResponse.json({
      opportunities,
      timestamp: new Date().toISOString(),
      polymarketCount: polymarketMarkets.length,
      kalshiCount: kalshiMarkets.length,
      matchedCount: matchedEvents.length,
    })
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunities', opportunities: [] },
      { status: 500 }
    )
  }
}

