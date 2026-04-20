# options_games

A series of games for improving intuition for working with options

## Games

### Put-Call Parity

A sprint game played in timed sessions (1–60 minutes). Each round gives you 3 of 4 values — Underlying (S), Strike (K), Call (C), Put (P) — or derived values like Straddle (C+P) or Synthetic (C−P) — and asks you to solve for the missing one.

The correct answer rearranges the identity **C − P = S − K** (assuming zero rates and no dividends). Any answer within ±$0.05 of the exact value is accepted.

### Position Risks

Given a position — either a named strategy (e.g. Long Straddle, Short Iron Condor) or a randomly generated multi-leg position — identify the sign (+, −, or ~0) of a specified Greek.

Named positions are checked against a pre-computed lookup table of Greek signs. Random positions are evaluated by computing each Greek analytically via Black-Scholes for every leg, summing across the position, and classifying the net value as positive, negative, or approximately zero (threshold: 0.0001).

### Arbitrage

A two-phase game. In phase 1, decide whether an arbitrage opportunity exists in the presented option prices (Arb / No Arb). In phase 2, if you identify arb, construct a trade using a leg builder (Buy, Sell, Lend, or Borrow each instrument).

Prices are generated with a 70% chance of containing arb, introduced by perturbing one price to violate a no-arbitrage condition: Put-Call Parity, Vertical Spread Bounds, Convexity/Butterfly, or Box Spread. Your trade is validated by simulating payoffs across stock price scenarios from $0 to 3×S; it must be non-negative everywhere and strictly positive somewhere (tolerance ±$0.01).
