import { Market } from './types'
import { ClobClient, OrderBookSummary } from '@polymarket/clob-client'
import { getPolymarketClient } from './polymarket-client'

const POLYMARKET_API_BASE = 'https://clob.polymarket.com'

/**
 * Get Polymarket API headers with authentication if API key is available
 */
function getPolymarketHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/json',
  }

  // Add API key if available (for Builder Codes API key)
  const apiKey = process.env.POLYMARKET_API_KEY
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
    // Some Polymarket APIs use X-API-Key header
    headers['X-API-Key'] = apiKey
  }

  return headers
}

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
  tokenId?: string
}

export interface PolymarketPriceData {
  market: string
  outcome: string
  price: number
  side: 'yes' | 'no'
}

/**
 * Fetch all active events from Polymarket
 * Note: Uses /markets endpoint as /events is not available
 */
export async function fetchPolymarketEvents(): Promise<PolymarketEvent[]> {
  try {
    // Use /markets endpoint (events endpoint returns 404)
    const response = await fetch('https://clob.polymarket.com/markets', {
      headers: getPolymarketHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`)
    }

    const data = await response.json()
    
    // /markets returns an array of markets directly, not events
    // Convert markets to events format for compatibility
    if (Array.isArray(data)) {
      // Group markets by condition_id to create events
      const eventsMap = new Map<string, PolymarketEvent>()
      
      for (const market of data) {
        if (!market.active || market.closed || market.archived) {
          continue
        }
        
        const conditionId = market.condition_id || market.id
        if (!eventsMap.has(conditionId)) {
          eventsMap.set(conditionId, {
            id: conditionId,
            slug: market.market_slug || conditionId,
            title: market.question || 'Untitled Market',
            description: market.description || '',
            endDate: market.end_date_iso,
            image: market.image,
            icon: market.icon,
            active: market.active,
            archived: market.archived,
            liquidity: 0,
            volume: 0,
            markets: [],
          })
        }
        
        const event = eventsMap.get(conditionId)!
        const marketData: PolymarketMarket = {
          id: market.question_id || market.id,
          question: market.question,
          slug: market.market_slug,
          outcomePrices: market.tokens?.map((t: any) => t.price) || [],
          liquidity: 0,
          volume: 0,
          active: market.active,
          endDate: market.end_date_iso,
          image: market.image,
          icon: market.icon,
          tokenId: market.tokens?.[0]?.token_id, // Use first token's ID for Yes
        }
        
        if (!event.markets) {
          event.markets = []
        }
        event.markets.push(marketData)
        
        // Aggregate liquidity and volume
        event.liquidity = (event.liquidity || 0) + (market.liquidity || 0)
        event.volume = (event.volume || 0) + (market.volume || 0)
      }
      
      return Array.from(eventsMap.values())
    }
    
    return []
  } catch (error) {
    console.error('Error fetching Polymarket events:', error)
    return []
  }
}

/**
 * Fetch orderbook data using CLOB client (if authenticated) or fallback to public API
 */
export async function fetchPolymarketOrderBook(tokenId: string): Promise<OrderBookSummary | null> {
  try {
    const client = getPolymarketClient()

    if (client) {
      // Use authenticated client for better data
      const orderBook = await client.getOrderBook(tokenId)
      return orderBook
    }

    // Fallback to public API (returns compatible format)
    const response = await fetch(`${POLYMARKET_API_BASE}/book?token_id=${tokenId}`, {
      headers: getPolymarketHeaders(),
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching orderbook for ${tokenId}:`, error)
    return null
  }
}

/**
 * Fetch price data for a specific market with improved orderbook support
 */
export async function fetchPolymarketPrices(marketId: string, tokenId?: string): Promise<{ yesPrice: number; noPrice: number; spread?: number } | null> {
  try {
    // If we have a token ID, try to get orderbook data
    if (tokenId) {
      const orderBook = await fetchPolymarketOrderBook(tokenId)

      if (orderBook && orderBook.bids && orderBook.bids.length > 0 && orderBook.asks && orderBook.asks.length > 0) {
        // Handle both OrderSummary[] format and [string, string][] format
        const bestBid = typeof orderBook.bids[0] === 'object' && 'price' in orderBook.bids[0]
          ? parseFloat(orderBook.bids[0].price)
          : parseFloat(orderBook.bids[0][0])
        const bestAsk = typeof orderBook.asks[0] === 'object' && 'price' in orderBook.asks[0]
          ? parseFloat(orderBook.asks[0].price)
          : parseFloat(orderBook.asks[0][0])
        const midPrice = (bestBid + bestAsk) / 2
        const spread = bestAsk - bestBid

        return {
          yesPrice: midPrice,
          noPrice: 1 - midPrice,
          spread: spread,
        }
      }
    }

    // Fallback: try to get from market data
    const response = await fetch(`${POLYMARKET_API_BASE}/book?market=${marketId}`, {
      headers: getPolymarketHeaders(),
    })

    if (!response.ok) {
      // Second fallback: try to get from event data
      const eventResponse = await fetch(`${POLYMARKET_API_BASE}/events/${marketId}`, {
        headers: getPolymarketHeaders(),
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
    if (bookData.bids && bookData.bids.length > 0 && bookData.asks && bookData.asks.length > 0) {
      const bestBid = parseFloat(bookData.bids[0][0])
      const bestAsk = parseFloat(bookData.asks[0][0])
      const midPrice = (bestBid + bestAsk) / 2
      const spread = bestAsk - bestBid

      return {
        yesPrice: midPrice,
        noPrice: 1 - midPrice,
        spread: spread,
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching Polymarket prices for ${marketId}:`, error)
    return null
  }
}

/**
 * Convert Polymarket event to Market format with enhanced data
 */
export async function convertPolymarketToMarket(event: PolymarketEvent): Promise<Market | null> {
  if (!event.markets || event.markets.length === 0) {
    return null
  }

  const market = event.markets[0]
  const prices = await fetchPolymarketPrices(market.id, market.tokenId)

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
    spread: prices.spread,
    tokenId: market.tokenId,
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

