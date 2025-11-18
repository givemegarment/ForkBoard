'use client'

import { useEffect, useState } from 'react'
import { ArbitrageOpportunity } from '@/lib/types'
import OpportunitiesTable from '@/components/OpportunitiesTable'

export default function Home() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    // Initial fetch
    fetchOpportunities()

    // Set up auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchOpportunities()
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
            Arbitrage Scanner for Polymarket & Kalshi
          </p>
        </div>

        {/* Status Bar */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-dark-text-muted">Loading markets...</span>
              </div>
            )}
            {!loading && lastUpdate && (
              <div className="text-sm text-dark-text-muted">
                Last updated: {formatTime(lastUpdate)}
              </div>
            )}
            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
          </div>
          <button
            onClick={fetchOpportunities}
            disabled={loading}
            className="px-4 py-2 bg-dark-surface border border-dark-border rounded hover:bg-dark-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>

        {/* Stats */}
        {opportunities.length > 0 && (
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
            <h2 className="text-xl font-semibold">Arbitrage Opportunities</h2>
            <p className="text-sm text-dark-text-muted mt-1">
              Markets are automatically refreshed every 15 seconds
            </p>
          </div>
          <div className="p-4">
            {loading && opportunities.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-dark-text-muted">Scanning markets...</p>
              </div>
            ) : (
              <OpportunitiesTable opportunities={opportunities} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-dark-text-muted">
          <p>
            Forkboard scans binary markets from{' '}
            <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Polymarket
            </a>{' '}
            and{' '}
            <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
              Kalshi
            </a>
            {' '}for arbitrage opportunities.
          </p>
          <p className="mt-2">
            Fees: Kalshi 0.7% • Polymarket 2% on winnings
          </p>
        </div>
      </div>
    </main>
  )
}

