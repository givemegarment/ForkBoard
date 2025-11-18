# API Integration Guide: Polymarket & Kalshi

This guide explains how to connect your Forkboard app to Polymarket and Kalshi APIs for full trading functionality.

## 🔐 Polymarket API Connection

### Current Status
✅ **Partially Connected** - Market data works, trading requires authentication

### Setup Steps

1. **Get Your Ethereum Private Key**
   - Create or use an existing Ethereum wallet
   - Export the private key (keep it secure!)
   - **Important**: Use a dedicated wallet for trading, not your main wallet
   - The wallet must be on Polygon network (Chain ID: 137)

2. **Fund Your Wallet**
   - Add MATIC for gas fees on Polygon
   - Add USDC for trading on Polymarket
   - You can bridge funds using [Polygon Bridge](https://portal.polygon.technology/polygon/bridge)

3. **Configure Environment Variables**
   Create a `.env.local` file in the project root:
   ```bash
   # Required for Polymarket trading
   POLYMARKET_PRIVATE_KEY=your_ethereum_private_key_here
   
   # Optional: Custom Polymarket host (defaults to https://clob.polymarket.com)
   POLYMARKET_HOST=https://clob.polymarket.com
   
   # Optional: Chain ID (defaults to 137 for Polygon)
   POLYMARKET_CHAIN_ID=137
   ```

4. **How It Works**
   - The app uses `@polymarket/clob-client` SDK
   - On first run, it automatically derives API credentials from your private key
   - The client is initialized in `lib/polymarket-client.ts`
   - Trading functions are in `lib/trading.ts`

5. **Test the Connection**
   ```bash
   npm run dev
   ```
   - Check console for "Polymarket CLOB client initialized" message
   - Try fetching opportunities: `GET /api/opportunities`
   - Test trading: `POST /api/trade` (use small amounts first!)

### Polymarket API Resources
- [Polymarket CLOB Client Docs](https://github.com/Polymarket/clob-client)
- [Polymarket Developer Docs](https://docs.polymarket.com/)
- [Polymarket Discord #devs](https://discord.gg/polymarket)

---

## 🎯 Kalshi API Connection

### Current Status
⚠️ **Read-Only** - Market data works, trading NOT implemented

### Setup Steps

1. **Get Kalshi API Credentials**
   - Log into your [Kalshi account](https://kalshi.com)
   - Navigate to Account Settings → API Keys
   - Create a new API key
   - **Important**: Save the private key immediately - it won't be shown again!
   - You'll get:
     - `KALSHI_API_KEY` (access key)
     - `KALSHI_API_SECRET` (private key)

2. **Choose Integration Method**

   **Option A: TypeScript/Node.js SDK (Recommended)**
   ```bash
   npm install kalshi-typescript-sdk
   # OR if available:
   npm install @kalshi/kalshi-js
   ```

   **Option B: Python SDK (Requires Bridge)**
   ```bash
   pip install kalshi-python
   ```
   - You'll need to create a Python bridge service
   - Or use a Node.js HTTP client with manual authentication

3. **Configure Environment Variables**
   Add to `.env.local`:
   ```bash
   # Required for Kalshi trading
   KALSHI_API_KEY=your_kalshi_api_key
   KALSHI_API_SECRET=your_kalshi_secret
   
   # Optional: Kalshi API base URL
   KALSHI_API_BASE=https://trading-api.kalshi.com/trade-api/v2
   
   # Optional: Use demo environment for testing
   KALSHI_DEMO_MODE=true
   ```

4. **Implement Kalshi Trading Client**

   You need to create `lib/kalshi-client.ts` with authentication:

   ```typescript
   import crypto from 'crypto'
   
   interface KalshiAuthHeaders {
     'KALSHI-ACCESS-KEY': string
     'KALSHI-ACCESS-TIMESTAMP': string
     'KALSHI-ACCESS-SIGNATURE': string
   }
   
   function generateKalshiSignature(
     method: string,
     path: string,
     body: string,
     secret: string
   ): string {
     const timestamp = Math.floor(Date.now() / 1000).toString()
     const message = `${method}\n${path}\n${body}\n${timestamp}`
     const signature = crypto
       .createHmac('sha256', secret)
       .update(message)
       .digest('base64')
     return signature
   }
   
   async function kalshiRequest(
     method: string,
     path: string,
     body?: any
   ) {
     const apiKey = process.env.KALSHI_API_KEY
     const apiSecret = process.env.KALSHI_API_SECRET
     
     if (!apiKey || !apiSecret) {
       throw new Error('Kalshi API credentials not configured')
     }
     
     const bodyString = body ? JSON.stringify(body) : ''
     const timestamp = Math.floor(Date.now() / 1000).toString()
     const signature = generateKalshiSignature(method, path, bodyString, apiSecret)
     
     const headers: KalshiAuthHeaders = {
       'KALSHI-ACCESS-KEY': apiKey,
       'KALSHI-ACCESS-TIMESTAMP': timestamp,
       'KALSHI-ACCESS-SIGNATURE': signature,
       'Content-Type': 'application/json',
     }
     
     const baseUrl = process.env.KALSHI_API_BASE || 
       'https://trading-api.kalshi.com/trade-api/v2'
     
     const response = await fetch(`${baseUrl}${path}`, {
       method,
       headers,
       body: bodyString || undefined,
     })
     
     if (!response.ok) {
       throw new Error(`Kalshi API error: ${response.status}`)
     }
     
     return response.json()
   }
   ```

5. **Implement Trading Functions**

   Update `lib/trading.ts` to add Kalshi trading:

   ```typescript
   export async function executeKalshiTrade(
     eventTicker: string,
     side: 'yes' | 'no',
     count: number, // Number of contracts
     price: number
   ): Promise<TradeExecution> {
     try {
       const response = await kalshiRequest('POST', '/portfolio/orders', {
         event_ticker: eventTicker,
         side: side,
         count: count,
         price: price,
         order_type: 'limit', // or 'market'
       })
       
       return {
         success: true,
         orderId: response.order_id,
         platform: 'kalshi',
         side: side,
         price,
         size: count,
       }
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Unknown error',
         platform: 'kalshi',
         side: side,
         price,
         size: count,
       }
     }
   }
   ```

6. **Update Arbitrage Execution**

   Modify `executeArbitrage()` in `lib/trading.ts` to call Kalshi trading functions instead of returning the "not implemented" error.

### Kalshi API Resources
- [Kalshi API Documentation](https://docs.kalshi.com/)
- [Kalshi Python SDK](https://github.com/Kalshi/kalshi-python)
- [Kalshi Getting Started Guide](https://docs.kalshi.com/getting_started/api_keys)

### Kalshi API Endpoints You'll Need

- `POST /portfolio/orders` - Place an order
- `GET /portfolio/orders` - Get open orders
- `DELETE /portfolio/orders/{order_id}` - Cancel an order
- `GET /portfolio/balance` - Get account balance
- `GET /events/{event_ticker}` - Get event details
- `GET /events/{event_ticker}/orderbook` - Get orderbook

---

## 🔒 Security Best Practices

1. **Never commit `.env.local` to git** (already in `.gitignore`)
2. **Use a dedicated trading wallet** - Don't use your main wallet
3. **Start with small amounts** - Test thoroughly before scaling
4. **Use testnet/demo mode** when available
5. **Rotate API keys regularly**
6. **Monitor your trades** - Set up alerts for unusual activity
7. **Keep private keys secure** - Use environment variables, never hardcode

---

## 🧪 Testing Your Integration

### Test Polymarket
```bash
# 1. Start the dev server
npm run dev

# 2. Check if client initializes (check console)
# Should see: "Polymarket CLOB client initialized"

# 3. Test market data
curl http://localhost:3000/api/opportunities

# 4. Test trading (use small amount!)
curl -X POST http://localhost:3000/api/trade \
  -H "Content-Type: application/json" \
  -d '{
    "opportunity": {...},
    "bankroll": 10,
    "polymarketTokenId": "token_id"
  }'
```

### Test Kalshi
```bash
# 1. Test market data (already working)
curl http://localhost:3000/api/opportunities

# 2. Test trading (after implementing)
# Use Kalshi demo environment first!
```

---

## 🐛 Troubleshooting

### Polymarket Issues

**"Polymarket client not initialized"**
- Check that `POLYMARKET_PRIVATE_KEY` is set in `.env.local`
- Verify the private key is valid (starts with `0x`)
- Ensure wallet has funds on Polygon

**"Cannot execute trade"**
- Check wallet balance (USDC on Polygon)
- Verify tokenId is correct
- Ensure market is still active
- Check gas fees are covered

### Kalshi Issues

**"Kalshi API error: 401"**
- Verify API key and secret are correct
- Check timestamp is within acceptable range
- Ensure signature is generated correctly

**"Kalshi trading not yet implemented"**
- This is expected - you need to implement the trading functions
- Follow the implementation steps above

---

## 📚 Additional Resources

- [Ethers.js Documentation](https://docs.ethers.org/v5/) - For Ethereum/Polygon interactions
- [Polygon Network Info](https://polygon.technology/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## ✅ Checklist

### Polymarket
- [ ] Ethereum wallet created
- [ ] Private key exported and secured
- [ ] Wallet funded with MATIC and USDC on Polygon
- [ ] `POLYMARKET_PRIVATE_KEY` added to `.env.local`
- [ ] Client initializes successfully
- [ ] Can fetch market data
- [ ] Can execute test trades (small amounts)

### Kalshi
- [ ] Kalshi account created
- [ ] API key generated
- [ ] API credentials saved securely
- [ ] `KALSHI_API_KEY` and `KALSHI_API_SECRET` added to `.env.local`
- [ ] Kalshi client implemented
- [ ] Trading functions implemented
- [ ] Can execute test trades (demo mode first)

---

**Need Help?**
- Check the official API documentation
- Join Polymarket Discord #devs channel
- Review Kalshi API docs and examples
- Test with small amounts first!


