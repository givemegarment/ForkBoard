'use client'

import { useEffect, useState } from 'react'
import { ArbitrageOpportunity, PolymarketStrategyOpportunity } from '@/lib/types'
import OpportunitiesTable from '@/components/OpportunitiesTable'
import PolymarketOpportunitiesTable from '@/components/PolymarketOpportunitiesTable'

type TabType = 'cross-platform' | 'polymarket-only'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('polymarket-only')
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [polymarketOpportunities, setPolymarketOpportunities] = useState<PolymarketStrategyOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [polymarketLoading, setPolymarketLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchOpportunities = async () => {
    try {
      setError(null)
      const response = await fetch('/api/opportunities')
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities')
      }
      const data = await response.json()
      setOpportunities(data.opportunities || [])
      setLastUpdate(new Date())
      setLoading(false)
    } catch (err) {
      console.error('Error fetching opportunities:', err)
      setError('Failed to load opportunities. Please try again.')
      setLoading(false)
    }
  }

  const fetchPolymarketOpportunities = async () => {
    try {
      setError(null)
      const response = await fetch('/api/polymarket-opportunities')
      if (!response.ok) {
        throw new Error('Failed to fetch Polymarket opportunities')
      }
      const data = await response.json()
      setPolymarketOpportunities(data.opportunities || [])
      setLastUpdate(new Date())
      setPolymarketLoading(false)
    } catch (err) {
      console.error('Error fetching Polymarket opportunities:', err)
      setError('Failed to load Polymarket opportunities. Please try again.')
      setPolymarketLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch for both types
    fetchOpportunities()
    fetchPolymarketOpportunities()

    // Set up auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchOpportunities()
      fetchPolymarketOpportunities()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <main className="min-h-screen bg-dark-bg text-dark-text">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Forkboard</h1>
          <p className="text-dark-text-muted">
            Trading Strategies for Polymarket
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-dark-border">
          <button
            onClick={() => setActiveTab('polymarket-only')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'polymarket-only'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-dark-text-muted hover:text-dark-text'
            }`}
          >
            Polymarket Strategies
          </button>
          <button
            onClick={() => setActiveTab('cross-platform')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'cross-platform'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-dark-text-muted hover:text-dark-text'
            }`}
          >
            Cross-Platform Arbitrage
          </button>
        </div>

        {/* Status Bar */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {(loading || polymarketLoading) && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-dark-text-muted">Loading markets...</span>
              </div>
            )}
            {!loading && !polymarketLoading && lastUpdate && (
              <div className="text-sm text-dark-text-muted">
                Last updated: {formatTime(lastUpdate)}
              </div>
            )}
            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
          </div>
          <button
            onClick={() => {
              if (activeTab === 'polymarket-only') {
                fetchPolymarketOpportunities()
              } else {
                fetchOpportunities()
              }
            }}
            disabled={loading || polymarketLoading}
            className="px-4 py-2 bg-dark-surface border border-dark-border rounded hover:bg-dark-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {(loading || polymarketLoading) ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>

        {/* Stats */}
        {activeTab === 'polymarket-only' && polymarketOpportunities.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-dark-surface border border-dark-border rounded-lg p-4">
              <div className="text-sm text-dark-text-muted mb-1">Opportunities</div>
              <div className="text-2xl font-bold text-dark-text">{polymarketOpportunities.length}</div>
            </div>
            <div className="bg-dark-surface border border-dark-border rounded-lg p-4">
              <div className="text-sm text-dark-text-muted mb-1">Best Profit</div>
              <div className="text-2xl font-bold text-green-500">
                +{polymarketOpportunities[0]?.profitPercent.toFixed(2)}%
              </div>
            </div>
            <div className="bg-dark-surface border border-dark-border rounded-lg p-4">
              <div className="text-sm text-dark-text-muted mb-1">Avg Profit</div>
              <div className="text-2xl font-bold text-dark-text">
                +{(
                  polymarketOpportunities.reduce((sum, opp) => sum + opp.profitPercent, 0) /
                  polymarketOpportunities.length
                ).toFixed(2)}%
              </div>
            </div>
            <div className="bg-dark-surface border border-dark-border rounded-lg p-4">
              <div className="text-sm text-dark-text-muted mb-1">Strategies</div>
              <div className="text-2xl font-bold text-dark-text">
                {new Set(polymarketOpportunities.map(o => o.strategy)).size}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cross-platform' && opportunities.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-surface border border-dark-border rounded-lg p-4">
              <div className="text-sm text-dark-text-muted mb-1">Opportunities Found</div>
              <div className="text-2xl font-bold text-dark-text">{opportunities.length}</div>
            </div>
            <div className="bg-dark-surface border border-dark-border rounded-lg p-4">
              <div className="text-sm text-dark-text-muted mb-1">Best Profit</div>
              <div className="text-2xl font-bold text-green-500">
                +{opportunities[0]?.profitAfterFees.toFixed(2)}%
              </div>
            </div>
            <div className="bg-dark-surface border border-dark-border rounded-lg p-4">
              <div className="text-sm text-dark-text-muted mb-1">Average Profit</div>
              <div className="text-2xl font-bold text-dark-text">
                +{(
                  opportunities.reduce((sum, opp) => sum + opp.profitAfterFees, 0) /
                  opportunities.length
                ).toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Opportunities Table */}
        <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-dark-border">
            <h2 className="text-xl font-semibold">
              {activeTab === 'polymarket-only' ? 'Polymarket Trading Strategies' : 'Cross-Platform Arbitrage Opportunities'}
            </h2>
            <p className="text-sm text-dark-text-muted mt-1">
              {activeTab === 'polymarket-only' 
                ? 'Spread trading, Yes/No arbitrage, and market making opportunities on Polymarket'
                : 'Arbitrage opportunities between Polymarket and Kalshi'}
              {' • '}Markets are automatically refreshed every 15 seconds
            </p>
          </div>
          <div className="p-4">
            {activeTab === 'polymarket-only' ? (
              polymarketLoading && polymarketOpportunities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-dark-text-muted">Scanning Polymarket markets...</p>
                </div>
              ) : (
                <PolymarketOpportunitiesTable opportunities={polymarketOpportunities} />
              )
            ) : (
              loading && opportunities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-dark-text-muted">Scanning markets...</p>
                </div>
              ) : (
                <OpportunitiesTable opportunities={opportunities} />
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-dark-text-muted">
          <p>
            Forkboard provides trading strategies for{' '}
            <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Polymarket
            </a>
            {' '}including spread trading, Yes/No arbitrage, and market making.
          </p>
          <p className="mt-2">
            Polymarket fees: 2% on winnings • Minimum liquidity: $1,000
          </p>
        </div>
      </div>
    </main>
  )
}

