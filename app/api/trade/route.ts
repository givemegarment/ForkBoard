import { NextRequest, NextResponse } from 'next/server'
import { executeArbitrage } from '@/lib/trading'
import { initPolymarketClient } from '@/lib/polymarket-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    // Initialize Polymarket client if not already done
    await initPolymarketClient()

    const body = await request.json()
    const { opportunity, bankroll, polymarketTokenId } = body

    if (!opportunity || !bankroll) {
      return NextResponse.json(
        { error: 'Missing required fields: opportunity and bankroll' },
        { status: 400 }
      )
    }

    if (!polymarketTokenId) {
      return NextResponse.json(
        { error: 'Missing polymarketTokenId. Cannot execute trade without token ID.' },
        { status: 400 }
      )
    }

    // Execute the arbitrage
    const result = await executeArbitrage(opportunity, bankroll, polymarketTokenId)

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error executing trade:', error)
    return NextResponse.json(
      {
        error: 'Failed to execute trade',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
