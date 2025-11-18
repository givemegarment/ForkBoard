# Trading Strategies Guide

## Overview

Forkboard now includes **8 trading strategies** focused on finding profitable opportunities in high volatility and high volume markets on Polymarket.

## Strategy Types

### 1. **Volatility Breakout** 🟠
**Focus:** High volatility markets with price breakouts

**How it works:**
- Identifies markets with high volatility (>5% spread)
- Looks for prices breaking out from center (0.5) by >30%
- Trades in the direction of the breakout

**Best for:**
- Markets experiencing sudden price movements
- Events with high uncertainty
- Breaking news events

**Requirements:**
- Volume: >$5,000
- Volatility: >5%
- Price deviation: >30% from center

---

### 2. **Volume-Weighted Momentum** 🔵
**Focus:** High volume markets with strong price momentum

**How it works:**
- Targets markets with very high volume (>$50,000)
- Identifies strong price momentum (>30% from center)
- Requires tight spreads (<5%) for good execution

**Best for:**
- Popular, actively traded markets
- Markets with clear directional bias
- High-confidence trades

**Requirements:**
- Volume: >$50,000
- Momentum: >30% from center
- Spread: <5%

---

### 3. **High Volume Mean Reversion** 🩷
**Focus:** High volume markets that have deviated from fair value

**How it works:**
- Finds high volume markets (>$50,000)
- Identifies prices that have moved >15% from center (0.5)
- Trades expecting price to revert to mean

**Best for:**
- Overreaction scenarios
- Temporary price dislocations
- Markets returning to equilibrium

**Requirements:**
- Volume: >$50,000
- Price deviation: >15% from center
- Expects 40% reversion

---

### 4. **Volatility Expansion** 🔴
**Focus:** Markets with rapidly increasing volatility

**How it works:**
- Detects high volatility expansion (>8% spread)
- Trades in the direction of the wider spread side
- Captures volatility-driven price movements

**Best for:**
- Markets experiencing increased uncertainty
- Events approaching resolution
- Volatile market conditions

**Requirements:**
- Volume: >$5,000
- Volatility: >8% spread
- Good liquidity

---

### 5. **Volume Spike Trading** 🟡
**Focus:** Markets with unusually high volume relative to others

**How it works:**
- Identifies top 10% volume markets
- Trades in direction of price momentum
- Capitalizes on volume-driven movements

**Best for:**
- Trending markets
- High-interest events
- Markets with sudden attention

**Requirements:**
- Top 10% volume rank
- Volume: >$5,000
- Spread: <10%

---

## Strategy Comparison

| Strategy | Volume Focus | Volatility Focus | Risk Level | Best Market Type |
|----------|-------------|------------------|------------|------------------|
| Volatility Breakout | Medium | High | Medium-High | Breaking news |
| Volume Momentum | High | Low | Low-Medium | Popular markets |
| Mean Reversion | High | Medium | Medium | Overreactions |
| Volatility Expansion | Medium | Very High | High | Uncertain events |
| Volume Spike | Very High | Medium | Low-Medium | Trending markets |

## Strategy Selection Tips

### For High Volatility Events:
- ✅ Volatility Breakout
- ✅ Volatility Expansion
- ⚠️ Mean Reversion (if overreaction)

### For High Volume Events:
- ✅ Volume Momentum
- ✅ Volume Spike
- ✅ Mean Reversion

### For Trending Markets:
- ✅ Volume Momentum
- ✅ Volume Spike
- ✅ Volatility Breakout

### For Overreactions:
- ✅ Mean Reversion
- ⚠️ Volume Momentum (if continues)

## Metrics Explained

### Volatility
- **What:** Measure of price uncertainty (spread percentage)
- **High:** >8% = High volatility, more risk/reward
- **Low:** <3% = Low volatility, more stable

### Volume Rank
- **What:** Position among all markets by volume
- **Top 10:** Rank #1-10 = Very high volume
- **Top 100:** Rank #1-100 = High volume

### Momentum
- **What:** Direction and strength of price movement
- **Positive:** Price moving up (buy Yes)
- **Negative:** Price moving down (buy No)

### Price Deviation
- **What:** How far price is from center (0.5)
- **High:** >30% = Extreme position
- **Low:** <10% = Near center

## Risk Management

### All Strategies Include:
- ✅ Minimum liquidity requirements ($1,000+)
- ✅ Profit threshold after fees (0.3%+)
- ✅ Position sizing recommendations
- ✅ Fee calculations (2% Polymarket fee)

### Recommended Practices:
1. **Start Small:** Test with recommended position sizes
2. **Diversify:** Don't put all capital in one strategy
3. **Monitor:** Watch for changing market conditions
4. **Exit:** Set profit targets and stop losses
5. **Volume:** Prefer high volume markets for easier exits

## Performance Expectations

### Conservative Strategies:
- **Volume Momentum:** Lower risk, steady returns
- **Volume Spike:** Medium risk, good volume

### Aggressive Strategies:
- **Volatility Breakout:** Higher risk, higher reward
- **Volatility Expansion:** Very high risk, high reward

### Balanced Strategies:
- **Mean Reversion:** Medium risk, good for overreactions

## Strategy Filters

The scanner automatically filters opportunities by:
- ✅ Minimum volume thresholds
- ✅ Minimum liquidity requirements
- ✅ Profit after fees > 0.3%
- ✅ Market quality indicators

Only profitable opportunities meeting all criteria are shown.

---

**Note:** All strategies are designed for **read-only scanning**. Trading execution requires additional setup with private keys (not included in this scanner).

