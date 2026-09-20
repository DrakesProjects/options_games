const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/greeks.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'games/greeks.html'), 'utf8');

function seededRandom(seed = 38192) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    const classes = new Set();
    this.classList = {
      contains: (name) => classes.has(name),
      toggle: (name, force = !classes.has(name)) => force ? classes.add(name) : classes.delete(name),
    };
  }
  set innerHTML(value) { this.children = []; }
  get options() { return this.children; }
  appendChild(child) { this.children.push(child); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  closest() { return this; }
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
  const math = Object.create(Math);
  math.random = seededRandom();
  const runtime = vm.createContext({
    Math: math,
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
  vm.runInContext(source, runtime, { filename: 'greeks.js' });
  return {
    runtime, element,
    setMode(mode) {
      element('mode-select').value = mode;
      element('mode-select').listeners.change();
    },
  };
}

const optionCount = (question) => question.legs.filter((leg) => leg.type !== 'underlying').length;

test('maximum-options selector appears only for Random and Both, and preserves its selection', () => {
  const game = setup();
  assert.match(html, /<label[^>]*for="max-options-select">Maximum options<\/label>/);
  const select = html.match(/<select id="max-options-select"[^>]*>([\s\S]*?)<\/select>/)[1];
  assert.deepEqual([...select.matchAll(/value="(\d+)"/g)].map((match) => Number(match[1])), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(game.element('max-options-select').value, '4');
  assert.equal(game.element('random-position-settings').classList.contains('hidden'), true);
  for (const mode of ['custom', 'both']) {
    game.setMode(mode);
    assert.equal(game.element('random-position-settings').classList.contains('hidden'), false);
    game.element('max-options-select').value = '7';
    game.setMode('named');
    assert.equal(game.element('random-position-settings').classList.contains('hidden'), true);
    assert.equal(game.element('max-options-select').value, '7');
  }
});

test('every option count occupies an equal random interval for every supported maximum', () => {
  const { runtime } = setup();
  const remainder = seededRandom(934);
  for (let maximum = 1; maximum <= 10; maximum++) {
    for (let count = 1; count <= maximum; count++) {
      for (const offset of [0.01, 0.5, 0.99]) {
        let first = true;
        runtime.Math.random = () => {
          if (first) { first = false; return (count - 1 + offset) / maximum; }
          return remainder();
        };
        const question = runtime.generateCustomQuestion(['delta', 'gamma'], ['delta', 'gamma'], 1, maximum);
        assert.ok(question);
        assert.equal(optionCount(question), count);
      }
    }
  }
});

test('regeneration keeps the initially selected option count', () => {
  const { runtime } = setup();
  const counts = [];
  const compute = runtime.computeNetGreeks;
  runtime.computeNetGreeks = (legs) => {
    counts.push(legs.filter((leg) => leg.type !== 'underlying').length);
    return counts.length === 1 ? { delta: 0 } : compute(legs);
  };
  let first = true;
  const random = seededRandom(8102);
  runtime.Math.random = () => {
    if (first) { first = false; return 0.55; }
    return random();
  };
  const question = runtime.generateCustomQuestion(['delta'], ['delta'], 1, 5);
  assert.ok(question);
  assert.ok(counts.length >= 2);
  assert.ok(counts.every((count) => count === 3));
  assert.equal(optionCount(question), 3);
});

test('Random and Both pass the selected limit to generation without changing named positions', () => {
  const game = setup();
  for (const mode of ['custom', 'both']) {
    game.setMode(mode);
    game.element('max-options-select').value = '2';
    const modes = new Set();
    const counts = new Set();
    for (let index = 0; index < 100; index++) {
      const question = game.runtime.generateQuestion();
      modes.add(question.mode);
      if (question.mode === 'custom') {
        counts.add(optionCount(question));
        assert.ok(optionCount(question) >= 1 && optionCount(question) <= 2);
      }
    }
    assert.deepEqual([...counts].sort(), [1, 2]);
    assert.deepEqual([...modes].sort(), mode === 'both' ? ['custom', 'named'] : ['custom']);
  }
  game.setMode('named');
  game.element('max-options-select').value = '1';
  assert.equal(game.runtime.generateQuestion().mode, 'named');
});

test('stock is extra and random option positions retain mixed expirations and correct Greek signs', () => {
  const { runtime } = setup();
  let sawStock = false;
  let sawMixedExpiries = false;
  for (let index = 0; index < 100; index++) {
    const question = runtime.generateCustomQuestion(['delta', 'gamma'], ['delta', 'gamma'], 2, 4);
    assert.ok(question);
    const options = question.legs.filter((leg) => leg.type !== 'underlying');
    assert.ok(options.length >= 1 && options.length <= 4);
    assert.ok(question.legs.length - options.length <= 1);
    sawStock ||= question.legs.length > options.length;
    const expiries = new Set(options.map((leg) => leg.dte));
    if (expiries.size > 1) {
      sawMixedExpiries = true;
      for (const leg of options) assert.ok(leg.displayLabel.endsWith(`${leg.dte} DTE`));
    }
    const net = runtime.computeNetGreeks(question.legs);
    for (const item of question.items) assert.equal(item.correctSign, runtime.sign(net[item.key]));
  }
  assert.ok(sawStock);
  assert.ok(sawMixedExpiries);
});
