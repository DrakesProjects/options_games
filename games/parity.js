(() => {
  'use strict';

  const labels = {
    stock: 'Stock',
    strike: 'Strike',
    rc: 'r/c',
    call: 'Call',
    put: 'Put',
    straddle: 'Straddle',
    bw: 'B/W',
    ps: 'P&S',
  };

  const setupScreen = document.getElementById('setup-screen');
  const gameScreen = document.getElementById('game-screen');
  const endScreen = document.getElementById('end-screen');
  const durationSelect = document.getElementById('duration-select');
  const straddleCheck = document.getElementById('straddle-check');
  const coveredCheck = document.getElementById('covered-check');
  const startButton = document.getElementById('start-btn');
  const submitButton = document.getElementById('submit-btn');
  const playAgainButton = document.getElementById('play-again-btn');
  const answerInput = document.getElementById('answer-input');
  const priceTableBody = document.getElementById('price-table-body');
  const feedback = document.getElementById('feedback');
  const scoreValue = document.getElementById('score-value');
  const finalScore = document.getElementById('final-score');
  const missedAnswer = document.getElementById('missed-answer');
  const topBarRight = document.getElementById('top-bar-right');
  const timerWrap = document.getElementById('timer-wrap');
  const timerBar = document.getElementById('timer-bar');
  const timerLabel = document.getElementById('timer-label');

  let score = 0;
  let currentRound = null;
  let enabledTargets = [];
  let durationSeconds = 120;
  let endTime = 0;
  let timerFrame = null;

  const roundMoney = (value) => Math.round(value * 100) / 100;
  const formatMoney = (value) => (
    value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`
  );
  const choose = (items) => items[Math.floor(Math.random() * items.length)];
  const shuffle = (items) => {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  };
  const randomCents = (minimum, maximum) => {
    const minCents = Math.round(minimum * 100);
    const maxCents = Math.round(maximum * 100);
    return (minCents + Math.floor(Math.random() * (maxCents - minCents + 1))) / 100;
  };

  function createValues(target) {
    // Generate internally consistent, cent-exact values. Parity is Stock - Strike.
    for (;;) {
      const strike = randomCents(40, 150);
      const parity = randomCents(-12, 12);
      const stock = roundMoney(strike + parity);
      const rc = randomCents(-0.10, 3);
      let call;
      let put;

      if (target === 'straddle') {
        // TraderPrep ordering: generate Call, derive Put through PCP, then add them.
        const forward = roundMoney(parity + rc);
        call = randomCents(Math.max(0.01, forward), forward + 20);
        put = roundMoney(call - forward);
      } else {
        put = randomCents(0, 20);
        call = roundMoney(put + parity + rc);
      }

      const straddle = roundMoney(call + put);
      const bw = roundMoney(call - parity);
      const ps = roundMoney(call - rc);

      if (stock > 0 && call > 0 && bw > 0 && ps > 0) {
        return { stock, strike, parity, rc, call, put, straddle, bw, ps };
      }
    }
  }

  function clueVariants(target) {
    const variants = {
      call: [
        { clues: ['stock', 'strike', 'rc', 'put'], formula: 'C = P + parity + r/c' },
      ],
      put: [
        { clues: ['stock', 'strike', 'rc', 'call'], formula: 'P = C - parity - r/c' },
      ],
      straddle: [
        {
          clues: ['call', 'stock', 'strike', 'rc'],
          formula: 'Straddle = 2C - parity - r/c',
        },
        {
          clues: ['put', 'stock', 'strike', 'rc'],
          formula: 'Straddle = 2P + parity + r/c',
        },
      ],
      bw: [
        { clues: ['call', 'stock', 'strike', 'rc'], formula: 'B/W = C - parity' },
        { clues: ['put', 'stock', 'strike', 'rc'], formula: 'B/W = P + r/c' },
      ],
      ps: [
        { clues: ['call', 'stock', 'strike', 'rc'], formula: 'P&S = C - r/c' },
        { clues: ['put', 'stock', 'strike', 'rc'], formula: 'P&S = P + parity' },
      ],
    };

    if (coveredCheck.checked) {
      variants.call.push(
        { clues: ['bw', 'stock', 'strike', 'rc'], formula: 'C = B/W + parity' },
        { clues: ['ps', 'stock', 'strike', 'rc'], formula: 'C = P&S + r/c' },
      );
      variants.put.push(
        { clues: ['bw', 'stock', 'strike', 'rc'], formula: 'P = B/W - r/c' },
        { clues: ['ps', 'stock', 'strike', 'rc'], formula: 'P = P&S - parity' },
      );
    }

    return variants[target];
  }

  function createRound() {
    const questionBank = enabledTargets.flatMap((target) => (
      clueVariants(target).map((variant) => ({ target, ...variant }))
    ));
    // Every enabled question variant has the same probability of being selected.
    const question = choose(questionBank);
    const values = createValues(question.target);
    return {
      values,
      target: question.target,
      clues: question.clues,
      formula: question.formula,
      answer: values[question.target],
    };
  }

  function renderRound() {
    currentRound = createRound();
    priceTableBody.replaceChildren();

    const instruments = shuffle([
      ...currentRound.clues.map((key) => ({ key, isQuestion: false })),
      { key: currentRound.target, isQuestion: true },
    ]);

    for (const instrument of instruments) {
      const row = document.createElement('tr');
      const labelCell = document.createElement('td');
      const valueCell = document.createElement('td');
      labelCell.textContent = labels[instrument.key];

      if (instrument.isQuestion) {
        row.className = 'question-row';
        valueCell.textContent = '?';
      } else {
        valueCell.textContent = formatMoney(currentRound.values[instrument.key]);
      }

      row.append(labelCell, valueCell);
      priceTableBody.append(row);
    }

    answerInput.value = '';
    answerInput.placeholder = labels[currentRound.target];
    feedback.textContent = '';
    feedback.className = 'feedback';
    answerInput.focus();
  }

  function submitAnswer() {
    if (!currentRound || endScreen.classList.contains('hidden') === false) return;

    const submitted = Number(answerInput.value);
    if (!Number.isFinite(submitted)) {
      feedback.textContent = 'Enter a value.';
      feedback.className = 'feedback incorrect';
      answerInput.focus();
      return;
    }

    if (Math.abs(roundMoney(submitted) - currentRound.answer) < 0.005) {
      score += 1;
      scoreValue.textContent = String(score);
      renderRound();
      return;
    }

    feedback.textContent = 'Try again.';
    feedback.className = 'feedback incorrect';
    answerInput.select();
  }

  function updateTimer() {
    const millisecondsLeft = Math.max(0, endTime - performance.now());
    const secondsLeft = Math.ceil(millisecondsLeft / 1000);
    timerLabel.textContent = `${secondsLeft}s`;
    timerBar.style.width = `${(millisecondsLeft / (durationSeconds * 1000)) * 100}%`;

    if (millisecondsLeft <= 0) {
      finishGame();
      return;
    }

    timerFrame = requestAnimationFrame(updateTimer);
  }

  function startGame() {
    durationSeconds = Number(durationSelect.value);
    enabledTargets = ['call', 'put'];
    if (straddleCheck.checked) enabledTargets.push('straddle');
    if (coveredCheck.checked) enabledTargets.push('bw', 'ps');

    score = 0;
    scoreValue.textContent = '0';
    missedAnswer.textContent = '';
    setupScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    topBarRight.classList.remove('hidden');
    timerWrap.classList.remove('hidden');
    timerLabel.classList.remove('hidden');

    renderRound();
    endTime = performance.now() + durationSeconds * 1000;
    cancelAnimationFrame(timerFrame);
    updateTimer();
  }

  function finishGame() {
    cancelAnimationFrame(timerFrame);
    timerFrame = null;
    gameScreen.classList.add('hidden');
    timerWrap.classList.add('hidden');
    timerLabel.classList.add('hidden');
    topBarRight.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = String(score);

    if (currentRound) {
      missedAnswer.textContent = `${labels[currentRound.target]}: ${formatMoney(currentRound.answer)} · ${currentRound.formula}`;
    }
  }

  function showSetup() {
    endScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    missedAnswer.textContent = '';
    currentRound = null;
  }

  startButton.addEventListener('click', startGame);
  submitButton.addEventListener('click', submitAnswer);
  playAgainButton.addEventListener('click', showSetup);
  answerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitAnswer();
  });
})();
