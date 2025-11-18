import { ArbitrageOpportunity, PolymarketStrategyOpportunity } from './types'
import { getPolymarketClient } from './polymarket-client'
import { Side, OrderType } from '@polymarket/clob-client'

export interface TradeExecution {
  success: boolean
  orderId?: string
  error?: string
  platform: 'polymarket' | 'kalshi'
  side: 'buy' | 'sell'
  price: number
  size: number
}

export interface ArbitrageExecutionResult {
  success: boolean
  polymarketTrade?: TradeExecution
  kalshiTrade?: TradeExecution
  error?: string
  estimatedProfit?: number
}

/**
 * Execute a trade on Polymarket
 */
export async function executePolymarketTrade(
  tokenId: string,
  side: 'BUY' | 'SELL',
  price: number,
  size: number,
  tickSize: string = '0.01',
  negRisk: boolean = false
): Promise<TradeExecution> {
  const client = getPolymarketClient()

  if (!client) {
    return {
      success: false,
      error: 'Polymarket client not initialized. Please set POLYMARKET_PRIVATE_KEY in .env.local',
      platform: 'polymarket',
      side: side.toLowerCase() as 'buy' | 'sell',
      price,
      size,
    }
  }

  try {
    // Create and post order using CLOB client
    const response = await client.createAndPostOrder(
      {
        tokenID: tokenId,
        price: price,
        size: size,
        side: side as Side,
      },
      {
        tickSize: tickSize as any, // TickSize type from SDK
        negRisk: negRisk,
      },
      OrderType.GTC // Good Till Cancel
    )

    return {
      success: true,
      orderId: response.orderID,
      platform: 'polymarket',
      side: side.toLowerCase() as 'buy' | 'sell',
      price,
      size,
    }
  } catch (error) {
    console.error('Error executing Polymarket trade:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      platform: 'polymarket',
      side: side.toLowerCase() as 'buy' | 'sell',
      price,
      size,
    }
  }
}

/**
 * Execute an arbitrage opportunity automatically
 * This will place trades on both platforms to lock in profit
 */
export async function executeArbitrage(
  opportunity: ArbitrageOpportunity,
  bankroll: number,
  polymarketTokenId?: string
): Promise<ArbitrageExecutionResult> {
  if (!polymarketTokenId) {
    return {
      success: false,
      error: 'Missing Polymarket token ID. Cannot execute trade.',
    }
  }

  const { polymarketYesPrice, kalshiYesPrice } = opportunity

  // Determine which side to trade
  const buyPolymarket = polymarketYesPrice < kalshiYesPrice

  try {
    if (buyPolymarket) {
      // Buy Yes on Polymarket, Sell Yes on Kalshi (or buy No)
      const pmSize = bankroll / polymarketYesPrice
      const kalshiSize = bankroll / (1 - kalshiYesPrice)

      const pmTrade = await executePolymarketTrade(
        polymarketTokenId,
        'BUY',
        polymarketYesPrice,
        pmSize
      )

      // TODO: Implement Kalshi trading when API is available
      const kalshiTrade: TradeExecution = {
        success: false,
        error: 'Kalshi trading not yet implemented',
        platform: 'kalshi',
        side: 'sell',
        price: kalshiYesPrice,
        size: kalshiSize,
      }

      return {
        success: pmTrade.success && kalshiTrade.success,
        polymarketTrade: pmTrade,
        kalshiTrade: kalshiTrade,
        estimatedProfit: (opportunity.profitAfterFees / 100) * bankroll,
      }
    } else {
      // Buy Yes on Kalshi, Sell Yes on Polymarket (or buy No)
      const kalshiSize = bankroll / kalshiYesPrice
      const pmSize = bankroll / (1 - polymarketYesPrice)

      const pmTrade = await executePolymarketTrade(
        polymarketTokenId,
        'SELL',
        polymarketYesPrice,
        pmSize
      )

      // TODO: Implement Kalshi trading when API is available
      const kalshiTrade: TradeExecution = {
        success: false,
        error: 'Kalshi trading not yet implemented',
        platform: 'kalshi',
        side: 'buy',
        price: kalshiYesPrice,
        size: kalshiSize,
      }

      return {
        success: pmTrade.success && kalshiTrade.success,
        polymarketTrade: pmTrade,
        kalshiTrade: kalshiTrade,
        estimatedProfit: (opportunity.profitAfterFees / 100) * bankroll,
      }
    }
  } catch (error) {
    console.error('Error executing arbitrage:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Cancel an order on Polymarket
 */
export async function cancelPolymarketOrder(orderId: string): Promise<boolean> {
  const client = getPolymarketClient()

  if (!client) {
    console.error('Polymarket client not initialized')
    return false
  }

  try {
    await client.cancelOrder({ orderID: orderId })
    return true
  } catch (error) {
    console.error('Error canceling order:', error)
    return false
  }
}

/**
 * Get open orders on Polymarket
 */
export async function getPolymarketOpenOrders() {
  const client = getPolymarketClient()

  if (!client) {
    return []
  }

  try {
    const orders = await client.getOpenOrders({})
    return orders
  } catch (error) {
    console.error('Error fetching open orders:', error)
    return []
  }
}

/**
 * Execute a Polymarket strategy opportunity
 */
export async function executePolymarketStrategy(
  opportunity: PolymarketStrategyOpportunity,
  size?: number
): Promise<ArbitrageExecutionResult> {
  if (!opportunity.tokenId) {
    return {
      success: false,
      error: 'Missing token ID. Cannot execute trade.',
    }
  }

  const tradeSize = size || opportunity.recommendedSize

  try {
    if (opportunity.strategy === 'spread_trading') {
      // For spread trading: buy at bid, sell at ask
      // We'll place both orders - buy order first
      const buyTrade = await executePolymarketTrade(
        opportunity.tokenId,
        opportunity.buySide === 'yes' ? 'BUY' : 'SELL',
        opportunity.buyPrice,
        tradeSize
      )

      // For spread trading, we typically want to place a limit order to sell
      // Note: In practice, you might want to wait for the buy to fill first
      const sellTrade = await executePolymarketTrade(
        opportunity.tokenId,
        opportunity.sellSide === 'yes' ? 'SELL' : 'BUY',
        opportunity.sellPrice,
        tradeSize
      )

      return {
        success: buyTrade.success && sellTrade.success,
        polymarketTrade: buyTrade,
        estimatedProfit: opportunity.profitAfterFees * tradeSize,
      }
    } else if (opportunity.strategy === 'yes_no_arbitrage') {
      // For Yes/No arbitrage: buy both Yes and No (or sell both)
      // This requires trading both tokens, which is more complex
      // For now, we'll execute the primary side
      const trade = await executePolymarketTrade(
        opportunity.tokenId,
        opportunity.buySide === 'yes' ? 'BUY' : 'SELL',
        opportunity.buyPrice,
        tradeSize
      )

      // Note: Full Yes/No arbitrage requires trading both tokens
      // This is a simplified version - you may need to find the No token ID
      return {
        success: trade.success,
        polymarketTrade: trade,
        estimatedProfit: opportunity.profitAfterFees * tradeSize,
        error: opportunity.yesNoSum < 1.0 
          ? 'Full arbitrage requires trading both Yes and No tokens. Only Yes side executed.'
          : undefined,
      }
    } else {
      return {
        success: false,
        error: `Strategy ${opportunity.strategy} not yet fully implemented`,
      }
    }
  } catch (error) {
    console.error('Error executing Polymarket strategy:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
