# Forkboard Upgrade Notes

## Overview

Your Forkboard arbitrage scanner has been upgraded with official SDKs from Polymarket and enhanced functionality for automated trading and real-time data.

## New Features

### 1. Polymarket CLOB Client Integration

- **Official SDK**: Now using `@polymarket/clob-client` for better market data and trading capabilities
- **Enhanced Orderbook Data**: Real orderbook data with bid/ask spreads
- **Authenticated Trading**: Support for executing trades directly on Polymarket

**Files added/modified:**
- `lib/polymarket-client.ts` - Client initialization with authentication
- `lib/polymarket.ts` - Updated to use official SDK
- `lib/types.ts` - Added spread and tokenId fields to Market interface

### 2. Trading Execution Module

Automated arbitrage execution with support for both Polymarket and Kalshi (Kalshi implementation pending).

**Features:**
- Execute trades on Polymarket automatically
- Calculate optimal stake allocations
- Cancel orders
- View open orders

**Files added:**
- `lib/trading.ts` - Trading execution logic
- `app/api/trade/route.ts` - API endpoint for executing trades
- `app/api/orders/route.ts` - API endpoint for managing orders

### 3. Real-time WebSocket Support

Live price updates via WebSocket connections for real-time arbitrage detection.

**Features:**
- WebSocket client with auto-reconnection
- Subscribe to specific markets
- Real-time price update callbacks

**Files added:**
- `lib/realtime.ts` - WebSocket client for real-time data

### 4. Environment Configuration

New environment variables for API keys and configuration.

**Files added:**
- `.env.example` - Template for environment variables
- `.env.local` - Local environment configuration (git-ignored)

## Setup Instructions

### 1. Install Dependencies

Dependencies have already been installed:
```bash
npm install @polymarket/clob-client ethers@^5.7.0
```

### 2. Configure Environment Variables

Edit `.env.local` and add your credentials:

```bash
# Required for trading on Polymarket
POLYMARKET_PRIVATE_KEY=your_ethereum_private_key_here

# Optional: Custom Polymarket host (defaults to https://clob.polymarket.com)
POLYMARKET_HOST=https://clob.polymarket.com

# Optional: Chain ID (defaults to 137 for Polygon)
POLYMARKET_CHAIN_ID=137

# For future Kalshi trading support
KALSHI_API_KEY=your_kalshi_api_key
KALSHI_API_SECRET=your_kalshi_secret

# Real-time WebSocket URL (update when official URL is available)
NEXT_PUBLIC_POLYMARKET_WS_URL=wss://ws.polymarket.com
```

### 3. Get a Polymarket Private Key

To enable trading features:

1. Create or use an existing Ethereum wallet
2. Export the private key (keep it secure!)
3. Add funds to the wallet on Polygon network
4. Add USDC for trading

**Important Security Notes:**
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Keep your private keys secure
- Use a dedicated wallet for trading, not your main wallet
- Start with small amounts for testing

## API Endpoints

### Fetch Arbitrage Opportunities
```
GET /api/opportunities
```

Returns list of arbitrage opportunities with enhanced data including spreads.

### Execute Trade
```
POST /api/trade
Body: {
  "opportunity": {...},
  "bankroll": 100,
  "polymarketTokenId": "token_id_here"
}
```

Executes an arbitrage trade automatically.

### Get Open Orders
```
GET /api/orders
```

Returns all open orders on Polymarket.

### Cancel Order
```
DELETE /api/orders
Body: {
  "orderId": "order_id_here"
}
```

Cancels a specific order.

## Usage Examples

### Using the Trading Module

```typescript
import { executeArbitrage } from '@/lib/trading'

// Execute an arbitrage opportunity
const result = await executeArbitrage(
  opportunity,
  100, // bankroll in USDC
  'polymarket_token_id'
)

if (result.success) {
  console.log('Trade executed!', result)
} else {
  console.error('Trade failed:', result.error)
}
```

### Using Real-time Updates

```typescript
import { createPolymarketRealtimeClient } from '@/lib/realtime'

const realtimeClient = createPolymarketRealtimeClient()

// Subscribe to price updates
const unsubscribe = realtimeClient.subscribe((update) => {
  console.log('Price update:', update)
})

// Connect to WebSocket
realtimeClient.connect()

// Subscribe to specific markets
realtimeClient.subscribeToMarkets(['market_id_1', 'market_id_2'])

// Later: cleanup
unsubscribe()
realtimeClient.disconnect()
```

## Next Steps

### Recommended Improvements

1. **Add UI for Trading**
   - Create buttons to execute trades from the opportunities table
   - Add order management dashboard
   - Display real-time price updates

2. **Implement Kalshi Trading**
   - Add Kalshi API integration using their Python SDK
   - Create bridge between TypeScript and Python for Kalshi trades
   - Complete arbitrage execution across both platforms

3. **Add Safety Features**
   - Maximum position limits
   - Stop-loss mechanisms
   - Confirmation dialogs before executing trades
   - Trade simulation mode

4. **Monitoring & Alerts**
   - Discord/Telegram notifications for profitable opportunities
   - Trade execution logging
   - Performance analytics dashboard

5. **Testing**
   - Add unit tests for trading logic
   - Integration tests for API endpoints
   - Test on Polygon testnet before mainnet

## Known Limitations

1. **Kalshi Trading**: Not yet implemented (requires additional integration)
2. **WebSocket URL**: Placeholder URL - update with official Polymarket WebSocket endpoint
3. **Gas Fees**: Not currently calculated in profit estimates
4. **Rate Limiting**: No rate limiting protection implemented

## Troubleshooting

### "Polymarket client not initialized"
- Ensure `POLYMARKET_PRIVATE_KEY` is set in `.env.local`
- Check that the private key is valid
- Verify the wallet has funds on Polygon

### "Cannot execute trade"
- Check wallet balance (USDC on Polygon)
- Verify tokenId is correct
- Ensure market is still active

### WebSocket not connecting
- Verify WebSocket URL is correct
- Check browser console for connection errors
- Ensure firewall allows WebSocket connections

## Security Reminders

- **Never share your private keys**
- **Never commit `.env.local` to version control**
- **Use a dedicated wallet for automated trading**
- **Start with small amounts**
- **Test on testnet first**
- **Monitor trades regularly**
- **Set up alerts for unusual activity**

## Resources

- [Polymarket CLOB Client Docs](https://github.com/Polymarket/clob-client)
- [Kalshi API Docs](https://github.com/Kalshi/kalshi-starter-code-python)
- [Ethers.js Documentation](https://docs.ethers.org/v5/)
- [Polygon Network Info](https://polygon.technology/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the official SDK documentation
3. Test with small amounts first
4. Monitor logs for error messages
