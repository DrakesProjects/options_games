/* Lab panel for the options games. A game mounts it once and then calls
   lab.record(records) when a run ends. Practice buttons call back into the
   game, which runs that one category without saving to past results. */
(() => {
  'use strict';

  const Core = globalThis.OptionsLabCore;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const formatPercent = (value) => (value === null ? '—' : `${Math.round(value * 100)}%`);
  const formatSeconds = (value) => (value === null ? '—' : `${value.toFixed(1)}s`);

  function mount({ id, categories, metric = 'time', countLabel = 'Questions', onPractice }) {
    const setupScreen = document.getElementById('setup-screen');
    const setupBox = setupScreen.querySelector('.setup-box');
    const firstTry = metric === 'firstTry';
    const unit = countLabel.toLowerCase();

    const panel = el('section', 'lab-panel');
    panel.setAttribute('aria-labelledby', 'lab-title');
    const headingRow = el('div', 'stats-heading-row');
    const heading = el('div');
    const title = el('h2', 'stats-title', 'Lab');
    title.id = 'lab-title';
    const subtitle = el('p', 'stats-subtitle', firstTry
      ? `Last ${Core.RECENT_PER_CATEGORY} ${unit} per category · problem area = lowest first-try accuracy`
      : `Last ${Core.RECENT_PER_CATEGORY} ${unit} per category · problem area = most time per question`);
    heading.append(title, subtitle);
    const clearButton = el('button', 'stats-delete-all', 'Clear Lab');
    clearButton.type = 'button';
    headingRow.append(heading, clearButton);

    const table = el('table', 'lab-table');
    const head = el('thead');
    const headRow = el('tr');
    for (const text of ['Category', countLabel, firstTry ? 'First try' : 'Accuracy', 'Avg time']) {
      const th = el('th', '', text);
      th.scope = 'col';
      headRow.append(th);
    }
    const practiceHeader = el('th');
    practiceHeader.scope = 'col';
    practiceHeader.append(el('span', 'visually-hidden', 'Practice'));
    headRow.append(practiceHeader);
    head.append(headRow);
    const body = el('tbody');
    table.append(head, body);

    const note = el('p', 'stats-subtitle', firstTry
      ? 'Time per answer splits each question\'s time across its Greeks. Practice drills one category and isn\'t saved to past results.'
      : 'Practice drills one category and isn\'t saved to past results.');
    panel.append(headingRow, table, note);
    setupBox.after(panel);

    let storageKey = '';
    let activeCategories = [];
    let history = {};

    function load() {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
      } catch {
        return {};
      }
    }

    function save() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(history));
      } catch {
        // Storage can be unavailable (private windows); the game still works.
      }
    }

    function render() {
      const rows = Core.report(history, activeCategories, metric).map((row) => {
        const tr = el('tr', row.weakest ? 'lab-weak' : '');
        const name = el('th', '', row.label);
        name.scope = 'row';
        if (row.weakest) name.append(' ', el('span', 'lab-tag', 'Problem area'));

        const practice = el('button', 'lab-practice-btn', 'Practice');
        practice.type = 'button';
        practice.dataset.category = row.key;
        practice.setAttribute('aria-label', `Practice: ${row.label}`);
        practice.addEventListener('click', () => onPractice(row.key));
        const action = el('td');
        action.append(practice);

        tr.append(
          name,
          el('td', '', String(row.count)),
          el('td', '', formatPercent(firstTry ? row.firstTryAccuracy : row.accuracy)),
          el('td', '', formatSeconds(row.averageSeconds)),
          action,
        );
        return tr;
      });
      body.replaceChildren(...rows);
    }

    // Switch to another set of records, e.g. PCP 2's Medium vs Hard.
    function use(nextId, nextCategories) {
      storageKey = `options-games.lab.v1.${nextId}`;
      activeCategories = nextCategories;
      history = load();
      render();
    }

    function record(records) {
      if (!records.length) return;
      history = Core.addRecords(history, activeCategories, records);
      save();
      render();
    }

    clearButton.addEventListener('click', () => {
      if (!window.confirm('Clear all Lab data for this game?')) return;
      history = {};
      save();
      render();
    });

    window.addEventListener('storage', (event) => {
      if (event.key !== storageKey) return;
      history = load();
      render();
    });

    use(id, categories);
    return {
      record,
      use,
      labelOf: (key) => activeCategories.find((category) => category.key === key)?.label || key,
      panel,
    };
  }

  globalThis.OptionsLab = { mount };
})();
