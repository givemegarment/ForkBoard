'use client'

import { ArbitrageOpportunity } from '@/lib/types'
import { calculateOptimalStakes } from '@/lib/arbitrage'
import { useState } from 'react'

interface ArbitrageCalculatorProps {
  opportunity: ArbitrageOpportunity
  isOpen: boolean
  onClose: () => void
}

export default function ArbitrageCalculator({
  opportunity,
  isOpen,
  onClose,
}: ArbitrageCalculatorProps) {
  const [bankroll, setBankroll] = useState<string>('1000')

  if (!isOpen) return null

  const bankrollNum = parseFloat(bankroll) || 0
  const stakes = bankrollNum > 0 
    ? calculateOptimalStakes(bankrollNum, opportunity)
    : { polymarketStake: 0, kalshiStake: 0, totalProfit: 0 }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-dark-surface border border-dark-border rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-dark-text">Arbitrage Calculator</h2>
          <button
            onClick={onClose}
            className="text-dark-text-muted hover:text-dark-text transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-dark-text-muted mb-2">{opportunity.eventName}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-dark-text-muted">Polymarket Yes:</span>
              <span className="ml-2 text-dark-text font-medium">
                {(opportunity.polymarketYesPrice * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-dark-text-muted">Kalshi Yes:</span>
              <span className="ml-2 text-dark-text font-medium">
                {(opportunity.kalshiYesPrice * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-dark-text-muted">Profit After Fees:</span>
              <span className="ml-2 text-green-500 font-semibold">
                +{opportunity.profitAfterFees.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-dark-text-muted mb-2">
            Bankroll ($)
          </label>
          <input
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter bankroll amount"
            min="0"
            step="0.01"
          />
        </div>

        {bankrollNum > 0 && (
          <div className="bg-dark-bg border border-dark-border rounded p-4 mb-4">
            <h3 className="text-sm font-semibold text-dark-text-muted mb-3">Optimal Allocation</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-text-muted">Polymarket Stake:</span>
                <span className="text-dark-text font-medium">
                  ${stakes.polymarketStake.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-text-muted">Kalshi Stake:</span>
                <span className="text-dark-text font-medium">
                  ${stakes.kalshiStake.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-dark-border">
                <span className="text-dark-text font-semibold">Total Profit:</span>
                <span className="text-green-500 font-bold">
                  ${stakes.totalProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <a
            href={opportunity.polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded transition-colors"
          >
            View on Polymarket
          </a>
          <a
            href={opportunity.kalshiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-center rounded transition-colors"
          >
            View on Kalshi
          </a>
        </div>
      </div>
    </div>
  )
}

