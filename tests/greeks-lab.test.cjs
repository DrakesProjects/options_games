const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'games/greeks.html'), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.style = {};
    this.value = '';
    this.textContent = '';
    this.checked = false;
    this.disabled = false;
    this.classes = new Set();
    this.classList = {
      contains: (name) => this.classes.has(name),
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, force = !this.classes.has(name)) => (force ? this.classes.add(name) : this.classes.delete(name)),
    };
  }
  get className() { return [...this.classes].join(' '); }
  set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
  // Rows are built from markup; create the sign buttons it describes.
  set innerHTML(value) {
    this.markup = value;
    this.children = [...String(value).matchAll(/data-sign="([^"]+)"/g)].map(([, sign]) => {
      const button = new Element();
      button.className = 'sign-btn';
      button.dataset.sign = sign;
      return button;
    });
  }
  get innerHTML() { return this.markup || ''; }
  get options() { return this.children; }
  appendChild(child) { this.children.push(child); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  closest() { return this; }
  querySelectorAll(selector) {
    const name = selector.slice(1);
    return this.children.filter((child) => child.classList.contains(name));
  }
  querySelector(selector) {
    if (selector !== '.sign-btn.selected') return null;
    return this.children.find((child) => child.classList.contains('sign-btn') && child.classList.contains('selected')) || null;
  }
}

function setup() {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  for (const [, id, content] of html.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const options = [...content.matchAll(/<option value="([^"]+)"([^>]*)>/g)];
    element(id).value = (options.find((option) => option[2].includes('selected')) || options[0] || [])[1] || '';
  }
  const checkboxes = [...html.matchAll(/<input\b([^>]*class="greek-check"[^>]*)>/g)].map(([, attributes]) => {
    const checkbox = new Element();
    checkbox.value = attributes.match(/value="([^"]+)"/)[1];
    checkbox.checked = /\bchecked\b/.test(attributes);
    checkbox.namedOnly = attributes.includes('data-named-only');
    return checkbox;
  });
  let clock = 0;
  let tick = null;
  const recorded = [];
  let labOptions;
  const runtime = vm.createContext({
    Date: { now: () => clock },
    setInterval: (callback) => { tick = callback; return 1; },
    clearInterval: () => { tick = null; },
    OptionsLab: {
      mount(options) {
        labOptions = options;
        return {
          record: (records) => recorded.push(plain(records)),
          use() {},
          labelOf: (key) => options.categories.find((category) => category.key === key).label,
        };
      },
    },
    document: {
      getElementById: element,
      createElement: () => new Element(),
      querySelectorAll: (selector) => {
        if (selector === '.greek-check') return checkboxes;
        if (selector === '.greek-check[data-named-only]') return checkboxes.filter((item) => item.namedOnly);
        if (selector === '.greek-check:checked') return checkboxes.filter((item) => item.checked);
        if (selector === '.greek-check:not(:disabled)') return checkboxes.filter((item) => !item.disabled);
        throw new Error(`Unexpected selector: ${selector}`);
      },
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/position-structures.js'), 'utf8'), runtime);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/greeks.js'), 'utf8'), runtime);

  const question = () => vm.runInContext('currentQuestion', runtime);
  const rows = () => element('greek-items-area').children;
  // Pick a sign for each row (the right one unless listed in `wrongKeys`), then submit.
  function answer(wrongKeys = []) {
    const items = question().items;
    rows().forEach((row, index) => {
      if (row.classList.contains('item-correct')) return;
      const correct = items[index].correctSign;
      const sign = wrongKeys.includes(items[index].key)
        ? ['+', '-', '~0'].find((option) => option !== correct) : correct;
      row.children.find((button) => button.dataset.sign === sign).listeners.click();
    });
    element('submit-btn').listeners.click();
  }
  return {
    element, recorded, question, answer,
    lab: () => labOptions,
    setClock: (value) => { clock = value; },
    setMode(mode) {
      element('mode-select').value = mode;
      element('mode-select').listeners.change();
    },
    start: () => element('start-btn').listeners.click({ type: 'click' }),
    expire() { while (tick) tick(); },
  };
}

const CATEGORY = {
  delta: 'spot', gamma: 'spot', speed: 'spot',
  theta: 'time', charm: 'time', color: 'time', vegaDecay: 'time',
  vega: 'vol', vanna: 'vol', volga: 'vol', zomma: 'vol',
  rho: 'rates',
};

test('Position Risks Lab groups Greeks by what moves and ranks by first-try accuracy', () => {
  const game = setup();
  const options = game.lab();
  assert.deepEqual(plain(options.categories), [
    { key: 'spot', label: 'Spot' }, { key: 'time', label: 'Time' },
    { key: 'vol', label: 'Volatility' }, { key: 'rates', label: 'Rates' },
  ]);
  assert.equal(options.metric, 'firstTry');
  assert.equal(options.countLabel, 'Answers');
});

test('each Greek answered is recorded with its category, a share of the time, and its own misses', () => {
  const game = setup();
  game.element('batch-select').value = 'all';
  game.start();
  const first = game.question().items.map((item) => item.key);
  assert.deepEqual([...first].sort(), ['delta', 'gamma', 'theta', 'vega']);
  game.setClock(4000);
  game.answer();

  const second = game.question().items.map((item) => item.key);
  game.answer([second[0]]);
  game.answer([second[0]]);
  game.setClock(10000);
  game.answer();
  game.question(); // a third question is showing when time runs out
  game.expire();

  assert.equal(game.recorded.length, 1);
  const log = game.recorded[0];
  assert.deepEqual(log.map((record) => record.category), [...first, ...second].map((key) => CATEGORY[key]));
  assert.deepEqual(log.map((record) => record.ms), [1000, 1000, 1000, 1000, 1500, 1500, 1500, 1500]);
  assert.deepEqual(log.map((record) => record.wrongEntries), [0, 0, 0, 0, 2, 0, 0, 0]);
  assert.equal(game.element('end-screen').dataset.statsIgnore, 'false');
  assert.equal(game.element('end-title').textContent, "Time's up");
});

test('practice drills one category whatever is checked, and is not saved to past results', () => {
  const game = setup();
  game.element('batch-select').value = 'all';
  game.lab().onPractice('vol');
  assert.equal(game.element('practice-tag').textContent, 'Practice: Volatility');
  assert.equal(game.element('practice-tag').classList.contains('hidden'), false);
  for (let round = 0; round < 5; round++) {
    assert.deepEqual([...game.question().items.map((item) => item.key)].sort(), ['vanna', 'vega', 'volga', 'zomma']);
    game.answer();
  }
  game.expire();
  assert.ok(game.recorded[0].every((record) => record.category === 'vol'));
  assert.equal(game.element('end-screen').dataset.statsIgnore, 'true');
  assert.equal(game.element('end-title').textContent, 'Practice: Volatility');

  game.element('play-again-btn').listeners.click();
  game.start();
  assert.equal(game.element('practice-tag').classList.contains('hidden'), true);
  game.expire();
  assert.equal(game.element('end-screen').dataset.statsIgnore, 'false');
});

test('practice leaves out named-only Greeks outside Named mode and caps the batch size', () => {
  const game = setup();
  game.setMode('custom');
  game.element('batch-select').value = 'all';
  game.lab().onPractice('spot');
  for (let round = 0; round < 10; round++) {
    const keys = game.question().items.map((item) => item.key);
    assert.ok(keys.every((key) => key === 'delta' || key === 'gamma'), keys.join());
    game.answer();
  }
  game.expire();

  game.element('play-again-btn').listeners.click();
  game.element('batch-select').value = '3';
  game.lab().onPractice('rates');
  assert.deepEqual(plain(game.question().items.map((item) => item.key)), ['rho']);
  game.expire();
});
