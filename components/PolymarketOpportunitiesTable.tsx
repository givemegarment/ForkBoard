'use client'

import { PolymarketStrategyOpportunity } from '@/lib/types'
import { useState } from 'react'

interface PolymarketOpportunitiesTableProps {
  opportunities: PolymarketStrategyOpportunity[]
}

export default function PolymarketOpportunitiesTable({ opportunities }: PolymarketOpportunitiesTableProps) {
  const [executing, setExecuting] = useState<string | null>(null)

  const formatPrice = (price: number) => {
    return (price * 100).toFixed(2) + '%'
  }

  const formatPercentage = (value: number) => {
    return value.toFixed(2) + '%'
  }

  const formatCurrency = (value: number) => {
    return '$' + value.toFixed(2)
  }

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'spread_trading':
        return 'Spread Trading'
      case 'yes_no_arbitrage':
        return 'Yes/No Arbitrage'
      case 'market_making':
        return 'Market Making'
      case 'volatility_breakout':
        return 'Volatility Breakout'
      case 'volume_momentum':
        return 'Volume Momentum'
      case 'mean_reversion':
        return 'Mean Reversion'
      case 'volatility_expansion':
        return 'Volatility Expansion'
      case 'volume_spike':
        return 'Volume Spike'
      default:
        return strategy
    }
  }

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'spread_trading':
        return 'bg-blue-600 hover:bg-blue-700'
      case 'yes_no_arbitrage':
        return 'bg-green-600 hover:bg-green-700'
      case 'market_making':
        return 'bg-purple-600 hover:bg-purple-700'
      case 'volatility_breakout':
        return 'bg-orange-600 hover:bg-orange-700'
      case 'volume_momentum':
        return 'bg-cyan-600 hover:bg-cyan-700'
      case 'mean_reversion':
        return 'bg-pink-600 hover:bg-pink-700'
      case 'volatility_expansion':
        return 'bg-red-600 hover:bg-red-700'
      case 'volume_spike':
        return 'bg-yellow-600 hover:bg-yellow-700'
      default:
        return 'bg-gray-600 hover:bg-gray-700'
    }
  }

  const handleExecuteTrade = async (opp: PolymarketStrategyOpportunity) => {
    if (!opp.tokenId) {
      alert('Missing token ID. Cannot execute trade.')
      return
    }

    setExecuting(opp.id)

    try {
      const response = await fetch('/api/polymarket-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunity: opp,
          size: opp.recommendedSize,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Trade executed successfully! Order ID: ${data.result.polymarketTrade?.orderId || 'N/A'}`)
      } else {
        alert(`Trade failed: ${data.result?.error || data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error executing trade:', error)
      alert('Failed to execute trade. Please check console for details.')
    } finally {
      setExecuting(null)
    }
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-12 text-dark-text-muted">
        <p className="text-lg">No Polymarket opportunities found</p>
        <p className="text-sm mt-2">Markets are being scanned...</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text-muted">
              Strategy
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text-muted">
              Event
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
              Yes Bid/Ask
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
              No Bid/Ask
            </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Spread
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Volatility
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Volume Rank
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Profit %
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Liquidity
              </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-dark-text-muted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => (
            <tr
              key={opp.id}
              className="border-b border-dark-border hover:bg-dark-surface/50 transition-colors"
            >
              <td className="py-4 px-4">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStrategyColor(opp.strategy)} text-white`}>
                  {getStrategyLabel(opp.strategy)}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="font-medium text-dark-text max-w-xs truncate" title={opp.eventName}>
                  {opp.eventName}
                </div>
                {opp.strategy === 'yes_no_arbitrage' && (
                  <div className="text-xs text-dark-text-muted mt-1">
                    Gap: {formatPercentage(opp.arbitrageGap * 100)}
                  </div>
                )}
              </td>
              <td className="py-4 px-4 text-right text-dark-text">
                <div className="text-sm">
                  <span className="text-green-500">{formatPrice(opp.yesBid)}</span>
                  {' / '}
                  <span className="text-red-500">{formatPrice(opp.yesAsk)}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right text-dark-text">
                <div className="text-sm">
                  <span className="text-green-500">{formatPrice(opp.noBid)}</span>
                  {' / '}
                  <span className="text-red-500">{formatPrice(opp.noAsk)}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right text-dark-text">
                {formatPercentage(opp.spreadPercent)}
              </td>
              <td className="py-4 px-4 text-right text-dark-text text-sm">
                {opp.volatility !== undefined ? formatPercentage(opp.volatility * 100) : 'N/A'}
              </td>
              <td className="py-4 px-4 text-right text-dark-text text-sm">
                {opp.volumeRank ? (
                  <span className={opp.volumeRank <= 10 ? 'text-green-500 font-semibold' : ''}>
                    #{opp.volumeRank}
                  </span>
                ) : 'N/A'}
              </td>
              <td className="py-4 px-4 text-right">
                <span className="font-semibold text-green-500">
                  +{formatPercentage(opp.profitPercent)}
                </span>
              </td>
              <td className="py-4 px-4 text-right text-dark-text text-sm">
                {formatCurrency(opp.liquidity)}
                {!opp.minLiquidity && (
                  <div className="text-xs text-yellow-500">Low</div>
                )}
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-center gap-2">
                  <a
                    href={opp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleExecuteTrade(opp)}
                    disabled={executing === opp.id || !opp.tokenId}
                    className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {executing === opp.id ? 'Executing...' : 'Trade'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

