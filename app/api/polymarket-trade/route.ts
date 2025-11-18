import { NextRequest, NextResponse } from 'next/server'
import { executePolymarketStrategy } from '@/lib/trading'
import { initPolymarketClient } from '@/lib/polymarket-client'
import { PolymarketStrategyOpportunity } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    // Initialize Polymarket client if not already done
    await initPolymarketClient()

    const body = await request.json()
    const { opportunity, size } = body

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Missing required field: opportunity' },
        { status: 400 }
      )
    }

    // Validate opportunity structure
    const opp = opportunity as PolymarketStrategyOpportunity
    if (!opp.tokenId) {
      return NextResponse.json(
        { error: 'Opportunity missing tokenId. Cannot execute trade.' },
        { status: 400 }
      )
    }

    // Execute the strategy
    const result = await executePolymarketStrategy(opp, size)

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error executing Polymarket strategy trade:', error)
    return NextResponse.json(
      {
        error: 'Failed to execute trade',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

