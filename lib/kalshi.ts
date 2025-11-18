import { Market } from './types'

const KALSHI_API_BASE = 'https://trading-api.kalshi.com/trade-api/v2'

export interface KalshiEvent {
  event_ticker: string
  title: string
  subtitle?: string
  status: string
  category: string
  series_ticker?: string
  strike_date?: string
  expiration_date?: string
  yes_bid?: number
  yes_ask?: number
  no_bid?: number
  no_ask?: number
  last_price?: number
  previous_price?: number
  volume?: number
  open_interest?: number
}

/**
 * Fetch all active events from Kalshi
 */
export async function fetchKalshiEvents(): Promise<KalshiEvent[]> {
  try {
    // Kalshi public API endpoint for events
    const response = await fetch('https://trading-api.kalshi.com/trade-api/v2/events', {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`)
    }

    const data = await response.json()
    return data.events || []
  } catch (error) {
    console.error('Error fetching Kalshi events:', error)
    // Fallback: return empty array
    return []
  }
}

/**
 * Convert Kalshi event to Market format
 */
export function convertKalshiToMarket(event: KalshiEvent): Market | null {
  if (event.status !== 'open') {
    return null
  }

  // Calculate mid prices from bid/ask
  const yesPrice = event.yes_bid && event.yes_ask 
    ? (event.yes_bid + event.yes_ask) / 2 
    : event.last_price || 0.5
  
  const noPrice = event.no_bid && event.no_ask
    ? (event.no_bid + event.no_ask) / 2
    : 1 - yesPrice

  if (yesPrice <= 0 || noPrice <= 0) {
    return null
  }

  return {
    id: event.event_ticker,
    question: event.title,
    yesPrice,
    noPrice,
    volume: event.volume,
    liquidity: event.open_interest,
    url: `https://kalshi.com/markets/${event.event_ticker}`,
    platform: 'kalshi',
  }
}

/**
 * Fetch all active Yes/No markets from Kalshi
 */
export async function fetchKalshiMarkets(): Promise<Market[]> {
  try {
    const events = await fetchKalshiEvents()
    const markets: Market[] = []

    for (const event of events) {
      const market = convertKalshiToMarket(event)
      if (market) {
        markets.push(market)
      }
    }

    return markets
  } catch (error) {
    console.error('Error fetching Kalshi markets:', error)
    return []
  }
}

