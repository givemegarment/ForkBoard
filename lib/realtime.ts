/**
 * Real-time price updates using WebSocket
 * This module provides WebSocket connectivity for live market data
 */

export type PriceUpdateCallback = (data: PriceUpdate) => void

export interface PriceUpdate {
  marketId: string
  tokenId?: string
  price: number
  timestamp: number
  platform: 'polymarket' | 'kalshi'
}

export interface WebSocketConfig {
  url: string
  reconnectDelay?: number
  maxReconnectAttempts?: number
}

export class RealtimeMarketData {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private reconnectDelay: number
  private url: string
  private callbacks: Set<PriceUpdateCallback> = new Set()
  private isConnecting = false

  constructor(config: WebSocketConfig) {
    this.url = config.url
    this.reconnectDelay = config.reconnectDelay || 3000
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnecting = false
        this.attemptReconnect()
      }
    } catch (error) {
      console.error('Error connecting to WebSocket:', error)
      this.isConnecting = false
      this.attemptReconnect()
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent auto-reconnect
  }

  /**
   * Subscribe to price updates
   */
  subscribe(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * Subscribe to specific markets
   */
  subscribeToMarkets(marketIds: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected. Cannot subscribe to markets.')
      return
    }

    // Send subscription message
    this.ws.send(
      JSON.stringify({
        type: 'subscribe',
        markets: marketIds,
      })
    )
  }

  /**
   * Unsubscribe from specific markets
   */
  unsubscribeFromMarkets(marketIds: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.ws.send(
      JSON.stringify({
        type: 'unsubscribe',
        markets: marketIds,
      })
    )
  }

  private handleMessage(data: any): void {
    // Transform incoming data to PriceUpdate format
    const update: PriceUpdate = {
      marketId: data.market || data.marketId,
      tokenId: data.tokenId,
      price: data.price,
      timestamp: data.timestamp || Date.now(),
      platform: data.platform || 'polymarket',
    }

    // Notify all subscribers
    this.callbacks.forEach((callback) => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in price update callback:', error)
      }
    })
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay)
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

/**
 * Create a Polymarket real-time data connection
 * Note: Update the WebSocket URL when available from Polymarket docs
 */
export function createPolymarketRealtimeClient(): RealtimeMarketData {
  // TODO: Replace with actual Polymarket WebSocket URL
  // This is a placeholder - check Polymarket documentation for the correct endpoint
  const wsUrl = process.env.NEXT_PUBLIC_POLYMARKET_WS_URL || 'wss://ws.polymarket.com'

  return new RealtimeMarketData({
    url: wsUrl,
    reconnectDelay: 3000,
    maxReconnectAttempts: 10,
  })
}
