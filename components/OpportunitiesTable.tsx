'use client'

import { ArbitrageOpportunity } from '@/lib/types'
import { useState } from 'react'
import ArbitrageCalculator from './ArbitrageCalculator'

interface OpportunitiesTableProps {
  opportunities: ArbitrageOpportunity[]
}

export default function OpportunitiesTable({ opportunities }: OpportunitiesTableProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)

  const formatPrice = (price: number) => {
    return (price * 100).toFixed(2) + '%'
  }

  const formatPercentage = (value: number) => {
    return value.toFixed(2) + '%'
  }

  const handleCalculatorClick = (opp: ArbitrageOpportunity) => {
    setSelectedOpportunity(opp)
    setIsCalculatorOpen(true)
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-12 text-dark-text-muted">
        <p className="text-lg">No arbitrage opportunities found</p>
        <p className="text-sm mt-2">Markets are being scanned...</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Event
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Polymarket Yes
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Kalshi Yes
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Spread
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Profit (After Fees)
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-dark-text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp, index) => (
              <tr
                key={`${opp.polymarketId}-${opp.kalshiId}`}
                className="border-b border-dark-border hover:bg-dark-surface/50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="font-medium text-dark-text">{opp.eventName}</div>
                </td>
                <td className="py-4 px-4 text-right text-dark-text">
                  {formatPrice(opp.polymarketYesPrice)}
                </td>
                <td className="py-4 px-4 text-right text-dark-text">
                  {formatPrice(opp.kalshiYesPrice)}
                </td>
                <td className="py-4 px-4 text-right text-dark-text">
                  {formatPercentage(opp.spread)}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-semibold text-green-500">
                    +{formatPercentage(opp.profitAfterFees)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <a
                      href={opp.polymarketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      View on Polymarket
                    </a>
                    <a
                      href={opp.kalshiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                    >
                      View on Kalshi
                    </a>
                    <button
                      onClick={() => handleCalculatorClick(opp)}
                      className="px-3 py-1.5 text-xs font-medium bg-dark-border hover:bg-dark-border/80 text-dark-text rounded transition-colors"
                    >
                      Calculator
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCalculatorOpen && selectedOpportunity && (
        <ArbitrageCalculator
          opportunity={selectedOpportunity}
          isOpen={isCalculatorOpen}
          onClose={() => {
            setIsCalculatorOpen(false)
            setSelectedOpportunity(null)
          }}
        />
      )}
    </>
  )
}

