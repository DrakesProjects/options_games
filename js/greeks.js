'use strict';

// ─── Black-Scholes ────────────────────────────────────────────────────────────

function normCDF(x) {
  // Abramowitz & Stegun approximation
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
  return 0.5 * (1 + sign * y);
}

function normPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Returns object with all Greek values for one leg (not yet signed by direction)
// type: 'call' or 'put', T in years
function bsGreeks(type, S, K, r, sigma, T) {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const phi = normPDF(d1);
  const Nd1 = normCDF(d1);
  const Nd2 = normCDF(d2);
  const Nm_d1 = normCDF(-d1);
  const Nm_d2 = normCDF(-d2);
  const eRT = Math.exp(-r * T);

  const delta = type === 'call' ? Nd1 : Nd1 - 1;
  const gamma = phi / (S * sigma * sqrtT);
  const vegaRaw = S * phi * sqrtT;                            // per unit vol
  const vega = vegaRaw / 100;                                 // per 1% vol move
  const theta = type === 'call'
    ? ((-S * phi * sigma / (2 * sqrtT)) - r * K * eRT * Nd2) / 365
    : ((-S * phi * sigma / (2 * sqrtT)) + r * K * eRT * Nm_d2) / 365;
  const rho = type === 'call'
    ?  K * T * eRT * Nd2  / 100
    : -K * T * eRT * Nm_d2 / 100;

  // Second-order
  const vanna = -phi * d2 / sigma;                            // dDelta/dVol
  // Charm: dDelta/dT  — call version; put negates the d2 term sign
  const charm = type === 'call'
    ? -phi * (2 * r * T - d2 * sigma * sqrtT) / (2 * T * sigma * sqrtT)
    : -phi * (2 * r * T - d2 * sigma * sqrtT) / (2 * T * sigma * sqrtT) + r * Nm_d1 / T;
  const speed  = -gamma * (d1 / (sigma * sqrtT) + 1) / S;
  const volga  = vega * d1 * d2 / sigma;                     // dVega/dVol
  // VegaDecay: dVega/dT
  const vegaDecay = vegaRaw * (d1 * d2 / (2 * T) - 1 / (2 * T)) / 100;
  const zomma  = gamma * (d1 * d2 - 1) / sigma;
  // Color: dGamma/dT
  const color  = -phi / (2 * S * T * sigma * sqrtT) *
    (2 * r * T + 1 + d1 * (2 * r * T - d2 * sigma * sqrtT) / (sigma * sqrtT));

  return { delta, gamma, theta, vega, rho, vanna, charm, speed, volga, vegaDecay, zomma, color };
}

// Sum Greeks across legs; underlying legs contribute only delta
function computeNetGreeks(legs) {
  const keys = ['delta','gamma','theta','vega','rho','vanna','charm','speed','volga','vegaDecay','zomma','color'];
  const net = {};
  keys.forEach(k => net[k] = 0);

  for (const leg of legs) {
    if (leg.type === 'underlying') {
      net.delta += leg.direction; // +1 or -1
      continue;
    }
    const T = leg.dte / 365;
    const g = bsGreeks(leg.type, leg.S, leg.K, leg.r, leg.sigma, T);
    keys.forEach(k => net[k] += g[k] * leg.direction);
  }
  return net;
}

function sign(val, threshold = 0.0001) {
  if (val > threshold)  return '+';
  if (val < -threshold) return '-';
  return '~0';
}

// ─── Position catalog (named mode) ───────────────────────────────────────────

const NAMED_POSITIONS = [
  { name: 'Long Call',        legs: 'Buy 1 call',
    greeks: { delta:'+', gamma:'+', theta:'-', vega:'+', rho:'+', vanna:'+', charm:'-', speed:'-', volga:'+', vegaDecay:'-', zomma:'-', color:'-' }},
  { name: 'Short Call',       legs: 'Sell 1 call',
    greeks: { delta:'-', gamma:'-', theta:'+', vega:'-', rho:'-', vanna:'-', charm:'+', speed:'+', volga:'-', vegaDecay:'+', zomma:'+', color:'+' }},
  { name: 'Long Put',         legs: 'Buy 1 put',
    greeks: { delta:'-', gamma:'+', theta:'-', vega:'+', rho:'-', vanna:'-', charm:'+', speed:'+', volga:'+', vegaDecay:'-', zomma:'+', color:'-' }},
  { name: 'Short Put',        legs: 'Sell 1 put',
    greeks: { delta:'+', gamma:'-', theta:'+', vega:'-', rho:'+', vanna:'+', charm:'-', speed:'-', volga:'-', vegaDecay:'+', zomma:'-', color:'+' }},
  { name: 'Long Underlying',  legs: 'Long underlying',
    greeks: { delta:'+', gamma:'~0', theta:'~0', vega:'~0', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'~0', vegaDecay:'~0', zomma:'~0', color:'~0' }},
  { name: 'Short Underlying', legs: 'Short underlying',
    greeks: { delta:'-', gamma:'~0', theta:'~0', vega:'~0', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'~0', vegaDecay:'~0', zomma:'~0', color:'~0' }},
  { name: 'Long Straddle',    legs: 'Buy 1 ATM call + buy 1 ATM put (same strike & expiry)',
    greeks: { delta:'~0', gamma:'+', theta:'-', vega:'+', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'+', vegaDecay:'-', zomma:'~0', color:'-' }},
  { name: 'Short Straddle',   legs: 'Sell 1 ATM call + sell 1 ATM put (same strike & expiry)',
    greeks: { delta:'~0', gamma:'-', theta:'+', vega:'-', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'-', vegaDecay:'+', zomma:'~0', color:'+' }},
  { name: 'Long Strangle',    legs: 'Buy 1 OTM call + buy 1 OTM put (same expiry)',
    greeks: { delta:'~0', gamma:'+', theta:'-', vega:'+', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'+', vegaDecay:'-', zomma:'~0', color:'-' }},
  { name: 'Short Strangle',   legs: 'Sell 1 OTM call + sell 1 OTM put (same expiry)',
    greeks: { delta:'~0', gamma:'-', theta:'+', vega:'-', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'-', vegaDecay:'+', zomma:'~0', color:'+' }},
  { name: 'Bull Call Spread', legs: 'Buy lower-strike call + sell higher-strike call (same expiry)',
    greeks: { delta:'+', gamma:'+', theta:'-', vega:'+', rho:'+', vanna:'+', charm:'-', speed:'-', volga:'+', vegaDecay:'-', zomma:'-', color:'-' }},
  { name: 'Bear Call Spread', legs: 'Sell lower-strike call + buy higher-strike call (same expiry)',
    greeks: { delta:'-', gamma:'-', theta:'+', vega:'-', rho:'-', vanna:'-', charm:'+', speed:'+', volga:'-', vegaDecay:'+', zomma:'+', color:'+' }},
  { name: 'Bull Put Spread',  legs: 'Sell higher-strike put + buy lower-strike put (same expiry)',
    greeks: { delta:'+', gamma:'-', theta:'+', vega:'-', rho:'+', vanna:'+', charm:'-', speed:'-', volga:'-', vegaDecay:'+', zomma:'-', color:'+' }},
  { name: 'Bear Put Spread',  legs: 'Buy higher-strike put + sell lower-strike put (same expiry)',
    greeks: { delta:'-', gamma:'+', theta:'-', vega:'+', rho:'-', vanna:'-', charm:'+', speed:'+', volga:'+', vegaDecay:'-', zomma:'+', color:'-' }},
  { name: 'Covered Call',     legs: 'Long underlying + sell 1 call',
    greeks: { delta:'+', gamma:'-', theta:'+', vega:'-', rho:'+', vanna:'-', charm:'+', speed:'+', volga:'-', vegaDecay:'+', zomma:'+', color:'+' }},
  { name: 'Protective Put',   legs: 'Long underlying + buy 1 put',
    greeks: { delta:'+', gamma:'+', theta:'-', vega:'+', rho:'+', vanna:'-', charm:'-', speed:'-', volga:'+', vegaDecay:'-', zomma:'+', color:'-' }},
  { name: 'Long Butterfly',   legs: 'Buy 1 low-strike call, sell 2 ATM calls, buy 1 high-strike call',
    greeks: { delta:'~0', gamma:'-', theta:'+', vega:'-', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'-', vegaDecay:'+', zomma:'~0', color:'+' }},
  { name: 'Short Butterfly',  legs: 'Sell 1 low-strike call, buy 2 ATM calls, sell 1 high-strike call',
    greeks: { delta:'~0', gamma:'+', theta:'-', vega:'+', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'+', vegaDecay:'-', zomma:'~0', color:'-' }},
  { name: 'Short Iron Condor', legs: 'Sell OTM call spread + sell OTM put spread',
    greeks: { delta:'~0', gamma:'-', theta:'+', vega:'-', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'-', vegaDecay:'+', zomma:'~0', color:'+' }},
  { name: 'Long Iron Condor', legs: 'Buy OTM call spread + buy OTM put spread',
    greeks: { delta:'~0', gamma:'+', theta:'-', vega:'+', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'+', vegaDecay:'-', zomma:'~0', color:'-' }},
  { name: 'Long Calendar',    legs: 'Buy far-dated ATM option + sell near-dated ATM option (same strike)',
    greeks: { delta:'~0', gamma:'-', theta:'+', vega:'+', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'+', vegaDecay:'~0', zomma:'~0', color:'~0' }},
  { name: 'Short Calendar',   legs: 'Sell far-dated ATM option + buy near-dated ATM option (same strike)',
    greeks: { delta:'~0', gamma:'+', theta:'-', vega:'-', rho:'~0', vanna:'~0', charm:'~0', speed:'~0', volga:'-', vegaDecay:'~0', zomma:'~0', color:'~0' }},
];

// ─── Greek metadata ───────────────────────────────────────────────────────────

const GREEK_META = [
  { key: 'delta',     label: 'Delta',      customOk: true  },
  { key: 'gamma',     label: 'Gamma',      customOk: true  },
  { key: 'theta',     label: 'Theta',      customOk: true  },
  { key: 'vega',      label: 'Vega',       customOk: true  },
  { key: 'rho',       label: 'Rho',        customOk: true  },
  { key: 'vanna',     label: 'Vanna',      customOk: true  },
  { key: 'charm',     label: 'Charm',      customOk: true  },
  { key: 'speed',     label: 'Speed',      customOk: false },
  { key: 'volga',     label: 'Volga',      customOk: true  },
  { key: 'vegaDecay', label: 'Vega Decay', customOk: true  },
  { key: 'zomma',     label: 'Zomma',      customOk: false },
  { key: 'color',     label: 'Color',      customOk: false },
];

const GREEK_BY_KEY = {};
GREEK_META.forEach(g => GREEK_BY_KEY[g.key] = g);

// ─── Custom question generator ────────────────────────────────────────────────

const LEG_TYPES = ['call','call','put','put','underlying','underlying'];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }

function generateCustomQuestion(selectedKeys, customOkKeys, n) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const S = 100;
    const r = 0.05;
    const dte1 = 30;
    const dte2 = 60;
    const useTwoExpiries = Math.random() < 0.5;

    const numLegs = randInt(2, 4);
    const legs = [];

    for (let i = 0; i < numLegs; i++) {
      const type = pick(LEG_TYPES);
      const direction = Math.random() < 0.5 ? 1 : -1;
      if (type === 'underlying') {
        legs.push({ type: 'underlying', direction, S, displayLabel: (direction > 0 ? 'Long' : 'Short') + ' Underlying' });
      } else {
        const K = randInt(S - 15, S + 15);
        const sigma = Math.round(randFloat(0.15, 0.45) * 100) / 100;
        const dte = useTwoExpiries ? pick([dte1, dte2]) : dte1;
        legs.push({ type, direction, S, K, r, sigma, dte,
          displayLabel: `${direction > 0 ? 'Long' : 'Short'} 1 ${type.charAt(0).toUpperCase() + type.slice(1)}   K=$${K}` });
      }
    }

    // Determine if option legs use more than one distinct DTE
    const optionDtes = [...new Set(legs.filter(l => l.type !== 'underlying').map(l => l.dte))];
    const multiExpiry = optionDtes.length > 1;
    if (multiExpiry) {
      legs.forEach(l => {
        if (l.type !== 'underlying') l.displayLabel += `  ${l.dte} DTE`;
      });
    }

    const net = computeNetGreeks(legs);

    const candidates = customOkKeys.filter(k => sign(net[k]) !== '~0');
    if (candidates.length === 0) continue;

    const pickedKeys = pickN(candidates, Math.min(n, candidates.length));
    return {
      mode: 'custom',
      legs,
      S, r,
      items: pickedKeys.map(k => ({ key: k, label: GREEK_BY_KEY[k].label, correctSign: sign(net[k]) })),
    };
  }
  return null; // signal to fall back to named
}

function generateNamedQuestion(selectedKeys, n) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const pos = pick(NAMED_POSITIONS);
    const candidates = selectedKeys.filter(k => pos.greeks[k] !== '~0');
    if (candidates.length === 0) continue;
    const pickedKeys = pickN(candidates, Math.min(n, candidates.length));
    return {
      mode: 'named',
      name: pos.name,
      legs: pos.legs,
      items: pickedKeys.map(k => ({ key: k, label: GREEK_BY_KEY[k].label, correctSign: pos.greeks[k] })),
    };
  }
  // absolute fallback
  const pos = NAMED_POSITIONS[0]; // Long Call
  const key = selectedKeys[0];
  return {
    mode: 'named',
    name: pos.name,
    legs: pos.legs,
    items: [{ key, label: GREEK_BY_KEY[key].label, correctSign: pos.greeks[key] }],
  };
}

// ─── Game state ───────────────────────────────────────────────────────────────

let sessionDuration = 0;
let timeRemaining = 0;
let score = 0;
let timerInterval = null;
let currentQuestion = null;
let selectedGreekKeys = ['delta','gamma','theta','vega'];
let selectedMode = 'named';
let greeksPerQuestion = '1';

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const setupScreen    = document.getElementById('setup-screen');
const gameScreen     = document.getElementById('game-screen');
const endScreen      = document.getElementById('end-screen');
const timerWrap      = document.getElementById('timer-wrap');
const timerBar       = document.getElementById('timer-bar');
const timerLabel     = document.getElementById('timer-label');
const topBarRight    = document.getElementById('top-bar-right');
const scoreDisplay   = document.getElementById('score-value');
const durationSelect = document.getElementById('duration-select');
const modeSelect     = document.getElementById('mode-select');
const batchSelect    = document.getElementById('batch-select');
const startBtn       = document.getElementById('start-btn');
const positionDisplay  = document.getElementById('position-display');
const greekItemsArea   = document.getElementById('greek-items-area');
const submitBtn      = document.getElementById('submit-btn');
const feedbackEl     = document.getElementById('feedback');
const finalScoreEl   = document.getElementById('final-score');
const lastAnswerEl   = document.getElementById('last-answer');
const playAgainBtn   = document.getElementById('play-again-btn');
const selectAllBtn   = document.getElementById('select-all-btn');

// ─── Setup ────────────────────────────────────────────────────────────────────

let selectedDuration = 120;

durationSelect.addEventListener('change', () => {
  selectedDuration = parseInt(durationSelect.value, 10);
});

const namedOnlyChecks = document.querySelectorAll('.greek-check[data-named-only]');

modeSelect.addEventListener('change', () => {
  selectedMode = modeSelect.value;
  const namedOnly = selectedMode === 'named';
  namedOnlyChecks.forEach(cb => {
    cb.disabled = !namedOnly;
    if (!namedOnly) cb.checked = false;
    cb.closest('label').classList.toggle('disabled-label', !namedOnly);
  });
  updateGreekSelection();
});

// Greek checkboxes
document.querySelectorAll('.greek-check').forEach(cb => {
  cb.addEventListener('change', updateGreekSelection);
});

function updateSelectAllBtn() {
  const enabled = [...document.querySelectorAll('.greek-check:not(:disabled)')];
  const allChecked = enabled.length > 0 && enabled.every(cb => cb.checked);
  selectAllBtn.textContent = allChecked ? 'Deselect All' : 'Select All';
}

function updateBatchSelect() {
  const count = selectedGreekKeys.length;
  const prev = greeksPerQuestion;

  batchSelect.innerHTML = '';
  for (const n of [1, 3, 5]) {
    if (n > count) break;
    const opt = document.createElement('option');
    opt.value = String(n);
    opt.textContent = String(n);
    batchSelect.appendChild(opt);
  }
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All';
  batchSelect.appendChild(allOpt);

  const validValues = [...batchSelect.options].map(o => o.value);
  batchSelect.value = validValues.includes(prev) ? prev : validValues[validValues.length - 2] ?? 'all';
  greeksPerQuestion = batchSelect.value;
}

function updateGreekSelection() {
  selectedGreekKeys = [];
  document.querySelectorAll('.greek-check:checked').forEach(cb => {
    selectedGreekKeys.push(cb.value);
  });
  startBtn.disabled = selectedGreekKeys.length === 0;
  updateSelectAllBtn();
  updateBatchSelect();
}

batchSelect.addEventListener('change', () => {
  greeksPerQuestion = batchSelect.value;
});

selectAllBtn.addEventListener('click', () => {
  const enabled = [...document.querySelectorAll('.greek-check:not(:disabled)')];
  const allChecked = enabled.every(cb => cb.checked);
  enabled.forEach(cb => { cb.checked = !allChecked; });
  updateGreekSelection();
});

updateSelectAllBtn();
updateBatchSelect();

startBtn.addEventListener('click', startSession);

// ─── Session ──────────────────────────────────────────────────────────────────

function startSession() {
  sessionDuration = selectedDuration;
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
  loadNextQuestion();
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

function updateScoreDisplay() {
  scoreDisplay.textContent = score;
}

// ─── Question flow ────────────────────────────────────────────────────────────

function customOkKeys() {
  return selectedGreekKeys.filter(k => GREEK_BY_KEY[k].customOk);
}

function resolveN() {
  return greeksPerQuestion === 'all' ? selectedGreekKeys.length : parseInt(greeksPerQuestion, 10);
}

function generateQuestion() {
  const n = resolveN();
  const useNamed  = selectedMode === 'named'  || selectedMode === 'both';
  const useCustom = selectedMode === 'custom' || selectedMode === 'both';
  const okForCustom = customOkKeys();

  if (useCustom && okForCustom.length > 0) {
    if (!useNamed || Math.random() < 0.5) {
      const q = generateCustomQuestion(selectedGreekKeys, okForCustom, n);
      if (q) return q;
    }
  }
  if (useNamed) return generateNamedQuestion(selectedGreekKeys, n);
  // last resort
  return generateNamedQuestion(selectedGreekKeys, n);
}

function loadNextQuestion() {
  currentQuestion = generateQuestion();
  renderQuestion(currentQuestion);
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  submitBtn.disabled = true;
}

function renderQuestion(q) {
  if (q.mode === 'named') {
    positionDisplay.innerHTML =
      `<div class="position-name">${q.name}</div>` +
      `<div class="position-legs">${q.legs}</div>`;
  } else {
    const legLines = q.legs.map(l => `<li>${l.displayLabel}</li>`).join('');
    positionDisplay.innerHTML =
      `<div class="position-params">Stock: $${q.S}</div>` +
      `<ul class="position-legs-list">${legLines}</ul>`;
  }

  greekItemsArea.innerHTML = '';
  for (const item of q.items) {
    const row = document.createElement('div');
    row.className = 'greek-item-row';
    row.dataset.key = item.key;
    row.innerHTML =
      `<div class="greek-item-label">${item.label}</div>` +
      `<div class="sign-btn-group">` +
        `<button class="sign-btn" data-sign="-">−</button>` +
        `<button class="sign-btn" data-sign="~0">~0</button>` +
        `<button class="sign-btn" data-sign="+">+</button>` +
      `</div>`;
    row.querySelectorAll('.sign-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        row.querySelectorAll('.sign-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateSubmitState();
      });
    });
    greekItemsArea.appendChild(row);
  }
}

function updateSubmitState() {
  const rows = greekItemsArea.querySelectorAll('.greek-item-row');
  submitBtn.disabled = ![...rows].every(row => row.querySelector('.sign-btn.selected'));
}

// ─── Submit ───────────────────────────────────────────────────────────────────

submitBtn.addEventListener('click', checkAnswer);

function checkAnswer() {
  const rows = [...greekItemsArea.querySelectorAll('.greek-item-row')];

  let allCorrect = true;
  rows.forEach((row, i) => {
    const item = currentQuestion.items[i];
    const selected = row.querySelector('.sign-btn.selected');
    if (!selected || selected.dataset.sign !== item.correctSign) {
      allCorrect = false;
    }
  });

  if (allCorrect) {
    score += currentQuestion.items.length;
    updateScoreDisplay();
    loadNextQuestion();
  } else {
    rows.forEach((row, i) => {
      const item = currentQuestion.items[i];
      const selected = row.querySelector('.sign-btn.selected');
      const isCorrect = selected && selected.dataset.sign === item.correctSign;
      if (isCorrect) {
        // Lock correct rows so the player doesn't have to re-answer them
        row.classList.add('item-correct');
        row.querySelectorAll('.sign-btn').forEach(b => { b.disabled = true; });
      } else {
        // Clear wrong selection so the player can retry
        row.classList.remove('item-wrong');
        row.querySelectorAll('.sign-btn').forEach(b => b.classList.remove('selected'));
      }
    });
    feedbackEl.textContent = '✗ Try again.';
    feedbackEl.className = 'feedback wrong';
    updateSubmitState();
  }
}

// ─── End ──────────────────────────────────────────────────────────────────────

function endSession() {
  clearInterval(timerInterval);
  gameScreen.classList.add('hidden');
  timerWrap.classList.add('hidden');
  timerLabel.classList.add('hidden');
  endScreen.classList.remove('hidden');
  finalScoreEl.textContent = score;
  if (currentQuestion && currentQuestion.items.length === 1) {
    lastAnswerEl.textContent =
      currentQuestion.items[0].label + ' was: ' + currentQuestion.items[0].correctSign;
  } else {
    lastAnswerEl.textContent = '';
  }
}

playAgainBtn.addEventListener('click', () => {
  endScreen.classList.add('hidden');
  topBarRight.classList.add('hidden');
  setupScreen.classList.remove('hidden');
});
