// Put-Call Parity Sprint
// Identity: C - P = S - K  (zero rates, no dividends)

'use strict';

// ─── Question generator ────────────────────────────────────────────────────

const TEMPLATES = [
  {
    label: 'find-P',
    known: ['S', 'K', 'C'],
    hidden: 'P',
    solve: v => v.C - (v.S - v.K),
    hint: 'P = C − (S − K)',
  },
  {
    label: 'find-C',
    known: ['S', 'K', 'P'],
    hidden: 'C',
    solve: v => v.P + (v.S - v.K),
    hint: 'C = P + (S − K)',
  },
  {
    label: 'find-S',
    known: ['C', 'P', 'K'],
    hidden: 'S',
    solve: v => v.C - v.P + v.K,
    hint: 'S = C − P + K',
  },
  {
    label: 'find-K',
    known: ['C', 'P', 'S'],
    hidden: 'K',
    solve: v => v.S - v.C + v.P,
    hint: 'K = S − C + P',
  },
  {
    label: 'find-P-from-straddle',
    known: ['Straddle', 'C'],
    hidden: 'P',
    solve: v => v.Straddle - v.C,
    hint: 'P = Straddle − C',
  },
  {
    label: 'find-C-from-straddle',
    known: ['Straddle', 'P'],
    hidden: 'C',
    solve: v => v.Straddle - v.P,
    hint: 'C = Straddle − P',
  },
  {
    label: 'find-C-from-straddle-SK',
    known: ['Straddle', 'S', 'K'],
    hidden: 'C',
    // Straddle = C + P and C - P = S - K → C = (Straddle + S - K) / 2
    solve: v => (v.Straddle + v.S - v.K) / 2,
    hint: 'C = (Straddle + S − K) ÷ 2',
  },
  {
    label: 'find-P-from-straddle-SK',
    known: ['Straddle', 'S', 'K'],
    hidden: 'P',
    // P = (Straddle - (S - K)) / 2
    solve: v => (v.Straddle - (v.S - v.K)) / 2,
    hint: 'P = (Straddle − (S − K)) ÷ 2',
  },
  {
    label: 'find-P-from-synthetic',
    known: ['Synthetic', 'C'],
    hidden: 'P',
    // Synthetic = C - P → P = C - Synthetic
    solve: v => v.C - v.Synthetic,
    hint: 'P = C − Synthetic (where Synthetic = C − P = S − K)',
  },
  {
    label: 'find-C-from-synthetic',
    known: ['Synthetic', 'P'],
    hidden: 'C',
    solve: v => v.P + v.Synthetic,
    hint: 'C = P + Synthetic (where Synthetic = C − P = S − K)',
  },
  {
    label: 'find-S-from-synthetic',
    known: ['Synthetic', 'K'],
    hidden: 'S',
    solve: v => v.Synthetic + v.K,
    hint: 'S = Synthetic + K (where Synthetic = C − P = S − K)',
  },
  {
    label: 'find-K-from-synthetic',
    known: ['Synthetic', 'S'],
    hidden: 'K',
    solve: v => v.S - v.Synthetic,
    hint: 'K = S − Synthetic (where Synthetic = C − P = S − K)',
  },
];

const DISPLAY_NAMES = {
  S: 'Underlying',
  K: 'Strike',
  C: 'Call',
  P: 'Put',
  Straddle: 'Straddle',
  Synthetic: 'Synthetic',
};

function round2(x) {
  return Math.round(x * 100) / 100;
}

function generateQuestion() {
  // Try up to 20 times to get valid values
  for (let attempt = 0; attempt < 20; attempt++) {
    // Sample base values
    const S = Math.floor(Math.random() * 101) + 50; // 50–150
    const K = S + (Math.floor(Math.random() * 41) - 20); // S ± 20
    if (K <= 0) continue;

    // C must be >= max(S-K, 0) and some reasonable premium
    const intrinsic = Math.max(S - K, 0);
    // Add time value: 1–15 dollars
    const timeValue = round2(1 + Math.random() * 14);
    const C = round2(intrinsic + timeValue);
    const P = round2(C - (S - K)); // parity: P = C - (S - K)

    if (P <= 0) continue; // ensure positive put price

    const Straddle = round2(C + P);
    const Synthetic = round2(C - P); // = S - K

    const values = { S, K, C, P, Straddle, Synthetic };

    // Pick a template at random
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

    // Verify all known fields exist and are positive where expected
    const knownOk = template.known.every(k => values[k] !== undefined && (
      (k === 'Synthetic') ? true : values[k] > 0
    ));
    if (!knownOk) continue;

    const answer = round2(template.solve(values));
    if (!isFinite(answer) || answer <= 0) continue;

    return {
      template,
      values,
      answer,
      displayRows: buildDisplayRows(template, values),
    };
  }

  // Fallback to simplest template
  const S = 100, K = 100, C = 5.00, P = 5.00;
  const Straddle = 10.00, Synthetic = 0.00;
  const values = { S, K, C, P, Straddle, Synthetic };
  const template = TEMPLATES[0]; // find-P
  return {
    template,
    values,
    answer: round2(template.solve(values)),
    displayRows: buildDisplayRows(template, values),
  };
}

function buildDisplayRows(template, values) {
  const rows = [];
  for (const key of template.known) {
    rows.push({ label: DISPLAY_NAMES[key], value: fmt(values[key]), isUnknown: false });
  }
  rows.push({ label: DISPLAY_NAMES[template.hidden], value: '???', isUnknown: true });
  return rows;
}

function fmt(n) {
  return '$' + n.toFixed(2);
}

// ─── Game state ─────────────────────────────────────────────────────────────

let sessionDuration = 0; // seconds
let timeRemaining = 0;
let score = 0;
let timerInterval = null;
let currentQuestion = null;

// ─── DOM refs ────────────────────────────────────────────────────────────────

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');

const durationSelect = document.getElementById('duration-select');
const startBtn = document.getElementById('start-btn');

const timerWrap = document.getElementById('timer-wrap');
const timerBar = document.getElementById('timer-bar');
const timerLabel = document.getElementById('timer-label');
const topBarRight = document.getElementById('top-bar-right');
const scoreDisplay = document.getElementById('score-value');

const priceTableBody = document.getElementById('price-table-body');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-btn');
const feedbackEl = document.getElementById('feedback');

const finalScoreEl = document.getElementById('final-score');
const missedAnswerEl = document.getElementById('missed-answer');
const playAgainBtn = document.getElementById('play-again-btn');

// ─── Setup screen ────────────────────────────────────────────────────────────

let selectedDuration = 120; // default 2 min

durationSelect.addEventListener('change', () => {
  selectedDuration = parseInt(durationSelect.value, 10);
});

startBtn.addEventListener('click', startSession);

// ─── Session ─────────────────────────────────────────────────────────────────

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
    if (timeRemaining <= 0) {
      endSession();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const pct = timeRemaining / sessionDuration;
  timerBar.style.width = (pct * 100) + '%';
  if (pct < 0.2) {
    timerBar.classList.add('warning');
  } else {
    timerBar.classList.remove('warning');
  }
  const m = Math.floor(timeRemaining / 60);
  const s = timeRemaining % 60;
  timerLabel.textContent = m + ':' + String(s).padStart(2, '0') + ' remaining';
}

function updateScoreDisplay() {
  scoreDisplay.textContent = score;
}

function loadNextQuestion() {
  currentQuestion = generateQuestion();
  renderQuestion(currentQuestion);
  answerInput.value = '';
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  answerInput.focus();
}

function renderQuestion(q) {
  priceTableBody.innerHTML = '';
  for (const row of q.displayRows) {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    const tdValue = document.createElement('td');
    tdLabel.textContent = row.label;
    tdValue.textContent = row.value;
    if (row.isUnknown) {
      tdLabel.classList.add('unknown-label');
      tdValue.classList.add('unknown');
    }
    tr.appendChild(tdLabel);
    tr.appendChild(tdValue);
    priceTableBody.appendChild(tr);
  }
}

// ─── Answer submission ───────────────────────────────────────────────────────

submitBtn.addEventListener('click', checkAnswer);
answerInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') checkAnswer();
});

function checkAnswer() {
  if (!currentQuestion) return;
  const raw = answerInput.value.trim().replace(/^\$/, '');
  const val = parseFloat(raw);
  if (isNaN(val)) {
    feedbackEl.textContent = 'Enter a number.';
    feedbackEl.className = 'feedback wrong';
    return;
  }

  const diff = Math.abs(val - currentQuestion.answer);
  if (diff <= 0.05) {
    // Correct
    score++;
    updateScoreDisplay();
    loadNextQuestion();
  } else {
    // Wrong — stay on same question
    feedbackEl.textContent = '✗ Try again.';
    feedbackEl.className = 'feedback wrong';
    answerInput.select();
  }
}

// ─── End session ─────────────────────────────────────────────────────────────

function endSession() {
  clearInterval(timerInterval);
  gameScreen.classList.add('hidden');
  timerWrap.classList.add('hidden');
  timerLabel.classList.add('hidden');
  endScreen.classList.remove('hidden');

  finalScoreEl.textContent = score;

  if (currentQuestion) {
    missedAnswerEl.textContent =
      'Current question answer: ' + fmt(currentQuestion.answer) +
      '   (' + currentQuestion.template.hint + ')';
  } else {
    missedAnswerEl.textContent = '';
  }
}

playAgainBtn.addEventListener('click', () => {
  endScreen.classList.add('hidden');
  topBarRight.classList.add('hidden');
  setupScreen.classList.remove('hidden');
});
