export interface Market {
  id: string
  question: string
  yesPrice: number
  noPrice: number
  volume?: number
  liquidity?: number
  url: string
  platform: 'polymarket' | 'kalshi'
  spread?: number
  tokenId?: string
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

export interface PolymarketOrderBookData {
  bestBid: number
  bestAsk: number
  bidSize: number
  askSize: number
  midPrice: number
  spread: number
  spreadPercent: number
}

export interface PolymarketStrategyOpportunity {
  id: string
  strategy: 'spread_trading' | 'yes_no_arbitrage' | 'market_making' | 'volatility_breakout' | 'volume_momentum' | 'mean_reversion' | 'volatility_expansion' | 'volume_spike'
  eventName: string
  marketId: string
  tokenId?: string
  url: string
  
  // Price data
  yesBid: number
  yesAsk: number
  noBid: number
  noAsk: number
  yesMidPrice: number
  noMidPrice: number
  
  // Opportunity metrics
  spread: number
  spreadPercent: number
  yesNoSum: number // Yes + No prices (should be ~1.0)
  arbitrageGap: number // How far from 1.0 the sum is
  
  // Volatility & Volume metrics
  volatility?: number // Price volatility measure
  volume24h?: number // 24h volume
  volumeRank?: number // Volume rank among all markets
  priceChange?: number // Recent price change
  momentum?: number // Price momentum indicator
  
  // Profit calculations
  estimatedProfit: number
  profitAfterFees: number
  profitPercent: number
  
  // Market quality
  liquidity: number
  volume: number
  minLiquidity: boolean // Whether it meets minimum liquidity threshold
  
  // Trading instructions
  buySide: 'yes' | 'no'
  sellSide: 'yes' | 'no'
  buyPrice: number
  sellPrice: number
  recommendedSize: number
}

