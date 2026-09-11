# Options Games

Timed exercises for building options intuition. Open `index.html` in a browser; no install or build required.

## Games

- **Put-Call Parity:** solve for Call, Put, Straddle, B/W, or P&S. Straddle and B/W + P&S questions can be toggled in settings.
- **PCP 2:** broader structure relationships, including verticals, strangles, time spreads, flies, and swaps. Medium has 63 families / 209 question variants; Hard combines three relationships per family, with 120 families / 794 variants. Every quantity can be the unknown. Medium shows 6 given quotes and Hard 9, each including at least two irrelevant structures that cannot replace the required clues.
- **Position Risks:** identify Greek signs (+, −, or ~0) for named strategies or random multi-leg positions. Named strategies use reference signs; random positions use Black–Scholes Greeks.

Both PCP games sample uniformly across question variants and shuffle rows. Answers must match to the cent: correct answers advance immediately; incorrect answers allow retries.

All games offer 1, 2, 5, 10, 15, 30, or 60-minute sessions. Completed nonzero-score runs are saved locally as answers per minute, with history below settings and a **Clear all** control.

## PCP conventions

- `C − P = S − K + r/c`; parity is `S − K`.
- Straddle = `C + P`; B/W = `P + r/c`; P&S = `C − r/c`.
- Generated prices are cent-exact, with Put between $0–$20 and r/c between −$0.10–$3.00.
- PCP 2 rows read time → strike(s) → name → c/o or p/o → price. Single-strike/expiry labels are omitted; with multiple strikes/expirations, every applicable row is labeled. Strikes follow `K₁ > K₂ > K₃` and expirations `T₁ < T₂`; required equal spacing is stated.
- `K₁ − K₂ straddle swap` means long the first strike's straddle, short the second's.
- Combo/risky quotes use `c/o` or `p/o`; unknowns use signed c/o answers.

## Tests

PCP 2 checks cover exact algebra, required clues, distractors, price ranges, sampling, labels, and gameplay:

```sh
node --test tests/pcp2-bank.test.cjs tests/pcp2-interaction.test.cjs
```
