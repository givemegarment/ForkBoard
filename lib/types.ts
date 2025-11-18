export interface Market {
  id: string
  question: string
  yesPrice: number
  noPrice: number
  volume?: number
  liquidity?: number
  url: string
  platform: 'polymarket' | 'kalshi'
}

export interface MatchedEvent {
  id: string
  eventName: string
  polymarket: Market | null
  kalshi: Market | null
}

export interface ArbitrageOpportunity {
  eventName: string
  polymarketYesPrice: number
  kalshiYesPrice: number
  spread: number
  profitAfterFees: number
  polymarketUrl: string
  kalshiUrl: string
  polymarketId: string
  kalshiId: string
}

