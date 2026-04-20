'use strict';

// ─── Math helpers ─────────────────────────────────────────────────────────────

function normCDF(x) {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function bsCall(S, K, r, sigma, T) {
  if (T <= 0) return Math.max(S - K, 0);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
}

function bsPut(S, K, r, sigma, T) {
  return bsCall(S, K, r, sigma, T) - S + K * Math.exp(-r * T);
}

function r2(x) { return Math.round(x * 100) / 100; }

const S  = 100;
const R  = 0.05;
const SG = 0.25; // vol used for generating fair prices (not shown to player)

// ─── Round generators ─────────────────────────────────────────────────────────

function pickDTE() { return Math.random() < 0.5 ? 30 : 60; }
function pickK(offset = 0) {
  const opts = [-10, -5, 0, 5, 10];
  return S + opts[Math.floor(Math.random() * opts.length)] + offset;
}

function generateParityRound(hasArb) {
  const K   = pickK();
  const dte = pickDTE();
  const T   = dte / 365;
  let C = r2(bsCall(S, K, R, SG, T));
  let P = r2(bsPut(S, K, R, SG, T));
  const bondPV = r2(K * Math.exp(-R * T));

  if (hasArb) {
    const perturb = r2(0.50 + Math.random() * 2.50);
    if (Math.random() < 0.5) C = r2(C + perturb); // call rich
    else                      P = r2(P + perturb); // put rich
  }

  return {
    type: 'parity', typeName: 'Put-Call Parity', hasArb, T,
    instruments: [
      { id:'call', label:`Call  K=$${K}`,  price:C,      itype:'call', K, T, dte },
      { id:'put',  label:`Put   K=$${K}`,  price:P,      itype:'put',  K, T, dte },
      { id:'stock',label:'Underlying',           price:S,      itype:'stock',K:null,T:null, dte:null },
    ],
  };
}

function generateSpreadRound(hasArb) {
  const K1  = S + [-10, -5][Math.floor(Math.random() * 2)];
  const K2  = K1 + 10;
  const dte = pickDTE();
  const T   = dte / 365;
  let C1 = r2(bsCall(S, K1, R, SG, T));
  let C2 = r2(bsCall(S, K2, R, SG, T));
  const upperBound = r2((K2 - K1) * Math.exp(-R * T));

  if (hasArb) {
    // Make spread > upper bound: C1 - C2 > K2 - K1
    const excess = r2(0.50 + Math.random() * 1.50);
    C1 = r2(C2 + upperBound + excess);
  }

  return {
    type: 'spread', typeName: 'Vertical Spread Bounds', hasArb, T,
    instruments: [
      { id:'call_k1', label:`Call  K=$${K1}`,      price:C1,         itype:'call', K:K1, T, dte },
      { id:'call_k2', label:`Call  K=$${K2}`,      price:C2,         itype:'call', K:K2, T, dte },
      { id:'stock',   label:'Underlying',                price:S,          itype:'stock',K:null,T:null, dte:null },
    ],
  };
}

function generateButterflyRound(hasArb) {
  const width = 5;
  const K1 = S - width, K2 = S, K3 = S + width;
  const dte = pickDTE();
  const T   = dte / 365;
  let C1 = r2(bsCall(S, K1, R, SG, T));
  let C2 = r2(bsCall(S, K2, R, SG, T));
  let C3 = r2(bsCall(S, K3, R, SG, T));

  if (hasArb) {
    // C2 > (C1+C3)/2 → buy butterfly receives money + non-negative payoff
    const excess = r2(0.30 + Math.random() * 1.00);
    C2 = r2((C1 + C3) / 2 + excess);
  }

  return {
    type: 'butterfly', typeName: 'Butterfly / Convexity', hasArb, T,
    instruments: [
      { id:'call_k1', label:`Call  K=$${K1}`, price:C1, itype:'call', K:K1, T, dte },
      { id:'call_k2', label:`Call  K=$${K2}`, price:C2, itype:'call', K:K2, T, dte },
      { id:'call_k3', label:`Call  K=$${K3}`, price:C3, itype:'call', K:K3, T, dte },
      { id:'stock',   label:'Underlying',           price:S,  itype:'stock',K:null,T:null, dte:null },
    ],
  };
}

function generateBoxRound(hasArb) {
  const K1  = S + [-10, -5][Math.floor(Math.random() * 2)];
  const K2  = K1 + 10;
  const dte = pickDTE();
  const T   = dte / 365;
  let C1 = r2(bsCall(S, K1, R, SG, T));
  let C2 = r2(bsCall(S, K2, R, SG, T));
  let P1 = r2(bsPut(S,  K1, R, SG, T));
  let P2 = r2(bsPut(S,  K2, R, SG, T));

  if (hasArb) {
    const perturb = r2(0.50 + Math.random() * 2.00);
    // Either make box overpriced or underpriced
    if (Math.random() < 0.5) {
      C1 = r2(C1 + perturb); // C1 rich → box overpriced → sell box
    } else {
      C2 = r2(C2 + perturb); // C2 rich → box underpriced → buy box
    }
  }

  return {
    type: 'box', typeName: 'Box Spread', hasArb, T,
    instruments: [
      { id:'call_k1', label:`Call  K=$${K1}`, price:C1, itype:'call', K:K1, T, dte },
      { id:'call_k2', label:`Call  K=$${K2}`, price:C2, itype:'call', K:K2, T, dte },
      { id:'put_k1',  label:`Put   K=$${K1}`, price:P1, itype:'put',  K:K1, T, dte },
      { id:'put_k2',  label:`Put   K=$${K2}`, price:P2, itype:'put',  K:K2, T, dte },
    ],
  };
}

// ─── Round generator ──────────────────────────────────────────────────────────

const GENERATORS = {
  parity:    generateParityRound,
  spread:    generateSpreadRound,
  butterfly: generateButterflyRound,
  box:       generateBoxRound,
};

function generateRound(enabledTypes) {
  const type = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
  const hasArb = Math.random() < 0.70;
  return GENERATORS[type](hasArb);
}

// ─── Payoff validator ─────────────────────────────────────────────────────────

// legs: [{ instrumentId, qty, action }]  action: 'buy'|'sell'|'lend'|'borrow'|'none'
function validateTrade(legs, instruments) {
  const instMap = {};
  instruments.forEach(i => instMap[i.id] = i);

  // Filter out 'none' legs
  const active = legs.filter(l => l.action !== 'none' && l.qty > 0);
  if (active.length === 0) return false;

  // Compute initial cash flow
  let initCF = 0;
  for (const leg of active) {
    const inst = instMap[leg.instrumentId];
    // buy/lend = pay (negative CF), sell/borrow = receive (positive CF)
    const sign = (leg.action === 'buy' || leg.action === 'lend') ? -1 : 1;
    initCF += sign * leg.qty * inst.price;
  }

  // Compute net PnL across stock price scenarios
  const scenarios = [];
  for (let st = 0; st <= 3 * S; st += 2) scenarios.push(st);

  let allNonNeg = true;
  let somePositive = false;
  const TOL = 0.01;

  for (const ST of scenarios) {
    let terminal = 0;
    for (const leg of active) {
      const inst = instMap[leg.instrumentId];
      const dir = (leg.action === 'buy' || leg.action === 'lend') ? 1 : -1;
      let payoff;
      switch (inst.itype) {
        case 'call':  payoff = Math.max(ST - inst.K, 0); break;
        case 'put':   payoff = Math.max(inst.K - ST, 0); break;
        case 'stock': payoff = ST;                        break;
        case 'bond':  payoff = inst.K;                   break;
        default:      payoff = 0;
      }
      terminal += dir * leg.qty * payoff;
    }
    const pnl = initCF + terminal;
    if (pnl < -TOL)  allNonNeg = false;
    if (pnl >  TOL)  somePositive = true;
  }

  return allNonNeg && somePositive;
}

// ─── Game state ───────────────────────────────────────────────────────────────

let sessionDuration = 0, timeRemaining = 0, score = 0;
let timerInterval = null, currentRound = null;
let enabledTypes = ['parity'];

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const setupScreen  = document.getElementById('setup-screen');
const gameScreen   = document.getElementById('game-screen');
const endScreen    = document.getElementById('end-screen');
const timerWrap    = document.getElementById('timer-wrap');
const timerBar     = document.getElementById('timer-bar');
const timerLabel   = document.getElementById('timer-label');
const topBarRight  = document.getElementById('top-bar-right');
const scoreDisplay = document.getElementById('score-value');
const durationSel  = document.getElementById('duration-select');
const startBtn     = document.getElementById('start-btn');

const roundTypeLabel  = document.getElementById('round-type-label');
const priceTableBody  = document.getElementById('price-table-body');
const identifyBtns    = document.querySelectorAll('.identify-btn');
const tradeBuilder    = document.getElementById('trade-builder');
const tradeRows       = document.getElementById('trade-rows');
const submitTradeBtn  = document.getElementById('submit-trade-btn');
const feedbackEl      = document.getElementById('feedback');

const finalScoreEl = document.getElementById('final-score');
const lastRoundEl  = document.getElementById('last-round');
const playAgainBtn = document.getElementById('play-again-btn');

// ─── Setup ────────────────────────────────────────────────────────────────────


document.querySelectorAll('.arb-type-check').forEach(cb => {
  cb.addEventListener('change', () => {
    enabledTypes = [...document.querySelectorAll('.arb-type-check:checked')].map(c => c.value);
    startBtn.disabled = enabledTypes.length === 0;
  });
});

startBtn.addEventListener('click', startSession);

// ─── Session ──────────────────────────────────────────────────────────────────

function startSession() {
  sessionDuration = parseInt(durationSel.value, 10);
  timeRemaining = sessionDuration;
  score = 0;
  setupScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  timerWrap.classList.remove('hidden');
  timerLabel.classList.remove('hidden');
  topBarRight.classList.remove('hidden');
  updateScoreDisplay();
  updateTimerDisplay();
  loadNextRound();
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) endSession();
  }, 1000);
}

function updateTimerDisplay() {
  const pct = timeRemaining / sessionDuration;
  timerBar.style.width = (pct * 100) + '%';
  timerBar.classList.toggle('warning', pct < 0.2);
  const m = Math.floor(timeRemaining / 60);
  const s = timeRemaining % 60;
  timerLabel.textContent = m + ':' + String(s).padStart(2, '0') + ' remaining';
}

function updateScoreDisplay() { scoreDisplay.textContent = score; }

// ─── Round rendering ──────────────────────────────────────────────────────────

function loadNextRound() {
  currentRound = generateRound(enabledTypes);
  renderRound(currentRound);
  tradeBuilder.classList.add('hidden');
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  identifyBtns.forEach(b => b.disabled = false);
}

function renderRound(round) {
  roundTypeLabel.textContent = round.typeName;

  priceTableBody.innerHTML = '';
  priceTableBody.innerHTML += `<tr><td>Underlying</td><td>$${S}.00</td></tr>`;
  round.instruments.forEach(inst => {
    if (inst.itype === 'stock') return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${inst.label}</td><td>$${inst.price.toFixed(2)}</td>`;
    priceTableBody.appendChild(tr);
  });
}

// ─── Identify step ────────────────────────────────────────────────────────────

identifyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const playerSaysArb = btn.dataset.answer === 'arb';

    if (!playerSaysArb && !currentRound.hasArb) {
      // Correct: no arb
      score++;
      updateScoreDisplay();
      loadNextRound();
    } else if (playerSaysArb && currentRound.hasArb) {
      // Correct identification — show trade builder
      identifyBtns.forEach(b => b.disabled = true);
      showTradeBuilder(currentRound);
    } else {
      // Wrong
      feedbackEl.textContent = '✗ Try again.';
      feedbackEl.className = 'feedback wrong';
    }
  });
});

// ─── Trade builder ────────────────────────────────────────────────────────────

function showTradeBuilder(round) {
  tradeBuilder.classList.remove('hidden');
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  tradeRows.innerHTML = '';

  round.instruments.forEach(inst => {
    const row = document.createElement('div');
    row.className = 'trade-row';
    const actions = inst.itype === 'bond'
      ? [['lend','Lend'],['borrow','Borrow'],['none','−']]
      : [['buy','Buy'],['sell','Sell'],['none','−']];

    const btnHTML = actions.map(([val, label]) =>
      `<button class="action-btn${val === 'none' ? ' selected' : ''}" data-action="${val}">${label}</button>`
    ).join('');

    row.innerHTML =
      `<span class="trade-label">${inst.label}</span>` +
      `<input class="qty-input" type="number" min="1" max="10" value="1">` +
      `<div class="action-btn-group">${btnHTML}</div>`;

    // Toggle logic
    row.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        row.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    tradeRows.appendChild(row);
  });
}

submitTradeBtn.addEventListener('click', () => {
  const legs = [];
  const rows = tradeRows.querySelectorAll('.trade-row');
  currentRound.instruments.forEach((inst, i) => {
    const row = rows[i];
    const qty = parseInt(row.querySelector('.qty-input').value, 10) || 1;
    const action = row.querySelector('.action-btn.selected').dataset.action;
    legs.push({ instrumentId: inst.id, qty, action });
  });

  if (validateTrade(legs, currentRound.instruments)) {
    score++;
    updateScoreDisplay();
    loadNextRound();
  } else {
    feedbackEl.textContent = '✗ Try again.';
    feedbackEl.className = 'feedback wrong';
    // Reset trade builder
    showTradeBuilder(currentRound);
  }
});

// ─── End ──────────────────────────────────────────────────────────────────────

function endSession() {
  clearInterval(timerInterval);
  gameScreen.classList.add('hidden');
  timerWrap.classList.add('hidden');
  timerLabel.classList.add('hidden');
  endScreen.classList.remove('hidden');
  finalScoreEl.textContent = score;
  if (currentRound) {
    lastRoundEl.textContent = 'Last round: ' + (currentRound.hasArb ? 'arbitrage existed' : 'no arbitrage');
  }
}

playAgainBtn.addEventListener('click', () => {
  endScreen.classList.add('hidden');
  topBarRight.classList.add('hidden');
  setupScreen.classList.remove('hidden');
});
