const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const Core = require('../js/lab-core.js');

const categories = [{ key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }, { key: 'c', label: 'Gamma' }];
const records = (category, count, ms, wrongEntries = 0) =>
  Array.from({ length: count }, () => ({ category, ms, wrongEntries }));

test('records are grouped by category, cleaned, trimmed, and never dropped for hidden categories', () => {
  let history = Core.addRecords({ old: [{ ms: 5, wrongEntries: 0, at: 1 }] }, categories, [
    { category: 'a', ms: 1234.6, wrongEntries: 2 },
    { category: 'a', ms: -1, wrongEntries: 0 },
    { category: 'b', ms: 'x' },
    { category: 'b', ms: 900, wrongEntries: -3 },
    { category: 'zzz', ms: 100, wrongEntries: 0 },
  ], 42);
  assert.deepEqual(history.a, [{ ms: 1235, wrongEntries: 2, at: 42 }]);
  assert.deepEqual(history.b, [{ ms: 900, wrongEntries: 0, at: 42 }]);
  assert.deepEqual(history.c, []);
  assert.deepEqual(history.old, [{ ms: 5, wrongEntries: 0, at: 1 }]);
  assert.equal(history.zzz, undefined);

  history = Core.addRecords(history, categories, records('a', Core.STORED_PER_CATEGORY + 5, 10));
  assert.equal(history.a.length, Core.STORED_PER_CATEGORY);
});

test('report uses the most recent questions and counts wrong entries against accuracy', () => {
  const history = Core.addRecords({}, categories, [
    ...records('a', 300, 99999, 5),
    ...records('a', 150, 2000, 0),
    ...records('a', 50, 4000, 1),
    { category: 'b', ms: 3000, wrongEntries: 0 },
  ]);
  const [a, b, c] = Core.report(history, categories);
  assert.equal(a.count, Core.RECENT_PER_CATEGORY);
  assert.equal(a.accuracy, 200 / 250);
  assert.equal(a.firstTryAccuracy, 150 / 200);
  assert.ok(Math.abs(a.averageSeconds - (150 * 2 + 50 * 4) / 200) < 1e-12);
  assert.equal(b.count, 1);
  assert.equal(b.enoughData, false);
  assert.deepEqual([c.count, c.accuracy, c.firstTryAccuracy, c.averageSeconds], [0, null, null, null]);
  assert.equal(c.label, 'Gamma');
});

test('a problem area needs two categories with enough data, ranked by the chosen metric', () => {
  const minimum = Core.MINIMUM_FOR_RANKING;
  let history = Core.addRecords({}, categories, [...records('a', minimum, 9000, 1), ...records('b', minimum - 1, 1000)]);
  assert.ok(Core.report(history, categories).every((row) => !row.weakest));

  // Alpha is slow but always right first time; Gamma is fast but misses.
  history = Core.addRecords({}, categories, [
    ...records('a', minimum, 9000, 0), ...records('b', minimum, 1000, 0), ...records('c', minimum, 2000, 1),
  ]);
  assert.deepEqual(Core.report(history, categories, 'time').map((row) => row.weakest), [true, false, false]);
  assert.deepEqual(Core.report(history, categories, 'firstTry').map((row) => row.weakest), [false, false, true]);
});

class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.dataset = {};
    this.className = '';
    this.textContent = '';
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  after(node) { this.parent.children.splice(this.parent.children.indexOf(this) + 1, 0, node); }
  get text() {
    return [this.textContent, ...this.children.map((child) => (typeof child === 'string' ? child : child.text))].join('');
  }
  find(predicate) {
    if (predicate(this)) return this;
    for (const child of this.children) {
      const found = typeof child === 'object' && child.find(predicate);
      if (found) return found;
    }
    return null;
  }
  findAll(predicate, out = []) {
    if (predicate(this)) out.push(this);
    for (const child of this.children) if (typeof child === 'object') child.findAll(predicate, out);
    return out;
  }
}

function mountPanel(options = {}) {
  const setupScreen = new Element('div');
  const setupBox = new Element('div');
  setupBox.parent = setupScreen;
  setupScreen.children.push(setupBox);
  setupScreen.querySelector = (selector) => (selector === '.setup-box' ? setupBox : null);
  const store = new Map();
  const practiced = [];
  let confirmAnswer = true;
  const runtime = {
    document: {
      getElementById: (id) => (id === 'setup-screen' ? setupScreen : null),
      createElement: (tag) => new Element(tag),
    },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
    },
  };
  runtime.window = {
    confirm: () => confirmAnswer,
    addEventListener: (name, listener) => { runtime.storageListener = listener; },
  };
  vm.createContext(runtime);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/lab-core.js'), 'utf8'), runtime);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../games/lab.js'), 'utf8'), runtime);
  const lab = runtime.OptionsLab.mount({
    id: 'demo', categories, onPractice: (key) => practiced.push(key), ...options,
  });
  const rows = () => lab.panel.find((node) => node.tag === 'tbody').children;
  return {
    lab, setupScreen, store, practiced, rows,
    setConfirm: (value) => { confirmAnswer = value; },
  };
}

test('the Lab panel sits after the settings, lists every category, and starts practice', () => {
  const { lab, setupScreen, rows, practiced } = mountPanel();
  assert.equal(setupScreen.children[1], lab.panel);
  assert.deepEqual(rows().map((row) => row.children[0].text), ['Alpha', 'Beta', 'Gamma']);
  assert.deepEqual(rows()[0].children.slice(1, 4).map((cell) => cell.text), ['0', '—', '—']);
  const header = lab.panel.find((node) => node.tag === 'thead').text;
  assert.match(header, /Accuracy/);
  assert.match(lab.panel.text, /most time per question/);

  const practice = rows()[1].find((node) => node.className === 'lab-practice-btn');
  assert.equal(practice.attributes['aria-label'], 'Practice: Beta');
  practice.listeners.click();
  assert.deepEqual(practiced, ['b']);
  assert.equal(lab.labelOf('c'), 'Gamma');
});

test('recording saves per game, flags the problem area, and Clear Lab asks first', () => {
  const { lab, store, rows, setConfirm } = mountPanel();
  lab.record([...records('a', 10, 6000, 1), ...records('b', 10, 2000)]);
  const saved = JSON.parse(store.get('options-games.lab.v1.demo'));
  assert.equal(saved.a.length, 10);
  assert.deepEqual(rows()[0].children.slice(1, 4).map((cell) => cell.text), ['10', '50%', '6.0s']);
  assert.equal(rows()[0].className, 'lab-weak');
  assert.match(rows()[0].children[0].text, /Problem area/);
  assert.equal(rows()[1].className, '');

  const clear = lab.panel.find((node) => node.textContent === 'Clear Lab');
  setConfirm(false);
  clear.listeners.click();
  assert.equal(rows()[0].children[1].text, '10');
  setConfirm(true);
  clear.listeners.click();
  assert.equal(rows()[0].children[1].text, '0');
  assert.equal(store.get('options-games.lab.v1.demo'), '{}');
});

test('use() switches to a separate record set with its own categories', () => {
  const { lab, store, rows } = mountPanel();
  lab.record(records('a', 3, 1000));
  lab.use('demo-hard', [{ key: 'b', label: 'Beta' }]);
  assert.deepEqual(rows().map((row) => row.children[0].text), ['Beta']);
  assert.equal(rows()[0].children[1].text, '0');
  lab.record(records('b', 2, 1000));
  assert.equal(JSON.parse(store.get('options-games.lab.v1.demo-hard')).b.length, 2);
  lab.use('demo', categories);
  assert.equal(rows()[0].children[1].text, '3');
});

test('first-try Labs label their columns for shared-timer answers', () => {
  const { lab } = mountPanel({ metric: 'firstTry', countLabel: 'Answers' });
  const header = lab.panel.find((node) => node.tag === 'thead').text;
  assert.match(header, /Answers/);
  assert.match(header, /First try/);
  assert.match(lab.panel.text, /lowest first-try accuracy/);
  assert.match(lab.panel.text, /splits each question's time/);
});
