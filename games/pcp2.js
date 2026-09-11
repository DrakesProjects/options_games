(() => {
  'use strict';

  const setupScreen = document.getElementById('setup-screen');
  const gameScreen = document.getElementById('game-screen');
  const endScreen = document.getElementById('end-screen');
  const durationSelect = document.getElementById('duration-select');
  const modeSelect = document.getElementById('mode-select');
  const modeNote = document.getElementById('mode-note');
  const modeDisplay = document.getElementById('mode-display');
  const answerInput = document.getElementById('answer-input');
  const priceTableBody = document.getElementById('price-table-body');
  const contractInfo = document.getElementById('contract-info');
  const feedback = document.getElementById('feedback');
  const scoreValue = document.getElementById('score-value');
  const finalScore = document.getElementById('final-score');
  const missedAnswer = document.getElementById('missed-answer');
  const topBarRight = document.getElementById('top-bar-right');
  const timerWrap = document.getElementById('timer-wrap');
  const timerBar = document.getElementById('timer-bar');
  const timerLabel = document.getElementById('timer-label');

  let score = 0;
  let currentQuestion = null;
  let currentMode = 'medium';
  let gameActive = false;
  let durationSeconds = 120;
  let endTime = 0;
  let timerFrame = null;

  const money = (cents) => `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function renderQuestion() {
    currentQuestion = window.PCP2Bank.createQuestion(currentMode);
    contractInfo.replaceChildren(...currentQuestion.contractInfo.map((fact) => {
      const element = document.createElement('span');
      element.textContent = fact;
      return element;
    }));

    const instruments = shuffle([
      ...currentQuestion.givens,
      { label: currentQuestion.targetLabel, unknown: true },
    ]);
    priceTableBody.replaceChildren(...instruments.map((instrument) => {
      const row = document.createElement('tr');
      const labelCell = document.createElement('td');
      const valueCell = document.createElement('td');
      labelCell.textContent = instrument.label;
      valueCell.textContent = instrument.unknown ? '?' : instrument.quote
        ? `${money(Math.abs(instrument.value))} ${instrument.quote}` : money(instrument.value);
      if (instrument.unknown) row.className = 'question-row';
      row.append(labelCell, valueCell);
      return row;
    }));

    answerInput.value = '';
    answerInput.placeholder = currentQuestion.targetLabel;
    answerInput.setAttribute('aria-label', currentQuestion.targetLabel);
    answerInput.removeAttribute('aria-invalid');
    feedback.textContent = '';
    feedback.className = 'feedback';
    answerInput.focus();
    gameScreen.scrollTop = 0;
  }

  function submitAnswer() {
    if (!gameActive || !currentQuestion) return;
    if (performance.now() >= endTime) {
      finishGame();
      return;
    }

    const rawAnswer = answerInput.value.trim();
    const submitted = Number(rawAnswer);
    if (rawAnswer === '' || !Number.isFinite(submitted)) {
      feedback.textContent = 'Enter a value.';
      feedback.className = 'feedback wrong';
      answerInput.setAttribute('aria-invalid', 'true');
      answerInput.focus();
      return;
    }

    if (Math.round(submitted * 100) === currentQuestion.answer) {
      score += 1;
      scoreValue.textContent = String(score);
      renderQuestion();
      return;
    }

    feedback.textContent = 'Try again.';
    feedback.className = 'feedback wrong';
    answerInput.setAttribute('aria-invalid', 'true');
    answerInput.select();
  }

  function updateTimer() {
    if (!gameActive) return;
    const millisecondsLeft = Math.max(0, endTime - performance.now());
    timerLabel.textContent = `${Math.ceil(millisecondsLeft / 1000)}s`;
    timerBar.style.width = `${millisecondsLeft / (durationSeconds * 1000) * 100}%`;

    if (millisecondsLeft <= 0) {
      finishGame();
      return;
    }
    timerFrame = requestAnimationFrame(updateTimer);
  }

  function startGame() {
    if (gameActive) return;
    const requestedDuration = Number(durationSelect.value);
    durationSeconds = Number.isFinite(requestedDuration) && requestedDuration > 0
      ? requestedDuration : 120;
    currentMode = modeSelect.value === 'hard' ? 'hard' : 'medium';
    score = 0;
    scoreValue.textContent = '0';
    modeDisplay.textContent = currentMode === 'hard' ? 'Hard' : 'Medium';
    missedAnswer.textContent = '';
    setupScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    topBarRight.classList.remove('hidden');
    timerWrap.classList.remove('hidden');
    timerLabel.classList.remove('hidden');

    renderQuestion();
    gameActive = true;
    endTime = performance.now() + durationSeconds * 1000;
    cancelAnimationFrame(timerFrame);
    updateTimer();
  }

  function finishGame() {
    if (!gameActive) return;
    gameActive = false;
    cancelAnimationFrame(timerFrame);
    timerFrame = null;
    gameScreen.classList.add('hidden');
    timerWrap.classList.add('hidden');
    timerLabel.classList.add('hidden');
    topBarRight.classList.add('hidden');
    finalScore.textContent = String(score);
    if (currentQuestion) {
      missedAnswer.textContent = [
        `${currentQuestion.targetLabel}: ${money(currentQuestion.answer)}`,
        ...currentQuestion.steps,
      ].join('\n');
    }
    endScreen.classList.remove('hidden');
  }

  function showSetup() {
    endScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    missedAnswer.textContent = '';
    currentQuestion = null;
  }

  modeSelect.addEventListener('change', () => {
    modeNote.textContent = modeSelect.value === 'hard'
      ? 'Combine relationships across structures, strikes, and expirations.'
      : 'Structure relationships and their rearrangements.';
  });
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('submit-btn').addEventListener('click', submitAnswer);
  document.getElementById('play-again-btn').addEventListener('click', showSetup);
  answerInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitAnswer();
  });
})();
