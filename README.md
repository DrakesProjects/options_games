# Options Games

Timed exercises for building options intuition. Open `index.html` in a browser; no install or build required.

## Layout

- **Home:** one card per game, showing your best answers-per-minute, how many runs you've completed, and the Lab's current problem area (PCP 2 shows Medium and Hard separately).
- **Game pages:** the setup screen has **Play** (settings), **Lab**, and **History** (past results) tabs. The tabs disappear during a run and come back, on the tab you left, when it ends.

## Games

- **Put-Call Parity:** solve for Call, Put, Straddle, B/W, or P&S. Straddle and B/W + P&S questions can be toggled in settings.
- **PCP 2:** broader structure relationships, including verticals, strangles, time spreads, flies, and swaps. Medium has 63 families / 209 question variants; Hard combines three relationships per family, with 120 families / 794 variants. Every quantity can be the unknown. Medium shows 6 given quotes and Hard 9, each including at least two irrelevant structures that cannot replace the required clues.
- **Position Risks:** identify Greek signs (+, −, or ~0). Named mode uses PCP 2's 20 position types, long and short, with only component moneyness beneath each name. Greeks are calculated from the legs at the setup screen's fixed assumptions. A Greek counts as ~0 when it is under 1.25% of a typical single option's value for that Greek (the median over 90–110 strike calls and puts at both expirations), or when trading convention treats it as zero for that structure: ATM vanna; straddle and strangle delta, rho, and vanna; box theta; time-spread delta, vanna, and charm; and fly delta, rho, vanna, and charm. Each convention is checked to be under 15% of that typical value. Random/Both modes offer a maximum of 1–10 options (default 4); each random question uniformly samples 1 through that maximum, excluding optional stock.

- **Mental Math:** single-player arithmetic speed drill. Standard problems are `(2–100) + (2–100)`, subtraction as addition in reverse, `(2–12) × (2–100)`, and division as multiplication in reverse (dividing by the first factor), so answers are always positive whole numbers. Operations and both range pairs are editable, with **Reset to standard** and a light/dark theme. Correct answers advance as you type; wrong input gets no feedback. Enter skips, Space restarts, Esc quits (a quit or restarted run isn't saved); touch screens get a number pad. Accuracy is correct ÷ (correct + skips + wrong entries), where a wrong entry is reaching a full-length wrong answer. The end screen charts seconds per question; select a point for the problem, answer, and time. The **Lab** shows accuracy and average time for addition, subtraction, multiplication, and division over each one's last 200 questions, flags the operation with the most time per correct answer once at least two have 10+ questions, and offers target practice for one operation. Practice runs update the Lab and are not saved to past results or personal bests.

Both PCP games sample uniformly across question variants and shuffle rows. Answers must match to the cent: correct answers advance immediately; incorrect answers allow retries.

All games offer 1, 2, 5, 10, 15, 30, or 60-minute sessions. Completed nonzero-score runs are saved locally as answers per minute, shown on the **History** tab with a **Clear all** control.

## Lab

Every game has a **Lab** tab that tracks each answered question's time and wrong entries, rolls them into a few broad categories over each category's last 200, and flags a **Problem area** once at least two categories have 10+ records. Each row's **Practice** button runs only that category, even one turned off in settings; practice runs update the Lab but are not saved to past results. The question the timer cuts off is left out. Data is stored locally with a **Clear Lab** control.

- **Put-Call Parity:** by what you solve for: Call, Put, Straddle, B/W & P&S. Problem area = most time per question.
- **PCP 2:** by the most advanced structure in the question's relationship: Parity & combos, Verticals & boxes, Straddles & strangles, Time spreads, Flies. Medium and Hard keep separate Labs; Hard has no Parity & combos questions. Problem area = most time per question.
- **Position Risks:** by what moves: Spot (delta, gamma, speed), Time (theta, charm, color, vega decay), Volatility (vega, vanna, volga, zomma), Rates (rho). Each Greek answered is one record, sharing its question's time equally. Because a question's Greeks share one timer, the problem area is the lowest first-try accuracy. Practice includes speed, zomma, and color only in Named mode.
- **Mental Math:** see above.

Accuracy is correct ÷ (correct + wrong entries); a blank answer is asked for again rather than counted.

## PCP conventions

- `C − P = S − K + r/c`; parity is `S − K`.
- Straddle = `C + P`; B/W = `P + r/c`; P&S = `C − r/c`.
- Generated prices are cent-exact, with Put between $0–$20 and r/c between −$0.10–$3.00.
- PCP 2 rows read time → strike(s) → name → c/o or p/o → price. Single-strike/expiry labels are omitted; with multiple strikes/expirations, every applicable row is labeled. Strikes follow `K₁ > K₂ > K₃` and expirations `T₁ < T₂`; required equal spacing is stated.
- `K₁ − K₂ straddle swap` means long the first strike's straddle, short the second's.
- Cross-date labels use `T₁T₂` without a dash. Bought call/put time spreads are front minus back; jelly rolls are front combo minus back combo. All show their strike when multiple strikes appear, e.g. `T₁T₂ K₁ jelly roll`.
- Combo/risky quotes use `c/o` or `p/o`; unknowns use signed c/o answers.

## Tests

Checks cover PCP 2 algebra and gameplay, Put-Call Parity gameplay, Position Risks settings and option-count sampling, Mental Math problem generation, scoring, and gameplay, the Lab in every game, and the home page cards and setup tabs:

```sh
node --test tests/*.test.cjs
```
