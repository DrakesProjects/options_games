(() => {
  'use strict';

  const Core = globalThis.ArithmeticCore;
  const SETTINGS_KEY = 'options-games.arithmetic.v1.settings';
  const LAB_KEY = 'options-games.arithmetic.v1.lab';
  const LAB_SUMMARY_KEY = 'options-games.lab-summary.v1.arithmetic';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);

  const setupScreen = $('setup-screen');
  const gameScreen = $('game-screen');
  const endScreen = $('end-screen');
  const topBarRight = $('top-bar-right');
  const practiceTag = $('practice-tag');
  const scoreValue = $('score-value');
  const timerWrap = $('timer-wrap');
  const timerBar = $('timer-bar');
  const timerLabel = $('timer-label');
  const durationSelect = $('duration-select');
  const themeSelect = $('theme-select');
  const resetButton = $('reset-btn');
  const setupError = $('setup-error');
  const startButton = $('start-btn');
  const bestNote = $('best-note');
  const labBody = $('lab-body');
  const labClearButton = $('lab-clear-btn');
  const problemDisplay = $('problem');
  const answerInput = $('answer-input');
  const numpad = $('numpad');
  const endTitle = $('end-title');
  const finalScore = $('final-score');
  const bestMessage = $('best-message');
  const endAccuracy = $('end-accuracy');
  const endQpm = $('end-qpm');
  const endSkips = $('end-skips');
  const runChart = $('run-chart');
  const runDetail = $('run-detail');
  const playAgainButton = $('play-again-btn');
  const menuButton = $('menu-btn');
  const opChecks = [...document.querySelectorAll('.op-check')];
  const rangeInputs = {
    addition: { left: ['add-left-min', 'add-left-max'], right: ['add-right-min', 'add-right-max'] },
    multiplication: { left: ['mul-left-min', 'mul-left-max'], right: ['mul-right-min', 'mul-right-max'] },
  };

  let stored = loadJson(SETTINGS_KEY, {});
  let bests = stored.bests && typeof stored.bests === 'object' ? stored.bests : {};
  let labHistory = loadJson(LAB_KEY, {});

  let mode = { practiceOp: null };
  let running = false;
  let durationSeconds = 120;
  let endTime = 0;
  let timerFrame = null;
  let nextProblem = null;
  let current = null;
  let log = [];
  let lastLog = [];

  function loadJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && typeof value === 'object' ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private windows); the game still works.
    }
  }

  // ─── Settings ──────────────────────────────────────────────────────────────

  function readSettings() {
    const operations = {};
    for (const check of opChecks) operations[check.value] = check.checked;
    const settings = { operations };
    for (const [pairName, pair] of Object.entries(rangeInputs)) {
      settings[pairName] = {};
      for (const [side, [minId, maxId]] of Object.entries(pair)) {
        settings[pairName][side] = { min: $(minId).value, max: $(maxId).value };
      }
    }
    return Core.normalizeSettings(settings);
  }

  function writeSettings(settings) {
    for (const check of opChecks) check.checked = settings.operations[check.value];
    for (const [pairName, pair] of Object.entries(rangeInputs)) {
      for (const [side, [minId, maxId]] of Object.entries(pair)) {
        $(minId).value = String(settings[pairName][side].min);
        $(maxId).value = String(settings[pairName][side].max);
      }
    }
  }

  function applyTheme(theme) {
    const dark = theme === 'dark';
    themeSelect.value = dark ? 'dark' : 'light';
    document.body.classList.toggle('theme-dark', dark);
  }

  function persistSettings() {
    stored = {
      settings: readSettings(),
      theme: themeSelect.value,
      duration: durationSelect.value,
      bests,
    };
    saveJson(SETTINGS_KEY, stored);
  }

  function validateSetup() {
    const ready = Core.enabledOperations(readSettings()).length > 0;
    setupError.textContent = ready ? '' : 'Pick at least one operation.';
    startButton.disabled = !ready;
    return ready;
  }

  function onSettingsChanged() {
    // Reflect clamped or swapped bounds so the inputs show what will be used.
    writeSettings(readSettings());
    validateSetup();
    persistSettings();
  }

  function renderBestNote() {
    const best = bests[durationSelect.value];
    const label = durationSelect.options[durationSelect.selectedIndex]?.textContent || `${durationSelect.value / 60} min`;
    bestNote.textContent = best ? `Personal best (${label}): ${best}` : `No personal best yet for ${label}.`;
  }

  // ─── Lab ───────────────────────────────────────────────────────────────────

  function formatPercent(value) {
    return value === null ? '—' : `${Math.round(value * 100)}%`;
  }

  function formatSeconds(value) {
    return value === null ? '—' : `${value.toFixed(1)}s`;
  }

  function renderLab() {
    labBody.replaceChildren();
    const report = Core.labReport(labHistory);
    // The home page shows each game's current problem area.
    saveJson(LAB_SUMMARY_KEY, { problemArea: report.find((row) => row.weakest)?.label || null });
    for (const row of report) {
      const tr = document.createElement('tr');
      if (row.weakest) tr.className = 'lab-weak';

      const name = document.createElement('th');
      name.scope = 'row';
      name.textContent = row.label;
      if (row.weakest) {
        const tag = document.createElement('span');
        tag.className = 'lab-tag';
        tag.textContent = 'Problem area';
        name.append(' ', tag);
      }

      const questions = document.createElement('td');
      questions.textContent = String(row.questions);
      const accuracy = document.createElement('td');
      accuracy.textContent = formatPercent(row.accuracy);
      const average = document.createElement('td');
      average.textContent = formatSeconds(row.averageSeconds);

      const action = document.createElement('td');
      const practice = document.createElement('button');
      practice.type = 'button';
      practice.className = 'lab-practice-btn';
      practice.textContent = 'Practice';
      practice.dataset.op = row.op;
      practice.setAttribute('aria-label', `Target practice: ${row.label}`);
      practice.addEventListener('click', () => startGame({ practiceOp: row.op }));
      action.append(practice);

      tr.append(name, questions, accuracy, average, action);
      labBody.append(tr);
    }
  }

  // ─── Run ───────────────────────────────────────────────────────────────────

  function show(screen) {
    for (const element of [setupScreen, gameScreen, endScreen]) {
      element.classList.toggle('hidden', element !== screen);
    }
    const inGame = screen === gameScreen;
    for (const element of [topBarRight, timerWrap, timerLabel]) element.classList.toggle('hidden', !inGame);
  }

  function startGame(nextMode = mode) {
    const settings = readSettings();
    if (!nextMode.practiceOp && !validateSetup()) return;
    persistSettings();

    mode = { practiceOp: nextMode.practiceOp || null };
    durationSeconds = Number(durationSelect.value);
    nextProblem = Core.createGenerator(settings, mode.practiceOp ? { operations: [mode.practiceOp] } : {});
    log = [];
    scoreValue.textContent = '0';
    practiceTag.textContent = mode.practiceOp ? `Practice: ${Core.OPERATION_LABELS[mode.practiceOp]}` : '';
    practiceTag.classList.toggle('hidden', !mode.practiceOp);
    numpad.classList.toggle('hidden', !usesNumpad());
    answerInput.inputMode = usesNumpad() ? 'none' : 'numeric';

    show(gameScreen);
    running = true;
    endTime = performance.now() + durationSeconds * 1000;
    showProblem();
    cancelAnimationFrame(timerFrame);
    updateTimer();
  }

  function usesNumpad() {
    return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  }

  function showProblem() {
    current = { problem: nextProblem(), startedAt: performance.now(), wrongEntries: 0, inWrongState: false };
    problemDisplay.textContent = current.problem.text;
    answerInput.value = '';
    answerInput.focus();
  }

  function logCurrent({ correct, skipped, entered }) {
    const { problem } = current;
    log.push({
      op: problem.op,
      a: problem.a,
      b: problem.b,
      text: problem.text,
      answer: problem.answer,
      entered,
      correct,
      skipped,
      wrongEntries: current.wrongEntries,
      ms: performance.now() - current.startedAt,
    });
  }

  function handleEntry() {
    if (!running) return;
    const digits = Core.sanitizeEntry(answerInput.value);
    if (digits !== answerInput.value) answerInput.value = digits;
    const result = Core.evaluateEntry(current.problem, digits);
    if (result === 'correct') {
      logCurrent({ correct: true, skipped: false, entered: digits });
      scoreValue.textContent = String(log.filter((entry) => entry.correct).length);
      showProblem();
    } else if (result === 'wrong') {
      // Count each arrival at a wrong full-length answer once.
      if (!current.inWrongState) current.wrongEntries += 1;
      current.inWrongState = true;
    } else {
      current.inWrongState = false;
    }
  }

  function skipProblem() {
    if (!running) return;
    logCurrent({ correct: false, skipped: true, entered: Core.sanitizeEntry(answerInput.value) });
    showProblem();
  }

  function updateTimer() {
    const millisecondsLeft = Math.max(0, endTime - performance.now());
    timerLabel.textContent = `${Math.ceil(millisecondsLeft / 1000)}s`;
    timerBar.style.width = `${(millisecondsLeft / (durationSeconds * 1000)) * 100}%`;
    timerBar.classList.toggle('warning', millisecondsLeft <= 10000);
    if (millisecondsLeft <= 0) {
      finishGame();
      return;
    }
    timerFrame = requestAnimationFrame(updateTimer);
  }

  function stopRun() {
    running = false;
    cancelAnimationFrame(timerFrame);
    timerFrame = null;
    current = null;
  }

  function quitToSetup() {
    stopRun();
    showSetup();
  }

  function finishGame() {
    if (!running) return;
    // The unanswered question at the buzzer is left out, as it was never resolved.
    stopRun();
    lastLog = log.slice();
    const summary = Core.summarizeRun(lastLog, durationSeconds);

    labHistory = Core.addToLab(labHistory, lastLog);
    saveJson(LAB_KEY, labHistory);

    let newBest = false;
    if (!mode.practiceOp && summary.score > 0) {
      const previous = bests[String(durationSeconds)] || 0;
      if (summary.score > previous) {
        bests[String(durationSeconds)] = summary.score;
        newBest = true;
        persistSettings();
      }
    }

    endTitle.textContent = mode.practiceOp ? `Target practice: ${Core.OPERATION_LABELS[mode.practiceOp]}` : "Time's up";
    finalScore.textContent = String(summary.score);
    bestMessage.textContent = mode.practiceOp
      ? 'Practice runs update the Lab but not past results.'
      : (newBest ? 'New personal best!' : '');
    endAccuracy.textContent = formatPercent(summary.accuracy);
    endQpm.textContent = `${summary.questionsPerMinute.toFixed(1)} QPM`;
    endSkips.textContent = String(summary.skips);
    renderRunChart(lastLog);

    // stats.js records each time the end screen appears; practice opts out.
    endScreen.dataset.statsIgnore = mode.practiceOp ? 'true' : 'false';
    show(endScreen);
    playAgainButton.focus();
  }

  function showSetup() {
    renderLab();
    renderBestNote();
    validateSetup();
    show(setupScreen);
  }

  // ─── End-of-run chart ──────────────────────────────────────────────────────

  function svg(name, attributes = {}, text = '') {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text) element.textContent = text;
    return element;
  }

  function describeEntry(entry, index) {
    const seconds = `${(entry.ms / 1000).toFixed(1)}s`;
    const equation = `${entry.text} = ${entry.answer}`;
    if (entry.skipped) {
      const typed = entry.entered ? ` (had typed ${entry.entered})` : '';
      return `#${index + 1} · ${equation} · skipped${typed} · ${seconds}`;
    }
    const misses = entry.wrongEntries ? ` after ${entry.wrongEntries} wrong ${entry.wrongEntries === 1 ? 'entry' : 'entries'}` : '';
    return `#${index + 1} · ${equation} · correct${misses} · ${seconds}`;
  }

  function renderRunChart(entries) {
    runChart.replaceChildren();
    runDetail.textContent = '';
    const width = 520;
    const height = 200;
    const margin = { top: 12, right: 12, bottom: 28, left: 40 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    runChart.append(svg('rect', {
      x: margin.left, y: margin.top, width: plotWidth, height: plotHeight, class: 'run-chart-frame',
    }));

    if (entries.length === 0) {
      runChart.append(svg('text', {
        x: margin.left + plotWidth / 2, y: margin.top + plotHeight / 2, 'text-anchor': 'middle', class: 'run-chart-label',
      }, 'No questions finished'));
      return;
    }

    const seconds = entries.map((entry) => entry.ms / 1000);
    const step = Math.max(...seconds) > 20 ? 10 : (Math.max(...seconds) > 8 ? 4 : 2);
    const yMax = Math.max(step, Math.ceil(Math.max(...seconds) / step) * step);
    const x = (index) => (entries.length === 1
      ? margin.left + plotWidth / 2
      : margin.left + index * plotWidth / (entries.length - 1));
    const y = (value) => margin.top + plotHeight - value / yMax * plotHeight;

    for (let tick = 0; tick <= yMax; tick += step) {
      runChart.append(
        svg('line', { x1: margin.left, y1: y(tick), x2: width - margin.right, y2: y(tick), class: 'run-chart-gridline' }),
        svg('text', { x: margin.left - 6, y: y(tick) + 4, 'text-anchor': 'end', class: 'run-chart-label' }, `${tick}s`),
      );
    }
    runChart.append(
      svg('text', { x: margin.left, y: height - 8, 'text-anchor': 'start', class: 'run-chart-label' }, 'Q1'),
      svg('text', { x: width - margin.right, y: height - 8, 'text-anchor': 'end', class: 'run-chart-label' }, `Q${entries.length}`),
    );
    if (entries.length > 1) {
      runChart.append(svg('polyline', {
        points: seconds.map((value, index) => `${x(index)},${y(value)}`).join(' '),
        class: 'run-chart-line',
      }));
    }

    const radius = entries.length > 120 ? 2.5 : 4;
    let selected = null;
    entries.forEach((entry, index) => {
      const kind = entry.skipped ? 'skip' : (entry.wrongEntries ? 'retry' : 'correct');
      const point = svg('circle', {
        cx: x(index), cy: y(seconds[index]), r: radius,
        class: `run-chart-point point-${kind}`,
        tabindex: 0,
        role: 'button',
        'aria-label': describeEntry(entry, index),
      });
      const select = () => {
        if (selected) selected.classList.remove('selected');
        selected = point;
        point.classList.add('selected');
        runDetail.textContent = describeEntry(entry, index);
      };
      point.addEventListener('click', select);
      point.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          select();
        }
      });
      runChart.append(point);
    });
  }

  // ─── Input wiring ──────────────────────────────────────────────────────────

  function isFormControl(target) {
    return Boolean(target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName))
      || Boolean(target && target.getAttribute && target.getAttribute('role') === 'button');
  }

  document.addEventListener('keydown', (event) => {
    if (running) {
      if (event.key === 'Enter') {
        event.preventDefault();
        skipProblem();
      } else if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        stopRun();
        startGame(mode);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        quitToSetup();
      }
      return;
    }
    if ((event.key === ' ' || event.code === 'Space') && !isFormControl(event.target)) {
      if (!setupScreen.classList.contains('hidden')) {
        event.preventDefault();
        startGame({ practiceOp: null });
      } else if (!endScreen.classList.contains('hidden')) {
        event.preventDefault();
        startGame(mode);
      }
    } else if (event.key === 'Escape' && !endScreen.classList.contains('hidden')) {
      showSetup();
    }
  });

  answerInput.addEventListener('input', handleEntry);
  gameScreen.addEventListener('click', () => { if (running) answerInput.focus(); });

  for (const key of document.querySelectorAll('.numpad-key')) {
    // Keep focus on the answer field so physical keys keep working too.
    key.addEventListener('pointerdown', (event) => event.preventDefault());
    key.addEventListener('click', () => {
      const value = key.dataset.key;
      if (value === 'skip') {
        skipProblem();
        return;
      }
      answerInput.value = value === 'back' ? answerInput.value.slice(0, -1) : answerInput.value + value;
      handleEntry();
    });
  }

  startButton.addEventListener('click', () => startGame({ practiceOp: null }));
  playAgainButton.addEventListener('click', () => startGame(mode));
  menuButton.addEventListener('click', showSetup);
  for (const check of opChecks) check.addEventListener('change', onSettingsChanged);
  for (const pair of Object.values(rangeInputs)) {
    for (const ids of Object.values(pair)) {
      for (const id of ids) $(id).addEventListener('change', onSettingsChanged);
    }
  }
  durationSelect.addEventListener('change', () => { persistSettings(); renderBestNote(); });
  themeSelect.addEventListener('change', () => { applyTheme(themeSelect.value); persistSettings(); });
  resetButton.addEventListener('click', () => {
    writeSettings(Core.normalizeSettings(Core.STANDARD_SETTINGS));
    validateSetup();
    persistSettings();
  });
  labClearButton.addEventListener('click', () => {
    if (!window.confirm('Clear all Lab data for Mental Math?')) return;
    labHistory = {};
    saveJson(LAB_KEY, labHistory);
    renderLab();
  });

  // ─── Boot ──────────────────────────────────────────────────────────────────

  writeSettings(Core.normalizeSettings(stored.settings));
  if ([...durationSelect.options].some((option) => option.value === stored.duration)) {
    durationSelect.value = stored.duration;
  }
  applyTheme(stored.theme);
  showSetup();
})();
