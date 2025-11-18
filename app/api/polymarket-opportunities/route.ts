import { NextResponse } from 'next/server'
import { fetchPolymarketMarkets } from '@/lib/polymarket'
import { findPolymarketOpportunities } from '@/lib/polymarket-strategies'
import { initPolymarketClient } from '@/lib/polymarket-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Initialize Polymarket client if not already done
    await initPolymarketClient()

    // Fetch markets from Polymarket
    const markets = await fetchPolymarketMarkets()

    // Find opportunities using various strategies
    const opportunities = await findPolymarketOpportunities(markets)

    return NextResponse.json({
      opportunities,
      timestamp: new Date().toISOString(),
      marketCount: markets.length,
      opportunityCount: opportunities.length,
    })
  } catch (error) {
    console.error('Error fetching Polymarket opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunities', opportunities: [] },
      { status: 500 }
    )
  }
}

