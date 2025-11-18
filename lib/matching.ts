import { Market, MatchedEvent } from './types'

/**
 * Hardcoded event ID pairs for matching Polymarket and Kalshi markets
 * Format: { eventName: { polymarketId: string, kalshiId: string } }
 */
const EVENT_PAIRS: Record<string, { polymarketId?: string; kalshiId?: string }> = {
  'Fed decision in December': {
    polymarketId: 'fed-decision-december-2024',
    kalshiId: 'FED-DEC-2024',
  },
  'Super Bowl Champion 2026': {
    polymarketId: 'super-bowl-champion-2026',
    kalshiId: 'SB-2026',
  },
  'Bitcoin price in 2025': {
    polymarketId: 'bitcoin-price-2025',
    kalshiId: 'BTC-2025',
  },
  'US Election 2024': {
    polymarketId: 'us-election-2024',
    kalshiId: 'US-PRES-2024',
  },
}

/**
 * Match markets from both platforms based on hardcoded pairs
 */
export function matchMarkets(
  polymarketMarkets: Market[],
  kalshiMarkets: Market[]
): MatchedEvent[] {
  const matchedEvents: MatchedEvent[] = []
  const polymarketMap = new Map(polymarketMarkets.map(m => [m.id, m]))
  const kalshiMap = new Map(kalshiMarkets.map(m => [m.id, m]))

  // Match based on hardcoded pairs
  for (const [eventName, ids] of Object.entries(EVENT_PAIRS)) {
    const polymarket = ids.polymarketId ? polymarketMap.get(ids.polymarketId) : null
    const kalshi = ids.kalshiId ? kalshiMap.get(ids.kalshiId) : null

    if (polymarket || kalshi) {
      matchedEvents.push({
        id: `${ids.polymarketId || ''}-${ids.kalshiId || ''}`,
        eventName,
        polymarket: polymarket || null,
        kalshi: kalshi || null,
      })
    }
  }

  // Also try fuzzy matching by question text (simplified)
  const unmatchedPolymarket = polymarketMarkets.filter(
    m => !Array.from(polymarketMap.values()).some(matched => 
      matchedEvents.some(e => e.polymarket?.id === matched.id)
    )
  )
  const unmatchedKalshi = kalshiMarkets.filter(
    m => !Array.from(kalshiMap.values()).some(matched => 
      matchedEvents.some(e => e.kalshi?.id === matched.id)
    )
  )

  // Simple text-based matching (normalize and compare)
  for (const pmMarket of unmatchedPolymarket) {
    const normalizedPM = pmMarket.question.toLowerCase().trim()
    
    for (const kalshiMarket of unmatchedKalshi) {
      const normalizedKalshi = kalshiMarket.question.toLowerCase().trim()
      
      // Check if questions are similar (simple approach)
      if (normalizedPM === normalizedKalshi || 
          normalizedPM.includes(normalizedKalshi.substring(0, 20)) ||
          normalizedKalshi.includes(normalizedPM.substring(0, 20))) {
        matchedEvents.push({
          id: `${pmMarket.id}-${kalshiMarket.id}`,
          eventName: pmMarket.question,
          polymarket: pmMarket,
          kalshi: kalshiMarket,
        })
        break
      }
    }
  }

  return matchedEvents
}

