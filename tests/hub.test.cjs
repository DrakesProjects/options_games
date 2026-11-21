const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hubSource = fs.readFileSync(path.join(root, 'hub.js'), 'utf8');
const tabsSource = fs.readFileSync(path.join(root, 'games/tabs.js'), 'utf8');

const cards = [...html.matchAll(/<section class="hub-card" data-game="([^"]+)" data-labs="([^"]+)">([\s\S]*?)<\/section>/g)]
  .map(([, game, labs, body]) => ({
    game, labs,
    title: body.match(/<h2>([^<]+)<\/h2>/)[1],
    href: body.match(/<a href="([^"]+)" class="btn">Play<\/a>/)[1],
  }));

function classList(node) {
  const names = new Set();
  return {
    contains: (name) => names.has(name),
    add: (name) => names.add(name),
    remove: (name) => names.delete(name),
    toggle: (name, force = !names.has(name)) => (force ? names.add(name) : names.delete(name)),
  };
}

function runHub(storage, { failing = false } = {}) {
  const nodes = cards.map((card) => {
    const best = { textContent: '' };
    const weak = { textContent: '' };
    best.classList = classList(best);
    weak.classList = classList(weak);
    weak.classList.add('hidden');
    return {
      dataset: { game: card.game, labs: card.labs },
      querySelector: (selector) => ({ '[data-hub-best]': best, '[data-hub-weak]': weak })[selector],
      best, weak,
    };
  });
  const listeners = {};
  const runtime = {
    document: { querySelectorAll: (selector) => (selector === '.hub-card' ? nodes : []) },
    localStorage: {
      getItem: (key) => {
        if (failing) throw new Error('storage blocked');
        return key in storage ? storage[key] : null;
      },
    },
  };
  runtime.window = { addEventListener: (name, listener) => { listeners[name] = listener; } };
  vm.createContext(runtime);
  vm.runInContext(hubSource, runtime, { filename: 'hub.js' });
  const byGame = Object.fromEntries(nodes.map((node) => [node.dataset.game, node]));
  return { byGame, listeners };
}

test('the home page has one card per game, wired to that game\'s saved results and Labs', () => {
  assert.deepEqual(cards.map((card) => card.title), ['Put-Call Parity', 'PCP 2', 'Position Risks', 'Mental Math']);
  const sources = {
    'games/parity.html': fs.readFileSync(path.join(root, 'games/parity.js'), 'utf8'),
    'games/pcp2.html': fs.readFileSync(path.join(root, 'games/pcp2.js'), 'utf8'),
    'games/greeks.html': fs.readFileSync(path.join(root, 'js/greeks.js'), 'utf8'),
    'games/arithmetic.html': fs.readFileSync(path.join(root, 'games/arithmetic.js'), 'utf8'),
  };
  for (const card of cards) {
    const page = fs.readFileSync(path.join(root, card.href), 'utf8');
    assert.equal(page.match(/data-stats-game="([^"]+)"/)[1], card.game, card.title);
    for (const lab of card.labs.split(',')) {
      const id = lab.split(':')[0];
      const [prefix, mode] = id.split('-');
      const source = sources[card.href];
      const mounted = source.includes(`id: '${id}'`)
        || source.includes(`lab-summary.v1.${id}'`)
        || (source.includes(`\`${prefix}-\${mode}\``) && ['medium', 'hard'].includes(mode));
      assert.ok(mounted, `${card.title}: no Lab with id ${id}`);
    }
  }
  assert.match(html, /<script src="hub\.js"><\/script>/);
});

test('cards show the best rate, run count, and each Lab\'s problem area', () => {
  const { byGame } = runHub({
    'options-games.stats.v1.parity': JSON.stringify([
      { answersPerMinute: 9.25 }, { answersPerMinute: 14 }, { answersPerMinute: 0 }, { answersPerMinute: 'x' }, null,
    ]),
    'options-games.stats.v1.pcp-2': JSON.stringify([{ answersPerMinute: 6.04 }]),
    'options-games.lab-summary.v1.parity': JSON.stringify({ problemArea: 'Straddle' }),
    'options-games.lab-summary.v1.pcp2-medium': JSON.stringify({ problemArea: 'Flies' }),
    'options-games.lab-summary.v1.pcp2-hard': JSON.stringify({ problemArea: 'Time spreads' }),
    'options-games.lab-summary.v1.greeks': JSON.stringify({ problemArea: null }),
  });
  assert.equal(byGame.parity.best.textContent, 'Best: 14.0 per min · 2 runs');
  assert.equal(byGame.parity.best.classList.contains('hub-empty'), false);
  assert.equal(byGame.parity.weak.textContent, 'Problem area: Straddle');
  assert.equal(byGame.parity.weak.classList.contains('hidden'), false);

  assert.equal(byGame['pcp-2'].best.textContent, 'Best: 6.0 per min · 1 run');
  assert.equal(byGame['pcp-2'].weak.textContent, 'Problem area: Flies (Medium) · Time spreads (Hard)');

  for (const game of ['position-risks', 'arithmetic']) {
    assert.equal(byGame[game].best.textContent, 'No completed runs yet');
    assert.equal(byGame[game].best.classList.contains('hub-empty'), true);
    assert.equal(byGame[game].weak.classList.contains('hidden'), true);
  }
});

test('cards survive corrupt or blocked storage and refresh when another tab saves', () => {
  const storage = {
    'options-games.stats.v1.parity': '{not json',
    'options-games.lab-summary.v1.parity': JSON.stringify(['Straddle']),
    'options-games.lab-summary.v1.pcp2-hard': JSON.stringify({ problemArea: 42 }),
  };
  const { byGame, listeners } = runHub(storage);
  assert.equal(byGame.parity.best.textContent, 'No completed runs yet');
  assert.equal(byGame.parity.weak.classList.contains('hidden'), true);
  assert.equal(byGame['pcp-2'].weak.classList.contains('hidden'), true);

  storage['options-games.stats.v1.parity'] = JSON.stringify([{ answersPerMinute: 3 }]);
  listeners.storage();
  assert.equal(byGame.parity.best.textContent, 'Best: 3.0 per min · 1 run');

  const blocked = runHub({}, { failing: true });
  assert.equal(blocked.byGame.arithmetic.best.textContent, 'No completed runs yet');
});

class Panel {
  constructor(id = '') {
    this.id = id;
    this.attributes = {};
    this.listeners = {};
    this.children = [];
    this.classList = classList(this);
    this.tabIndex = 0;
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  append(...nodes) { this.children.push(...nodes); }
  prepend(node) { this.children.unshift(node); }
  focus() { this.focused = true; }
}

function runTabs(present) {
  const panels = { '.setup-box': new Panel(), '.lab-panel': new Panel(), '.stats-panel': new Panel('existing-id') };
  const setupScreen = new Panel('setup-screen');
  setupScreen.querySelector = (selector) => (present.includes(selector) ? panels[selector] : null);
  const runtime = {
    document: {
      getElementById: (id) => (id === 'setup-screen' ? setupScreen : null),
      createElement: () => new Panel(),
    },
  };
  vm.createContext(runtime);
  vm.runInContext(tabsSource, runtime, { filename: 'tabs.js' });
  return { setupScreen, panels, bar: setupScreen.children[0] };
}

test('setup tabs show one of Play, Lab, and History at a time, starting on Play', () => {
  const { bar, panels } = runTabs(['.setup-box', '.lab-panel', '.stats-panel']);
  assert.equal(bar.attributes.role, 'tablist');
  const tabs = bar.children;
  assert.deepEqual(tabs.map((tab) => tab.textContent), ['Play', 'Lab', 'History']);
  const hidden = () => ['.setup-box', '.lab-panel', '.stats-panel'].map((key) => panels[key].classList.contains('hidden'));
  const selected = () => tabs.map((tab) => tab.attributes['aria-selected']);
  assert.deepEqual(hidden(), [false, true, true]);
  assert.deepEqual(selected(), ['true', 'false', 'false']);
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [0, -1, -1]);

  assert.equal(tabs[1].attributes['aria-controls'], 'setup-panel-lab');
  assert.equal(panels['.lab-panel'].id, 'setup-panel-lab');
  assert.equal(tabs[2].attributes['aria-controls'], 'existing-id');
  assert.equal(panels['.setup-box'].attributes.role, 'tabpanel');

  tabs[1].listeners.click();
  assert.deepEqual(hidden(), [true, false, true]);
  assert.deepEqual(selected(), ['false', 'true', 'false']);

  let prevented = 0;
  const press = (tab, key) => tab.listeners.keydown({ key, preventDefault: () => { prevented += 1; } });
  press(tabs[1], 'ArrowRight');
  assert.deepEqual(hidden(), [true, true, false]);
  assert.equal(tabs[2].focused, true);
  press(tabs[2], 'ArrowRight');
  assert.deepEqual(hidden(), [false, true, true]);
  press(tabs[0], 'ArrowLeft');
  assert.deepEqual(hidden(), [true, true, false]);
  press(tabs[2], 'Enter');
  assert.equal(prevented, 3);
  assert.deepEqual(hidden(), [true, true, false]);
});

test('setup tabs skip missing panels and do nothing with fewer than two', () => {
  const two = runTabs(['.setup-box', '.stats-panel']);
  assert.deepEqual(two.bar.children.map((tab) => tab.textContent), ['Play', 'History']);
  const one = runTabs(['.setup-box']);
  assert.equal(one.setupScreen.children.length, 0);
  assert.equal(one.panels['.setup-box'].classList.contains('hidden'), false);
});

test('every game page loads the tabs after its panels exist', () => {
  for (const card of cards) {
    const page = fs.readFileSync(path.join(root, card.href), 'utf8');
    const scripts = [...page.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(scripts.at(-1), 'tabs.js', card.title);
    assert.equal(scripts.at(-2), 'stats.js', card.title);
  }
});
