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
  const practiceTag = document.getElementById('practice-tag');
  const endTitle = document.getElementById('end-title');

  let score = 0;
  let currentQuestion = null;
  let currentMode = 'medium';
  let gameActive = false;
  let durationSeconds = 120;
  let endTime = 0;
  let timerFrame = null;
  let practiceCategory = null;
  let questionStart = 0;
  let wrongEntries = 0;
  let runLog = [];

  const money = (cents) => `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function renderQuestion() {
    currentQuestion = practiceCategory
      ? window.PCP2Bank.createQuestion(currentMode, Math.random, practiceCategory)
      : window.PCP2Bank.createQuestion(currentMode);
    questionStart = performance.now();
    wrongEntries = 0;
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
      valueCell.textContent = instrument.unknown ? '?'
        : money(instrument.quote ? Math.abs(instrument.value) : instrument.value);
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
      runLog.push({ category: currentQuestion.category, ms: performance.now() - questionStart, wrongEntries });
      score += 1;
      scoreValue.textContent = String(score);
      renderQuestion();
      return;
    }

    wrongEntries += 1;
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

  const labIdFor = (mode) => `pcp2-${mode}`;
  const selectedMode = () => (modeSelect.value === 'hard' ? 'hard' : 'medium');

  function startGame(practice = null) {
    if (gameActive) return;
    practiceCategory = practice;
    runLog = [];
    const requestedDuration = Number(durationSelect.value);
    durationSeconds = Number.isFinite(requestedDuration) && requestedDuration > 0
      ? requestedDuration : 120;
    currentMode = selectedMode();
    practiceTag.textContent = practiceCategory ? `Practice: ${lab.labelOf(practiceCategory)}` : '';
    practiceTag.classList.toggle('hidden', !practiceCategory);
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
    // The unanswered question the timer cut off is left out of the Lab.
    lab.record(runLog);
    runLog = [];
    endTitle.textContent = practiceCategory ? `Practice: ${lab.labelOf(practiceCategory)}` : "Time's up";
    // stats.js records each time the end screen appears; practice opts out.
    endScreen.dataset.statsIgnore = practiceCategory ? 'true' : 'false';
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

  // Medium and Hard keep separate Labs: Hard questions take much longer.
  const lab = globalThis.OptionsLab.mount({
    id: labIdFor(selectedMode()),
    categories: window.PCP2Bank.categoriesFor(selectedMode()),
    onPractice: (key) => startGame(key),
  });

  modeSelect.addEventListener('change', () => {
    lab.use(labIdFor(selectedMode()), window.PCP2Bank.categoriesFor(selectedMode()));
    modeNote.textContent = modeSelect.value === 'hard'
      ? 'Combine relationships across structures, strikes, and expirations.'
      : 'Structure relationships and their rearrangements.';
  });
  document.getElementById('start-btn').addEventListener('click', () => startGame());
  document.getElementById('submit-btn').addEventListener('click', submitAnswer);
  document.getElementById('play-again-btn').addEventListener('click', showSetup);
  answerInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitAnswer();
  });
})();
