import { Market, PolymarketStrategyOpportunity, PolymarketOrderBookData } from './types'
import { fetchPolymarketOrderBook } from './polymarket'

// Fee constants
const POLYMARKET_FEE = 0.02 // 2% on winnings
const MIN_LIQUIDITY = 1000 // Minimum liquidity in USD
const MIN_SPREAD_PERCENT = 0.5 // Minimum spread to consider (0.5%)
const MIN_PROFIT_PERCENT = 0.3 // Minimum profit after fees (0.3%)

// Strategy thresholds
const MIN_VOLUME = 5000 // Minimum volume in USD for volume strategies
const MIN_VOLATILITY = 0.05 // Minimum volatility (5%) for volatility strategies
const HIGH_VOLUME_THRESHOLD = 50000 // High volume threshold
const VOLATILITY_BREAKOUT_THRESHOLD = 0.10 // 10% price movement for breakout

/**
 * Extract orderbook data from Polymarket orderbook response
 */
function extractOrderBookData(orderBook: any, side: 'yes' | 'no'): PolymarketOrderBookData | null {
  if (!orderBook || !orderBook.bids || !orderBook.asks) {
    return null
  }

  // Handle different orderbook formats
  let bestBid: number
  let bestAsk: number
  let bidSize: number
  let askSize: number

  if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
    return null
  }

  // Handle [price, size] tuple format
  if (Array.isArray(orderBook.bids[0]) && orderBook.bids[0].length === 2) {
    bestBid = parseFloat(orderBook.bids[0][0])
    bidSize = parseFloat(orderBook.bids[0][1])
    bestAsk = parseFloat(orderBook.asks[0][0])
    askSize = parseFloat(orderBook.asks[0][1])
  }
  // Handle object format with price/size properties
  else if (typeof orderBook.bids[0] === 'object' && 'price' in orderBook.bids[0]) {
    bestBid = parseFloat(orderBook.bids[0].price)
    bidSize = parseFloat(orderBook.bids[0].size || orderBook.bids[0].quantity || '0')
    bestAsk = parseFloat(orderBook.asks[0].price)
    askSize = parseFloat(orderBook.asks[0].size || orderBook.asks[0].quantity || '0')
  } else {
    return null
  }

  const midPrice = (bestBid + bestAsk) / 2
  const spread = bestAsk - bestBid
  const spreadPercent = (spread / midPrice) * 100

  return {
    bestBid,
    bestAsk,
    bidSize,
    askSize,
    midPrice,
    spread,
    spreadPercent,
  }
}

/**
 * Strategy 1: Spread Trading / Market Making
 * Buy at bid, sell at ask - profit from the spread
 */
function calculateSpreadTradingOpportunity(
  market: Market,
  yesOrderBook: PolymarketOrderBookData | null,
  noOrderBook: PolymarketOrderBookData | null
): PolymarketStrategyOpportunity | null {
  if (!yesOrderBook || !noOrderBook) {
    return null
  }

  // Check minimum liquidity
  const totalLiquidity = (market.liquidity || 0)
  if (totalLiquidity < MIN_LIQUIDITY) {
    return null
  }

  // Calculate spread for Yes side
  const yesSpreadPercent = yesOrderBook.spreadPercent
  const noSpreadPercent = noOrderBook.spreadPercent

  // Use the side with better spread
  const useYes = yesSpreadPercent >= noSpreadPercent
  const orderBook = useYes ? yesOrderBook : noOrderBook
  const spreadPercent = useYes ? yesSpreadPercent : noSpreadPercent

  // Only consider if spread is significant enough
  if (spreadPercent < MIN_SPREAD_PERCENT) {
    return null
  }

  // Calculate profit: buy at bid, sell at ask
  // After fees: (ask - bid) - (ask * fee) - (bid * fee)
  const grossProfit = orderBook.spread
  const feeOnBuy = orderBook.bestBid * POLYMARKET_FEE
  const feeOnSell = orderBook.bestAsk * POLYMARKET_FEE
  const netProfit = grossProfit - feeOnBuy - feeOnSell
  const profitPercent = (netProfit / orderBook.bestBid) * 100

  // Only return if profit is positive after fees
  if (profitPercent < MIN_PROFIT_PERCENT) {
    return null
  }

  // Calculate recommended size (use smaller of bid/ask size to avoid slippage)
  const recommendedSize = Math.min(orderBook.bidSize, orderBook.askSize) * 0.1 // Use 10% of available size

  return {
    id: `spread-${market.id}`,
    strategy: 'spread_trading',
    eventName: market.question,
    marketId: market.id,
    tokenId: market.tokenId,
    url: market.url,
    yesBid: yesOrderBook.bestBid,
    yesAsk: yesOrderBook.bestAsk,
    noBid: noOrderBook.bestBid,
    noAsk: noOrderBook.bestAsk,
    yesMidPrice: yesOrderBook.midPrice,
    noMidPrice: noOrderBook.midPrice,
    spread: orderBook.spread,
    spreadPercent: spreadPercent,
    yesNoSum: yesOrderBook.midPrice + noOrderBook.midPrice,
    arbitrageGap: Math.abs(1.0 - (yesOrderBook.midPrice + noOrderBook.midPrice)),
    estimatedProfit: grossProfit,
    profitAfterFees: netProfit,
    profitPercent: profitPercent,
    liquidity: totalLiquidity,
    volume: market.volume || 0,
    minLiquidity: totalLiquidity >= MIN_LIQUIDITY,
    buySide: useYes ? 'yes' : 'no',
    sellSide: useYes ? 'yes' : 'no',
    buyPrice: orderBook.bestBid,
    sellPrice: orderBook.bestAsk,
    recommendedSize: recommendedSize,
  }
}

/**
 * Strategy 2: Yes/No Pair Arbitrage
 * If Yes + No prices don't sum to 1.0, there's an arbitrage opportunity
 */
function calculateYesNoArbitrageOpportunity(
  market: Market,
  yesOrderBook: PolymarketOrderBookData | null,
  noOrderBook: PolymarketOrderBookData | null
): PolymarketStrategyOpportunity | null {
  if (!yesOrderBook || !noOrderBook) {
    return null
  }

  // Check minimum liquidity
  const totalLiquidity = (market.liquidity || 0)
  if (totalLiquidity < MIN_LIQUIDITY) {
    return null
  }

  // Calculate if Yes + No sum to 1.0
  // If sum < 1.0: Buy both Yes and No, guaranteed profit
  // If sum > 1.0: Sell both Yes and No, guaranteed profit
  const yesMid = yesOrderBook.midPrice
  const noMid = noOrderBook.midPrice
  const sum = yesMid + noMid
  const gap = Math.abs(1.0 - sum)

  // Only consider if gap is significant (at least 0.5%)
  if (gap < 0.005) {
    return null
  }

  let buySide: 'yes' | 'no'
  let sellSide: 'yes' | 'no'
  let buyPrice: number
  let sellPrice: number
  let profitPercent: number

  if (sum < 1.0) {
    // Buy both Yes and No at ask prices, guaranteed to win
    // Cost: yesAsk + noAsk
    // Payout: 1.0 (one will win)
    // Profit: 1.0 - (yesAsk + noAsk) - fees
    const cost = yesOrderBook.bestAsk + noOrderBook.bestAsk
    const grossProfit = 1.0 - cost
    const fee = 1.0 * POLYMARKET_FEE // Fee on winnings
    const netProfit = grossProfit - fee
    profitPercent = (netProfit / cost) * 100

    buySide = 'yes'
    sellSide = 'no' // We're buying both, but this indicates the strategy
    buyPrice = yesOrderBook.bestAsk
    sellPrice = noOrderBook.bestAsk
  } else {
    // Sell both Yes and No at bid prices
    // Receive: yesBid + noBid
    // Payout: 1.0 (one will win, we pay out)
    // Profit: (yesBid + noBid) - 1.0 - fees
    const receive = yesOrderBook.bestBid + noOrderBook.bestBid
    const grossProfit = receive - 1.0
    const fee = receive * POLYMARKET_FEE // Fee on winnings
    const netProfit = grossProfit - fee
    profitPercent = (netProfit / 1.0) * 100

    buySide = 'yes' // We're selling both
    sellSide = 'no'
    buyPrice = yesOrderBook.bestBid
    sellPrice = noOrderBook.bestBid
  }

  // Only return if profit is positive after fees
  if (profitPercent < MIN_PROFIT_PERCENT) {
    return null
  }

  // Calculate recommended size
  const recommendedSize = Math.min(
    yesOrderBook.bidSize,
    yesOrderBook.askSize,
    noOrderBook.bidSize,
    noOrderBook.askSize
  ) * 0.1

  return {
    id: `arbitrage-${market.id}`,
    strategy: 'yes_no_arbitrage',
    eventName: market.question,
    marketId: market.id,
    tokenId: market.tokenId,
    url: market.url,
    yesBid: yesOrderBook.bestBid,
    yesAsk: yesOrderBook.bestAsk,
    noBid: noOrderBook.bestBid,
    noAsk: noOrderBook.bestAsk,
    yesMidPrice: yesMid,
    noMidPrice: noMid,
    spread: yesOrderBook.spread + noOrderBook.spread,
    spreadPercent: ((yesOrderBook.spread + noOrderBook.spread) / (yesMid + noMid)) * 100,
    yesNoSum: sum,
    arbitrageGap: gap,
    estimatedProfit: sum < 1.0 ? 1.0 - (yesOrderBook.bestAsk + noOrderBook.bestAsk) : (yesOrderBook.bestBid + noOrderBook.bestBid) - 1.0,
    profitAfterFees: sum < 1.0 
      ? 1.0 - (yesOrderBook.bestAsk + noOrderBook.bestAsk) - (1.0 * POLYMARKET_FEE)
      : (yesOrderBook.bestBid + noOrderBook.bestBid) - 1.0 - ((yesOrderBook.bestBid + noOrderBook.bestBid) * POLYMARKET_FEE),
    profitPercent: profitPercent,
    liquidity: totalLiquidity,
    volume: market.volume || 0,
    minLiquidity: totalLiquidity >= MIN_LIQUIDITY,
    buySide,
    sellSide,
    buyPrice,
    sellPrice,
    recommendedSize: recommendedSize,
  }
}

/**
 * Strategy 3: Market Making
 * Place limit orders on both sides to capture spread
 */
function calculateMarketMakingOpportunity(
  market: Market,
  yesOrderBook: PolymarketOrderBookData | null,
  noOrderBook: PolymarketOrderBookData | null
): PolymarketStrategyOpportunity | null {
  // Similar to spread trading but focuses on placing orders rather than immediate execution
  // For now, we'll use spread trading logic
  return calculateSpreadTradingOpportunity(market, yesOrderBook, noOrderBook)
}

/**
 * Strategy 4: Volatility Breakout
 * Trade when prices break out of recent ranges in high volatility markets
 */
function calculateVolatilityBreakoutOpportunity(
  market: Market,
  yesOrderBook: PolymarketOrderBookData | null,
  noOrderBook: PolymarketOrderBookData | null,
  allMarkets: Market[]
): PolymarketStrategyOpportunity | null {
  if (!yesOrderBook || !noOrderBook) {
    return null
  }

  const volume = market.volume || 0
  const liquidity = market.liquidity || 0

  // Require high volume and liquidity
  if (volume < MIN_VOLUME || liquidity < MIN_LIQUIDITY) {
    return null
  }

  // Calculate volatility from spread (wider spread = higher volatility)
  const volatility = yesOrderBook.spreadPercent / 100

  // Require high volatility
  if (volatility < MIN_VOLATILITY) {
    return null
  }

  // Calculate price position (how far from 0.5)
  const priceDeviation = Math.abs(yesOrderBook.midPrice - 0.5)
  
  // Look for breakouts: price moving away from 0.5 with high volatility
  // If price is near extremes (0.2 or 0.8) with high volatility, potential breakout
  const isBreakoutCandidate = priceDeviation > 0.3 && volatility > VOLATILITY_BREAKOUT_THRESHOLD

  if (!isBreakoutCandidate) {
    return null
  }

  // Determine direction: if price < 0.5, expect upward breakout (buy Yes)
  // If price > 0.5, expect downward breakout (buy No)
  const buyYes = yesOrderBook.midPrice < 0.5
  const buySide = buyYes ? 'yes' : 'no'
  const sellSide = buyYes ? 'no' : 'yes'
  const buyPrice = buyYes ? yesOrderBook.bestAsk : noOrderBook.bestAsk
  const sellPrice = buyYes ? noOrderBook.bestBid : yesOrderBook.bestBid

  // Estimate profit from breakout continuation
  // Assume price moves further in breakout direction
  const expectedMove = volatility * 0.5 // Conservative estimate
  const grossProfit = expectedMove
  const fee = (1 + expectedMove) * POLYMARKET_FEE
  const netProfit = grossProfit - fee
  const profitPercent = (netProfit / buyPrice) * 100

  if (profitPercent < MIN_PROFIT_PERCENT) {
    return null
  }

  // Calculate volume rank
  const sortedByVolume = [...allMarkets].sort((a, b) => (b.volume || 0) - (a.volume || 0))
  const volumeRank = sortedByVolume.findIndex(m => m.id === market.id) + 1

  return {
    id: `volatility-breakout-${market.id}`,
    strategy: 'volatility_breakout',
    eventName: market.question,
    marketId: market.id,
    tokenId: market.tokenId,
    url: market.url,
    yesBid: yesOrderBook.bestBid,
    yesAsk: yesOrderBook.bestAsk,
    noBid: noOrderBook.bestBid,
    noAsk: noOrderBook.bestAsk,
    yesMidPrice: yesOrderBook.midPrice,
    noMidPrice: noOrderBook.midPrice,
    spread: yesOrderBook.spread,
    spreadPercent: yesOrderBook.spreadPercent,
    yesNoSum: yesOrderBook.midPrice + noOrderBook.midPrice,
    arbitrageGap: Math.abs(1.0 - (yesOrderBook.midPrice + noOrderBook.midPrice)),
    volatility: volatility,
    volume24h: volume,
    volumeRank: volumeRank,
    priceChange: priceDeviation,
    momentum: buyYes ? 1 : -1,
    estimatedProfit: grossProfit,
    profitAfterFees: netProfit,
    profitPercent: profitPercent,
    liquidity: liquidity,
    volume: volume,
    minLiquidity: liquidity >= MIN_LIQUIDITY,
    buySide,
    sellSide,
    buyPrice,
    sellPrice,
    recommendedSize: Math.min(yesOrderBook.askSize, noOrderBook.askSize) * 0.1,
  }
}

/**
 * Strategy 5: Volume-Weighted Momentum
 * Trade based on high volume and strong price momentum
 */
function calculateVolumeMomentumOpportunity(
  market: Market,
  yesOrderBook: PolymarketOrderBookData | null,
  noOrderBook: PolymarketOrderBookData | null,
  allMarkets: Market[]
): PolymarketStrategyOpportunity | null {
  if (!yesOrderBook || !noOrderBook) {
    return null
  }

  const volume = market.volume || 0
  const liquidity = market.liquidity || 0

  // Require very high volume
  if (volume < HIGH_VOLUME_THRESHOLD || liquidity < MIN_LIQUIDITY) {
    return null
  }

  // Calculate momentum from price position and spread
  // Price near extremes with tight spread = strong momentum
  const pricePosition = yesOrderBook.midPrice
  const momentum = pricePosition > 0.5 
    ? (pricePosition - 0.5) * 2 // Normalize to 0-1
    : (0.5 - pricePosition) * 2

  // Require strong momentum (> 0.3 = 30% from center)
  if (momentum < 0.3) {
    return null
  }

  // Tight spread with high volume = good momentum trade
  const spreadPercent = yesOrderBook.spreadPercent
  if (spreadPercent > 5) { // Too wide spread
    return null
  }

  // Determine direction based on momentum
  const buyYes = pricePosition > 0.5
  const buySide = buyYes ? 'yes' : 'no'
  const sellSide = buyYes ? 'no' : 'yes'
  const buyPrice = buyYes ? yesOrderBook.bestAsk : noOrderBook.bestAsk
  const sellPrice = buyYes ? noOrderBook.bestBid : yesOrderBook.bestBid

  // Profit from momentum continuation
  const expectedMove = momentum * 0.3 // Conservative
  const grossProfit = expectedMove
  const fee = (1 + expectedMove) * POLYMARKET_FEE
  const netProfit = grossProfit - fee
  const profitPercent = (netProfit / buyPrice) * 100

  if (profitPercent < MIN_PROFIT_PERCENT) {
    return null
  }

  const sortedByVolume = [...allMarkets].sort((a, b) => (b.volume || 0) - (a.volume || 0))
  const volumeRank = sortedByVolume.findIndex(m => m.id === market.id) + 1

  return {
    id: `volume-momentum-${market.id}`,
    strategy: 'volume_momentum',
    eventName: market.question,
    marketId: market.id,
    tokenId: market.tokenId,
    url: market.url,
    yesBid: yesOrderBook.bestBid,
    yesAsk: yesOrderBook.bestAsk,
    noBid: noOrderBook.bestBid,
    noAsk: noOrderBook.bestAsk,
    yesMidPrice: yesOrderBook.midPrice,
    noMidPrice: noOrderBook.midPrice,
    spread: yesOrderBook.spread,
    spreadPercent: spreadPercent,
    yesNoSum: yesOrderBook.midPrice + noOrderBook.midPrice,
    arbitrageGap: Math.abs(1.0 - (yesOrderBook.midPrice + noOrderBook.midPrice)),
    volume24h: volume,
    volumeRank: volumeRank,
    priceChange: momentum,
    momentum: buyYes ? momentum : -momentum,
    estimatedProfit: grossProfit,
    profitAfterFees: netProfit,
    profitPercent: profitPercent,
    liquidity: liquidity,
    volume: volume,
    minLiquidity: liquidity >= MIN_LIQUIDITY,
    buySide,
    sellSide,
    buyPrice,
    sellPrice,
    recommendedSize: Math.min(yesOrderBook.askSize, noOrderBook.askSize) * 0.15,
  }
}

/**
 * Strategy 6: High Volume Mean Reversion
 * Trade when high volume markets deviate significantly from mean (0.5)
 */
function calculateMeanReversionOpportunity(
  market: Market,
  yesOrderBook: PolymarketOrderBookData | null,
  noOrderBook: PolymarketOrderBookData | null,
  allMarkets: Market[]
): PolymarketStrategyOpportunity | null {
  if (!yesOrderBook || !noOrderBook) {
    return null
  }

  const volume = market.volume || 0
  const liquidity = market.liquidity || 0

  // Require high volume
  if (volume < HIGH_VOLUME_THRESHOLD || liquidity < MIN_LIQUIDITY) {
    return null
  }

  // Calculate deviation from mean (0.5)
  const priceDeviation = Math.abs(yesOrderBook.midPrice - 0.5)
  
  // Look for significant deviation (> 0.15 = 15% from center)
  if (priceDeviation < 0.15) {
    return null
  }

  // Mean reversion: if price is high, expect it to revert down (buy No)
  // If price is low, expect it to revert up (buy Yes)
  const buyYes = yesOrderBook.midPrice < 0.5
  const buySide = buyYes ? 'yes' : 'no'
  const sellSide = buyYes ? 'no' : 'yes'
  const buyPrice = buyYes ? yesOrderBook.bestAsk : noOrderBook.bestAsk
  const sellPrice = buyYes ? noOrderBook.bestBid : yesOrderBook.bestBid

  // Profit from mean reversion
  const expectedReversion = priceDeviation * 0.4 // Expect 40% of deviation to revert
  const grossProfit = expectedReversion
  const fee = (1 + expectedReversion) * POLYMARKET_FEE
  const netProfit = grossProfit - fee
  const profitPercent = (netProfit / buyPrice) * 100

  if (profitPercent < MIN_PROFIT_PERCENT) {
    return null
  }

  const sortedByVolume = [...allMarkets].sort((a, b) => (b.volume || 0) - (a.volume || 0))
  const volumeRank = sortedByVolume.findIndex(m => m.id === market.id) + 1

  return {
    id: `mean-reversion-${market.id}`,
    strategy: 'mean_reversion',
    eventName: market.question,
    marketId: market.id,
    tokenId: market.tokenId,
    url: market.url,
    yesBid: yesOrderBook.bestBid,
    yesAsk: yesOrderBook.bestAsk,
    noBid: noOrderBook.bestBid,
    noAsk: noOrderBook.bestAsk,
    yesMidPrice: yesOrderBook.midPrice,
    noMidPrice: noOrderBook.midPrice,
    spread: yesOrderBook.spread,
    spreadPercent: yesOrderBook.spreadPercent,
    yesNoSum: yesOrderBook.midPrice + noOrderBook.midPrice,
    arbitrageGap: Math.abs(1.0 - (yesOrderBook.midPrice + noOrderBook.midPrice)),
    volume24h: volume,
    volumeRank: volumeRank,
    priceChange: -priceDeviation, // Negative because we expect reversion
    momentum: buyYes ? 1 : -1,
    estimatedProfit: grossProfit,
    profitAfterFees: netProfit,
    profitPercent: profitPercent,
    liquidity: liquidity,
    volume: volume,
    minLiquidity: liquidity >= MIN_LIQUIDITY,
    buySide,
    sellSide,
    buyPrice,
    sellPrice,
    recommendedSize: Math.min(yesOrderBook.askSize, noOrderBook.askSize) * 0.12,
  }
}

/**
 * Strategy 7: Volatility Expansion
 * Trade when volatility increases significantly (spread widening)
 */
function calculateVolatilityExpansionOpportunity(
  market: Market,
  yesOrderBook: PolymarketOrderBookData | null,
  noOrderBook: PolymarketOrderBookData | null,
  allMarkets: Market[]
): PolymarketStrategyOpportunity | null {
  if (!yesOrderBook || !noOrderBook) {
    return null
  }

  const volume = market.volume || 0
  const liquidity = market.liquidity || 0

  // Require good volume and liquidity
  if (volume < MIN_VOLUME || liquidity < MIN_LIQUIDITY) {
    return null
  }

  // Calculate volatility from spread
  const volatility = yesOrderBook.spreadPercent / 100

  // Look for high volatility expansion (> 8% spread)
  if (volatility < 0.08) {
    return null
  }

  // High volatility with good volume = trading opportunity
  // Trade in the direction of the wider spread side
  const yesSpread = yesOrderBook.spread
  const noSpread = noOrderBook.spread
  const widerSpread = yesSpread > noSpread ? 'yes' : 'no'

  const buyYes = widerSpread === 'yes'
  const buySide = buyYes ? 'yes' : 'no'
  const sellSide = buyYes ? 'no' : 'yes'
  const buyPrice = buyYes ? yesOrderBook.bestAsk : noOrderBook.bestAsk
  const sellPrice = buyYes ? noOrderBook.bestBid : yesOrderBook.bestBid

  // Profit from volatility expansion continuation
  const expectedMove = volatility * 0.3
  const grossProfit = expectedMove
  const fee = (1 + expectedMove) * POLYMARKET_FEE
  const netProfit = grossProfit - fee
  const profitPercent = (netProfit / buyPrice) * 100

  if (profitPercent < MIN_PROFIT_PERCENT) {
    return null
  }

  const sortedByVolume = [...allMarkets].sort((a, b) => (b.volume || 0) - (a.volume || 0))
  const volumeRank = sortedByVolume.findIndex(m => m.id === market.id) + 1

  return {
    id: `volatility-expansion-${market.id}`,
    strategy: 'volatility_expansion',
    eventName: market.question,
    marketId: market.id,
    tokenId: market.tokenId,
    url: market.url,
    yesBid: yesOrderBook.bestBid,
    yesAsk: yesOrderBook.bestAsk,
    noBid: noOrderBook.bestBid,
    noAsk: noOrderBook.bestAsk,
    yesMidPrice: yesOrderBook.midPrice,
    noMidPrice: noOrderBook.midPrice,
    spread: yesOrderBook.spread,
    spreadPercent: yesOrderBook.spreadPercent,
    yesNoSum: yesOrderBook.midPrice + noOrderBook.midPrice,
    arbitrageGap: Math.abs(1.0 - (yesOrderBook.midPrice + noOrderBook.midPrice)),
    volatility: volatility,
    volume24h: volume,
    volumeRank: volumeRank,
    priceChange: volatility,
    momentum: buyYes ? 1 : -1,
    estimatedProfit: grossProfit,
    profitAfterFees: netProfit,
    profitPercent: profitPercent,
    liquidity: liquidity,
    volume: volume,
    minLiquidity: liquidity >= MIN_LIQUIDITY,
    buySide,
    sellSide,
    buyPrice,
    sellPrice,
    recommendedSize: Math.min(yesOrderBook.askSize, noOrderBook.askSize) * 0.1,
  }
}

/**
 * Strategy 8: Volume Spike Trading
 * Trade when there's unusually high volume relative to other markets
 */
function calculateVolumeSpikeOpportunity(
  market: Market,
  yesOrderBook: PolymarketOrderBookData | null,
  noOrderBook: PolymarketOrderBookData | null,
  allMarkets: Market[]
): PolymarketStrategyOpportunity | null {
  if (!yesOrderBook || !noOrderBook) {
    return null
  }

  const volume = market.volume || 0
  const liquidity = market.liquidity || 0

  // Require minimum volume
  if (volume < MIN_VOLUME || liquidity < MIN_LIQUIDITY) {
    return null
  }

  // Calculate volume rank
  const sortedByVolume = [...allMarkets].sort((a, b) => (b.volume || 0) - (a.volume || 0))
  const volumeRank = sortedByVolume.findIndex(m => m.id === market.id) + 1
  const totalMarkets = allMarkets.length

  // Look for top 10% volume markets (volume spike)
  const topPercentThreshold = Math.max(1, Math.floor(totalMarkets * 0.1))
  if (volumeRank > topPercentThreshold) {
    return null
  }

  // High volume with reasonable spread = good opportunity
  const spreadPercent = yesOrderBook.spreadPercent
  if (spreadPercent > 10) { // Too wide
    return null
  }

  // Trade in direction of price momentum with high volume
  const pricePosition = yesOrderBook.midPrice
  const buyYes = pricePosition > 0.5
  const buySide = buyYes ? 'yes' : 'no'
  const sellSide = buyYes ? 'no' : 'yes'
  const buyPrice = buyYes ? yesOrderBook.bestAsk : noOrderBook.bestAsk
  const sellPrice = buyYes ? noOrderBook.bestBid : yesOrderBook.bestBid

  // Profit from volume-driven price movement
  const priceMomentum = Math.abs(pricePosition - 0.5) * 2
  const expectedMove = priceMomentum * 0.25
  const grossProfit = expectedMove
  const fee = (1 + expectedMove) * POLYMARKET_FEE
  const netProfit = grossProfit - fee
  const profitPercent = (netProfit / buyPrice) * 100

  if (profitPercent < MIN_PROFIT_PERCENT) {
    return null
  }

  return {
    id: `volume-spike-${market.id}`,
    strategy: 'volume_spike',
    eventName: market.question,
    marketId: market.id,
    tokenId: market.tokenId,
    url: market.url,
    yesBid: yesOrderBook.bestBid,
    yesAsk: yesOrderBook.bestAsk,
    noBid: noOrderBook.bestBid,
    noAsk: noOrderBook.bestAsk,
    yesMidPrice: yesOrderBook.midPrice,
    noMidPrice: noOrderBook.midPrice,
    spread: yesOrderBook.spread,
    spreadPercent: spreadPercent,
    yesNoSum: yesOrderBook.midPrice + noOrderBook.midPrice,
    arbitrageGap: Math.abs(1.0 - (yesOrderBook.midPrice + noOrderBook.midPrice)),
    volume24h: volume,
    volumeRank: volumeRank,
    priceChange: priceMomentum,
    momentum: buyYes ? priceMomentum : -priceMomentum,
    estimatedProfit: grossProfit,
    profitAfterFees: netProfit,
    profitPercent: profitPercent,
    liquidity: liquidity,
    volume: volume,
    minLiquidity: liquidity >= MIN_LIQUIDITY,
    buySide,
    sellSide,
    buyPrice,
    sellPrice,
    recommendedSize: Math.min(yesOrderBook.askSize, noOrderBook.askSize) * 0.2, // Higher size for high volume
  }
}

/**
 * Find all Polymarket-only trading opportunities
 */
export async function findPolymarketOpportunities(
  markets: Market[]
): Promise<PolymarketStrategyOpportunity[]> {
  const opportunities: PolymarketStrategyOpportunity[] = []

  // Process markets in batches to avoid rate limiting
  const batchSize = 10
  for (let i = 0; i < markets.length; i += batchSize) {
    const batch = markets.slice(i, i + batchSize)
    
    await Promise.all(
      batch.map(async (market) => {
        if (!market.tokenId) {
          return
        }

        try {
          // Fetch orderbook for Yes token (tokenId)
          const yesOrderBookRaw = await fetchPolymarketOrderBook(market.tokenId)
          if (!yesOrderBookRaw) {
            return
          }

          // For No token, we need to find the corresponding No token ID
          // In Polymarket, No tokens typically have a related token ID
          // For now, we'll use the Yes orderbook and calculate No from it
          // Note: This is a simplification - in reality, you'd need to fetch the No token's orderbook
          
          const yesOrderBook = extractOrderBookData(yesOrderBookRaw, 'yes')
          if (!yesOrderBook) {
            return
          }

          // Calculate No prices from Yes prices (No = 1 - Yes)
          // This is an approximation - ideally we'd fetch the actual No orderbook
          const noOrderBook: PolymarketOrderBookData = {
            bestBid: 1 - yesOrderBook.bestAsk, // No bid = 1 - Yes ask
            bestAsk: 1 - yesOrderBook.bestBid, // No ask = 1 - Yes bid
            bidSize: yesOrderBook.askSize,
            askSize: yesOrderBook.bidSize,
            midPrice: 1 - yesOrderBook.midPrice,
            spread: yesOrderBook.spread,
            spreadPercent: yesOrderBook.spreadPercent,
          }

          // Try all strategies
          const spreadOpp = calculateSpreadTradingOpportunity(market, yesOrderBook, noOrderBook)
          if (spreadOpp) {
            opportunities.push(spreadOpp)
          }

          const arbitrageOpp = calculateYesNoArbitrageOpportunity(market, yesOrderBook, noOrderBook)
          if (arbitrageOpp) {
            opportunities.push(arbitrageOpp)
          }

          // New volatility and volume strategies
          const volatilityBreakout = calculateVolatilityBreakoutOpportunity(market, yesOrderBook, noOrderBook, markets)
          if (volatilityBreakout) {
            opportunities.push(volatilityBreakout)
          }

          const volumeMomentum = calculateVolumeMomentumOpportunity(market, yesOrderBook, noOrderBook, markets)
          if (volumeMomentum) {
            opportunities.push(volumeMomentum)
          }

          const meanReversion = calculateMeanReversionOpportunity(market, yesOrderBook, noOrderBook, markets)
          if (meanReversion) {
            opportunities.push(meanReversion)
          }

          const volatilityExpansion = calculateVolatilityExpansionOpportunity(market, yesOrderBook, noOrderBook, markets)
          if (volatilityExpansion) {
            opportunities.push(volatilityExpansion)
          }

          const volumeSpike = calculateVolumeSpikeOpportunity(market, yesOrderBook, noOrderBook, markets)
          if (volumeSpike) {
            opportunities.push(volumeSpike)
          }
        } catch (error) {
          console.error(`Error processing market ${market.id}:`, error)
        }
      })
    )

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < markets.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Sort by profit percentage descending
  return opportunities.sort((a, b) => b.profitPercent - a.profitPercent)
}

