import { ClobClient } from '@polymarket/clob-client'
import { Wallet } from 'ethers'

let clobClient: ClobClient | null = null

/**
 * Initialize Polymarket CLOB client
 * This should be called server-side only
 */
export async function initPolymarketClient(): Promise<ClobClient | null> {
  if (clobClient) {
    return clobClient
  }

  const privateKey = process.env.POLYMARKET_PRIVATE_KEY
  const host = process.env.POLYMARKET_HOST || 'https://clob.polymarket.com'
  const chainId = parseInt(process.env.POLYMARKET_CHAIN_ID || '137')

  // If no private key, return null (read-only mode)
  if (!privateKey) {
    console.warn('POLYMARKET_PRIVATE_KEY not set. Trading features disabled.')
    return null
  }

  try {
    const wallet = new Wallet(privateKey)

    // Create a temporary client to get/derive API credentials
    const tempClient = new ClobClient(host, chainId, wallet)

    // Derive API key (or create if it doesn't exist)
    const creds = await tempClient.createOrDeriveApiKey()

    // Create the authenticated client with credentials
    clobClient = new ClobClient(
      host,
      chainId,
      wallet,
      creds
    )

    console.log('Polymarket CLOB client initialized')
    return clobClient
  } catch (error) {
    console.error('Failed to initialize Polymarket client:', error)
    return null
  }
}

/**
 * Get the initialized CLOB client (or null if not authenticated)
 */
export function getPolymarketClient(): ClobClient | null {
  return clobClient
}
