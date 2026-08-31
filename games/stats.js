(() => {
  'use strict';

  const gameId = document.body.dataset.statsGame;
  const setupScreen = document.getElementById('setup-screen');
  const setupBox = setupScreen?.querySelector('.setup-box');
  const endScreen = document.getElementById('end-screen');
  const finalScore = document.getElementById('final-score');
  const durationSelect = document.getElementById('duration-select');

  if (!gameId || !setupBox || !endScreen || !finalScore || !durationSelect) return;

  const storageKey = `options-games.stats.v1.${gameId}`;
  let entries = loadEntries();
  let endScreenWasVisible = !endScreen.classList.contains('hidden');

  const panel = document.createElement('section');
  panel.className = 'stats-panel';
  panel.setAttribute('aria-labelledby', `${gameId}-stats-title`);
  panel.innerHTML = `
    <div class="stats-heading-row">
      <div>
        <h2 id="${gameId}-stats-title" class="stats-title">Past results</h2>
        <p class="stats-subtitle">Fully completed games · answers per minute</p>
      </div>
      <button type="button" class="stats-delete-all">Clear all</button>
    </div>
    <figure class="stats-chart-figure">
      <svg class="stats-chart" viewBox="0 0 520 190" role="img"></svg>
      <figcaption class="stats-chart-caption">Completed games, oldest to newest</figcaption>
    </figure>
    <div class="stats-list" aria-live="polite"></div>
  `;
  setupScreen.classList.add('setup-with-stats');
  setupScreen.append(panel);

  const list = panel.querySelector('.stats-list');
  const chart = panel.querySelector('.stats-chart');
  const deleteAllButton = panel.querySelector('.stats-delete-all');
  const svgNamespace = 'http://www.w3.org/2000/svg';

  function loadEntries() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.filter((entry) => (
        entry
        && typeof entry.id === 'string'
        && Number.isFinite(entry.completedAt)
        && Number.isFinite(entry.durationSeconds)
        && Number.isFinite(entry.score)
        && Number.isFinite(entry.answersPerMinute)
      ));
    } catch {
      return [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      return true;
    } catch {
      return false;
    }
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  function formatDuration(seconds) {
    const minutes = seconds / 60;
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} min`;
  }

  function addSvgElement(name, attributes = {}, text = '') {
    const element = document.createElementNS(svgNamespace, name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    if (text) element.textContent = text;
    chart.append(element);
    return element;
  }

  function renderChart() {
    chart.replaceChildren();

    const title = addSvgElement('title', {}, 'Answers per minute by completed game');
    title.id = `${gameId}-chart-title`;
    chart.setAttribute('aria-labelledby', title.id);

    if (entries.length === 0) {
      addSvgElement('rect', {
        x: 42,
        y: 14,
        width: 464,
        height: 144,
        class: 'stats-chart-frame',
      });
      addSvgElement('text', {
        x: 274,
        y: 90,
        'text-anchor': 'middle',
        class: 'stats-chart-empty',
      }, 'Complete a game to start the chart');
      return;
    }

    const chronological = entries.slice().reverse();
    const width = 520;
    const height = 190;
    const margin = { top: 14, right: 14, bottom: 32, left: 42 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const highestRate = Math.max(...chronological.map((entry) => entry.answersPerMinute));
    const yMaximum = Math.max(1, Math.ceil(highestRate * 1.1));
    const xPosition = (index) => (
      chronological.length === 1
        ? margin.left + plotWidth / 2
        : margin.left + index * plotWidth / (chronological.length - 1)
    );
    const yPosition = (rate) => margin.top + plotHeight - rate / yMaximum * plotHeight;

    addSvgElement('rect', {
      x: margin.left,
      y: margin.top,
      width: plotWidth,
      height: plotHeight,
      class: 'stats-chart-frame',
    });

    for (let tick = 0; tick <= 4; tick += 1) {
      const rate = yMaximum * tick / 4;
      const y = yPosition(rate);
      addSvgElement('line', {
        x1: margin.left,
        y1: y,
        x2: width - margin.right,
        y2: y,
        class: 'stats-chart-gridline',
      });
      addSvgElement('text', {
        x: margin.left - 7,
        y: y + 4,
        'text-anchor': 'end',
        class: 'stats-chart-label',
      }, rate.toFixed(rate < 10 && rate % 1 !== 0 ? 1 : 0));
    }

    const points = chronological.map((entry, index) => (
      `${xPosition(index)},${yPosition(entry.answersPerMinute)}`
    )).join(' ');

    if (chronological.length > 1) {
      addSvgElement('polyline', { points, class: 'stats-chart-line' });
    }

    chronological.forEach((entry, index) => {
      const point = addSvgElement('circle', {
        cx: xPosition(index),
        cy: yPosition(entry.answersPerMinute),
        r: 4,
        class: 'stats-chart-point',
      });
      const pointTitle = document.createElementNS(svgNamespace, 'title');
      pointTitle.textContent = `${formatDate(entry.completedAt)}: ${entry.answersPerMinute.toFixed(2)} answers per minute`;
      point.append(pointTitle);
    });

    addSvgElement('text', {
      x: margin.left,
      y: height - 9,
      'text-anchor': 'start',
      class: 'stats-chart-label',
    }, chronological.length === 1 ? 'First result' : 'Oldest');
    if (chronological.length > 1) {
      addSvgElement('text', {
        x: width - margin.right,
        y: height - 9,
        'text-anchor': 'end',
        class: 'stats-chart-label',
      }, 'Newest');
    }
    addSvgElement('text', {
      x: 12,
      y: margin.top + plotHeight / 2,
      transform: `rotate(-90 12 ${margin.top + plotHeight / 2})`,
      'text-anchor': 'middle',
      class: 'stats-chart-axis-title',
    }, 'Answers/min');
  }

  function renderEntries() {
    list.replaceChildren();
    deleteAllButton.disabled = entries.length === 0;
    renderChart();

    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'stats-empty';
      empty.textContent = 'No completed games yet.';
      list.append(empty);
      return;
    }

    for (const entry of entries) {
      const item = document.createElement('article');
      item.className = 'stats-entry';

      const details = document.createElement('div');
      details.className = 'stats-entry-details';

      const rate = document.createElement('strong');
      rate.className = 'stats-rate';
      rate.textContent = `${entry.answersPerMinute.toFixed(2)} answers/min`;

      const summary = document.createElement('span');
      summary.className = 'stats-summary';
      summary.textContent = `${entry.score} answers · ${formatDuration(entry.durationSeconds)}`;

      const date = document.createElement('time');
      date.className = 'stats-date';
      date.dateTime = new Date(entry.completedAt).toISOString();
      date.textContent = formatDate(entry.completedAt);

      details.append(rate, summary, date);
      item.append(details);
      list.append(item);
    }
  }

  function recordCompletedGame() {
    const score = Number(finalScore.textContent);
    const durationSeconds = Number(durationSelect.value);
    if (!Number.isFinite(score) || score < 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return;
    }

    const completedAt = Date.now();
    const id = globalThis.crypto?.randomUUID
      ? crypto.randomUUID()
      : `${completedAt}-${Math.random().toString(36).slice(2)}`;

    entries.unshift({
      id,
      completedAt,
      durationSeconds,
      score,
      answersPerMinute: score * 60 / durationSeconds,
    });

    if (!saveEntries()) {
      entries.shift();
    }
    renderEntries();
  }

  const endScreenObserver = new MutationObserver(() => {
    const isVisible = !endScreen.classList.contains('hidden');
    if (isVisible && !endScreenWasVisible) recordCompletedGame();
    endScreenWasVisible = isVisible;
  });
  endScreenObserver.observe(endScreen, { attributes: true, attributeFilter: ['class'] });

  deleteAllButton.addEventListener('click', () => {
    if (entries.length === 0) return;
    if (!window.confirm('Clear all saved results for this game?')) return;
    entries = [];
    saveEntries();
    renderEntries();
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;
    entries = loadEntries();
    renderEntries();
  });

  renderEntries();
})();
