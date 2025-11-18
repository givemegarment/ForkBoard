import { Market } from './types'

const POLYMARKET_API_BASE = 'https://clob.polymarket.com'

export interface PolymarketEvent {
  id: string
  slug: string
  title: string
  description: string
  resolutionSource?: string
  endDate?: string
  image?: string
  icon?: string
  active?: boolean
  archived?: boolean
  new?: boolean
  featured?: boolean
  liquidity?: number
  volume?: number
  markets?: PolymarketMarket[]
}

export interface PolymarketMarket {
  id: string
  question: string
  slug: string
  outcomePrices?: number[]
  liquidity?: number
  volume?: number
  active?: boolean
  endDate?: string
  image?: string
  icon?: string
}

export interface PolymarketPriceData {
  market: string
  outcome: string
  price: number
  side: 'yes' | 'no'
}

/**
 * Fetch all active events from Polymarket
 */
export async function fetchPolymarketEvents(): Promise<PolymarketEvent[]> {
  try {
    const response = await fetch('https://clob.polymarket.com/events', {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`)
    }

    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('Error fetching Polymarket events:', error)
    return []
  }
}

/**
 * Fetch price data for a specific market
 */
export async function fetchPolymarketPrices(marketId: string): Promise<{ yesPrice: number; noPrice: number } | null> {
  try {
    // Try to get orderbook data
    const response = await fetch(`https://clob.polymarket.com/book?market=${marketId}`, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      // Fallback: try to get from event data
      const eventResponse = await fetch(`https://clob.polymarket.com/events/${marketId}`, {
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (eventResponse.ok) {
        const eventData = await eventResponse.json()
        if (eventData.markets && eventData.markets.length > 0) {
          const market = eventData.markets[0]
          if (market.outcomePrices && market.outcomePrices.length >= 2) {
            return {
              yesPrice: market.outcomePrices[0] || 0.5,
              noPrice: market.outcomePrices[1] || 0.5,
            }
          }
        }
      }
      return null
    }

    const bookData = await response.json()
    
    // Extract best bid/ask prices
    // Polymarket orderbook structure: { bids: [[price, size]], asks: [[price, size]] }
    if (bookData.bids && bookData.bids.length > 0 && bookData.asks && bookData.asks.length > 0) {
      const bestBid = bookData.bids[0][0]
      const bestAsk = bookData.asks[0][0]
      const midPrice = (bestBid + bestAsk) / 2
      
      // For Yes/No markets, we need to check which outcome is which
      // This is a simplified approach - in production you'd need to check the outcome tokens
      return {
        yesPrice: midPrice,
        noPrice: 1 - midPrice,
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching Polymarket prices for ${marketId}:`, error)
    return null
  }
}

/**
 * Convert Polymarket event to Market format
 */
export async function convertPolymarketToMarket(event: PolymarketEvent): Promise<Market | null> {
  if (!event.markets || event.markets.length === 0) {
    return null
  }

  const market = event.markets[0]
  const prices = await fetchPolymarketPrices(market.id)
  
  if (!prices) {
    return null
  }

  return {
    id: market.id,
    question: market.question || event.title,
    yesPrice: prices.yesPrice,
    noPrice: prices.noPrice,
    volume: market.volume || event.volume,
    liquidity: market.liquidity || event.liquidity,
    url: `https://polymarket.com/event/${event.slug || market.slug}`,
    platform: 'polymarket',
  }
}

/**
 * Fetch all active Yes/No markets from Polymarket
 */
export async function fetchPolymarketMarkets(): Promise<Market[]> {
  try {
    const events = await fetchPolymarketEvents()
    const markets: Market[] = []

    // Filter for active events and convert to markets
    for (const event of events) {
      if (event.active && event.markets && event.markets.length > 0) {
        const market = await convertPolymarketToMarket(event)
        if (market) {
          markets.push(market)
        }
      }
    }

    return markets
  } catch (error) {
    console.error('Error fetching Polymarket markets:', error)
    return []
  }
}

