import { MatchedEvent, ArbitrageOpportunity } from './types'

// Fee constants
const KALSHI_FEE = 0.007 // 0.7% on total position
const POLYMARKET_FEE = 0.02 // 2% on winnings

/**
 * Calculate arbitrage opportunity for a matched event
 */
export function calculateArbitrage(event: MatchedEvent): ArbitrageOpportunity | null {
  if (!event.polymarket || !event.kalshi) {
    return null
  }

  const pmYes = event.polymarket.yesPrice
  const kalshiYes = event.kalshi.yesPrice

  // Calculate spread (difference in Yes prices)
  const spread = Math.abs(pmYes - kalshiYes)

  // Determine which side to buy/sell
  // If Polymarket Yes is cheaper, buy PM Yes and sell Kalshi Yes (or buy Kalshi No)
  // If Kalshi Yes is cheaper, buy Kalshi Yes and sell Polymarket Yes (or buy PM No)

  let profitAfterFees = 0

  if (pmYes < kalshiYes) {
    // Buy Polymarket Yes, sell Kalshi Yes (or buy Kalshi No)
    // Profit = (1 - pmYes) - kalshiYes - fees
    const grossProfit = (1 - pmYes) - kalshiYes
    const pmFee = (1 - pmYes) * POLYMARKET_FEE // Fee on winnings
    const kalshiFee = kalshiYes * KALSHI_FEE // Fee on position
    profitAfterFees = grossProfit - pmFee - kalshiFee
  } else {
    // Buy Kalshi Yes, sell Polymarket Yes (or buy PM No)
    // Profit = (1 - kalshiYes) - pmYes - fees
    const grossProfit = (1 - kalshiYes) - pmYes
    const kalshiFee = (1 - kalshiYes) * KALSHI_FEE // Fee on position
    const pmFee = pmYes * POLYMARKET_FEE // Fee on winnings
    profitAfterFees = grossProfit - kalshiFee - pmFee
  }

  // Only return opportunity if profit > 0 after fees
  if (profitAfterFees <= 0) {
    return null
  }

  return {
    eventName: event.eventName,
    polymarketYesPrice: pmYes,
    kalshiYesPrice: kalshiYes,
    spread: spread * 100, // Convert to percentage
    profitAfterFees: profitAfterFees * 100, // Convert to percentage
    polymarketUrl: event.polymarket.url,
    kalshiUrl: event.kalshi.url,
    polymarketId: event.polymarket.id,
    kalshiId: event.kalshi.id,
  }
}

/**
 * Calculate optimal stake allocation for arbitrage
 */
export function calculateOptimalStakes(
  bankroll: number,
  opportunity: ArbitrageOpportunity
): { polymarketStake: number; kalshiStake: number; totalProfit: number } {
  const { polymarketYesPrice, kalshiYesPrice, profitAfterFees } = opportunity

  // Determine which side is cheaper
  if (polymarketYesPrice < kalshiYesPrice) {
    // Buy Polymarket Yes, sell Kalshi Yes
    // For $1 on PM Yes, we need $kalshiYesPrice on Kalshi No
    const ratio = kalshiYesPrice / (1 - polymarketYesPrice)
    const kalshiStake = (bankroll * ratio) / (1 + ratio)
    const polymarketStake = bankroll - kalshiStake

    const totalProfit = (bankroll * profitAfterFees) / 100

    return {
      polymarketStake,
      kalshiStake,
      totalProfit,
    }
  } else {
    // Buy Kalshi Yes, sell Polymarket Yes
    const ratio = polymarketYesPrice / (1 - kalshiYesPrice)
    const polymarketStake = (bankroll * ratio) / (1 + ratio)
    const kalshiStake = bankroll - polymarketStake

    const totalProfit = (bankroll * profitAfterFees) / 100

    return {
      polymarketStake,
      kalshiStake,
      totalProfit,
    }
  }
}

