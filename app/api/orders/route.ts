import { NextRequest, NextResponse } from 'next/server'
import { getPolymarketOpenOrders, cancelPolymarketOrder } from '@/lib/trading'
import { initPolymarketClient } from '@/lib/polymarket-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET endpoint to fetch open orders
 */
export async function GET() {
  try {
    // Initialize Polymarket client if not already done
    await initPolymarketClient()

    const orders = await getPolymarketOpenOrders()

    return NextResponse.json({
      orders,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE endpoint to cancel an order
 */
export async function DELETE(request: NextRequest) {
  try {
    // Initialize Polymarket client if not already done
    await initPolymarketClient()

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId parameter' },
        { status: 400 }
      )
    }

    const success = await cancelPolymarketOrder(orderId)

    return NextResponse.json({
      success,
      orderId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error canceling order:', error)
    return NextResponse.json(
      {
        error: 'Failed to cancel order',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
