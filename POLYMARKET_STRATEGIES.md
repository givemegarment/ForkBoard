# Polymarket-Only Trading Strategies

## Overview

Forkboard now includes a complete Polymarket-only trading strategy system that works without requiring Kalshi integration. This allows you to find and execute profitable trading opportunities using only Polymarket.

## Available Strategies

### 1. Spread Trading / Market Making
- **How it works**: Buy at the bid price, sell at the ask price, profit from the spread
- **Best for**: Markets with wide spreads and good liquidity
- **Risk**: Low to medium (depends on market volatility)
- **Profit source**: Bid-ask spread minus fees

### 2. Yes/No Arbitrage
- **How it works**: When Yes + No prices don't sum to 1.0, there's an arbitrage opportunity
  - If sum < 1.0: Buy both Yes and No (guaranteed profit)
  - If sum > 1.0: Sell both Yes and No (guaranteed profit)
- **Best for**: Markets with pricing inefficiencies
- **Risk**: Very low (risk-free arbitrage)
- **Profit source**: Price gap between Yes and No tokens

### 3. Market Making
- **How it works**: Place limit orders on both sides to capture spreads
- **Best for**: High-volume markets
- **Risk**: Medium (requires managing inventory)
- **Profit source**: Spread capture over time

## Features

✅ **Real-time opportunity detection**
- Scans all active Polymarket markets
- Calculates profit after fees
- Filters by minimum liquidity ($1,000)
- Sorts by profitability

✅ **Trading execution**
- One-click trade execution
- Automatic order placement
- Order management (view/cancel)

✅ **Smart filtering**
- Minimum spread threshold (0.5%)
- Minimum profit after fees (0.3%)
- Liquidity requirements
- Market quality indicators

## How to Use

### 1. View Opportunities

1. Navigate to the "Polymarket Strategies" tab
2. Opportunities are automatically refreshed every 15 seconds
3. View:
   - Strategy type
   - Event name
   - Bid/ask prices
   - Spread percentage
   - Profit percentage
   - Liquidity

### 2. Execute Trades

1. Click the "Trade" button on any opportunity
2. The system will:
   - Place buy/sell orders automatically
   - Use recommended position sizes
   - Handle order placement on Polymarket

### 3. Monitor Orders

- Use the Orders API endpoint to view open orders
- Cancel orders if needed
- Track execution status

## API Endpoints

### Get Polymarket Opportunities
```
GET /api/polymarket-opportunities
```

Returns:
```json
{
  "opportunities": [
    {
      "id": "spread-market-123",
      "strategy": "spread_trading",
      "eventName": "Will Bitcoin reach $100k?",
      "marketId": "market-123",
      "tokenId": "token-456",
      "url": "https://polymarket.com/event/...",
      "yesBid": 0.65,
      "yesAsk": 0.67,
      "noBid": 0.33,
      "noAsk": 0.35,
      "spread": 0.02,
      "spreadPercent": 3.03,
      "profitPercent": 1.5,
      "liquidity": 50000,
      "buySide": "yes",
      "sellSide": "yes",
      "buyPrice": 0.65,
      "sellPrice": 0.67,
      "recommendedSize": 100
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "marketCount": 150,
  "opportunityCount": 12
}
```

### Execute Trade
```
POST /api/polymarket-trade
Body: {
  "opportunity": {...},
  "size": 100  // optional, defaults to recommendedSize
}
```

## Configuration

### Minimum Thresholds

You can adjust these in `lib/polymarket-strategies.ts`:

```typescript
const MIN_LIQUIDITY = 1000 // Minimum liquidity in USD
const MIN_SPREAD_PERCENT = 0.5 // Minimum spread to consider (0.5%)
const MIN_PROFIT_PERCENT = 0.3 // Minimum profit after fees (0.3%)
```

### Fees

Polymarket charges 2% on winnings, which is automatically factored into profit calculations.

## Strategy Details

### Spread Trading Calculation

```
Gross Profit = Ask Price - Bid Price
Fee on Buy = Bid Price × 2%
Fee on Sell = Ask Price × 2%
Net Profit = Gross Profit - Fee on Buy - Fee on Sell
Profit % = (Net Profit / Bid Price) × 100
```

### Yes/No Arbitrage Calculation

**When sum < 1.0:**
```
Cost = Yes Ask + No Ask
Payout = 1.0 (one will win)
Fee = 1.0 × 2%
Net Profit = 1.0 - Cost - Fee
```

**When sum > 1.0:**
```
Receive = Yes Bid + No Bid
Payout = 1.0 (one will win, we pay)
Fee = Receive × 2%
Net Profit = Receive - 1.0 - Fee
```

## Limitations & Notes

1. **No Token Orderbook**: Currently uses Yes token orderbook and calculates No prices from it. Full implementation would require fetching actual No token orderbooks.

2. **Order Execution**: For spread trading, both buy and sell orders are placed simultaneously. In practice, you might want to wait for the buy to fill first.

3. **Yes/No Arbitrage**: Full arbitrage requires trading both Yes and No tokens. Current implementation executes the primary side only.

4. **Rate Limiting**: Markets are processed in batches to avoid API rate limits.

5. **Gas Fees**: Gas fees are not currently included in profit calculations.

## Best Practices

1. **Start Small**: Test with small position sizes first
2. **Monitor Liquidity**: Only trade markets with sufficient liquidity
3. **Check Spreads**: Wider spreads = more profit potential but harder to fill
4. **Watch Fees**: Ensure profit after fees is meaningful
5. **Manage Risk**: Don't over-leverage, set position limits

## Troubleshooting

**No opportunities found?**
- Check minimum thresholds (may be too high)
- Verify markets have sufficient liquidity
- Ensure Polymarket API is accessible

**Trades not executing?**
- Verify `POLYMARKET_PRIVATE_KEY` is set
- Check wallet has sufficient USDC
- Ensure token IDs are valid
- Check orderbook hasn't changed

**Low profit opportunities?**
- Adjust minimum profit threshold
- Focus on higher liquidity markets
- Consider wider spreads

## Future Enhancements

- [ ] Fetch actual No token orderbooks
- [ ] Implement full Yes/No arbitrage (both tokens)
- [ ] Add gas fee calculations
- [ ] Real-time WebSocket price updates
- [ ] Position management dashboard
- [ ] Backtesting capabilities
- [ ] Risk management features
- [ ] Performance analytics

