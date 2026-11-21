const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const Core = require('../js/arithmetic-core.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'games/arithmetic.html'), 'utf8');
const controllerSource = fs.readFileSync(path.join(root, 'games/arithmetic.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(root, 'js/arithmetic-core.js'), 'utf8');
const statsSource = fs.readFileSync(path.join(root, 'games/stats.js'), 'utf8');

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function solve(text) {
  const [a, op, b] = text.split(' ');
  const [x, y] = [Number(a), Number(b)];
  return { '+': x + y, '−': x - y, '×': x * y, '÷': x / y }[op];
}

// ─── Core ────────────────────────────────────────────────────────────────────

test('standard settings match the agreed defaults, and bad settings are normalized', () => {
  const standard = Core.normalizeSettings();
  assert.deepEqual(standard.operations, { add: true, sub: true, mul: true, div: true });
  assert.deepEqual(standard.addition, { left: { min: 2, max: 100 }, right: { min: 2, max: 100 } });
  assert.deepEqual(standard.multiplication, { left: { min: 2, max: 12 }, right: { min: 2, max: 100 } });
  assert.ok(Core.isStandard(standard));

  const odd = Core.normalizeSettings({
    operations: { add: false, sub: 'yes' },
    addition: { left: { min: 50, max: 5 }, right: { min: -3, max: 'abc' } },
    multiplication: { left: { min: 0, max: 99999 }, right: { min: 7.6, max: 7.4 } },
  });
  assert.deepEqual(odd.operations, { add: false, sub: true, mul: true, div: true });
  assert.deepEqual(odd.addition.left, { min: 5, max: 50 }, 'reversed bounds swap');
  assert.deepEqual(odd.addition.right, { min: 1, max: 100 }, 'nonsense falls back, minimum is 1');
  assert.deepEqual(odd.multiplication.left, { min: 1, max: 9999 }, 'zero divisor impossible');
  assert.deepEqual(odd.multiplication.right, { min: 7, max: 8 });
  assert.equal(Core.isStandard(odd), false);
});

test('every operation stays inside its ranges with whole, positive answers', () => {
  const random = seededRandom(7);
  const settings = Core.normalizeSettings();
  const inRange = (value, { min, max }) => value >= min && value <= max;
  const seenMulSides = new Set();
  for (let i = 0; i < 4000; i++) {
    const add = Core.createProblem('add', settings, random);
    assert.ok(inRange(add.a, settings.addition.left) && inRange(add.b, settings.addition.right));
    assert.equal(add.answer, add.a + add.b);

    const sub = Core.createProblem('sub', settings, random);
    assert.equal(sub.a - sub.b, sub.answer);
    assert.ok(sub.answer >= 2 && sub.answer <= 100 && sub.b >= 2 && sub.b <= 100);

    const mul = Core.createProblem('mul', settings, random);
    assert.equal(mul.answer, mul.a * mul.b);
    const smallFirst = inRange(mul.a, settings.multiplication.left) && inRange(mul.b, settings.multiplication.right);
    const smallSecond = inRange(mul.b, settings.multiplication.left) && inRange(mul.a, settings.multiplication.right);
    assert.ok(smallFirst || smallSecond);
    if (mul.a <= 12 && mul.b > 12) seenMulSides.add('first');
    if (mul.b <= 12 && mul.a > 12) seenMulSides.add('second');

    const div = Core.createProblem('div', settings, random);
    assert.ok(Number.isInteger(div.answer) && div.a === div.b * div.answer);
    assert.ok(inRange(div.b, settings.multiplication.left) && inRange(div.answer, settings.multiplication.right));

    for (const problem of [add, sub, mul, div]) assert.equal(solve(problem.text), problem.answer);
  }
  assert.deepEqual(seenMulSides, new Set(['first', 'second']), 'small factor appears on both sides');
});

test('custom ranges are respected', () => {
  const settings = Core.normalizeSettings({
    addition: { left: { min: 100, max: 999 }, right: { min: 100, max: 999 } },
    multiplication: { left: { min: 13, max: 19 }, right: { min: 3, max: 3 } },
  });
  const random = seededRandom(3);
  for (let i = 0; i < 500; i++) {
    const add = Core.createProblem('add', settings, random);
    assert.ok(add.a >= 100 && add.a <= 999 && add.b >= 100 && add.b <= 999);
    const div = Core.createProblem('div', settings, random);
    assert.ok(div.b >= 13 && div.b <= 19 && div.answer === 3);
  }
});

test('the generator uses only enabled or practiced operations, roughly evenly, without immediate repeats', () => {
  const settings = Core.normalizeSettings({ operations: { add: true, sub: false, mul: true, div: false } });
  const next = Core.createGenerator(settings, { random: seededRandom(11) });
  const counts = { add: 0, sub: 0, mul: 0, div: 0 };
  let previous = null;
  for (let i = 0; i < 4000; i++) {
    const problem = next();
    counts[problem.op] += 1;
    assert.notEqual(problem.text, previous);
    previous = problem.text;
  }
  assert.equal(counts.sub + counts.div, 0);
  assert.ok(Math.abs(counts.add - counts.mul) < 300, JSON.stringify(counts));

  const practice = Core.createGenerator(settings, { operations: ['div'], random: seededRandom(2) });
  for (let i = 0; i < 200; i++) assert.equal(practice().op, 'div', 'practice ignores the enabled toggles');

  const none = Core.normalizeSettings({ operations: { add: false, sub: false, mul: false, div: false } });
  assert.throws(() => Core.createGenerator(none));
});

test('entries are pending until full length, then correct or wrong', () => {
  const problem = { answer: 62 };
  assert.equal(Core.evaluateEntry(problem, ''), 'pending');
  assert.equal(Core.evaluateEntry(problem, '6'), 'pending');
  assert.equal(Core.evaluateEntry(problem, '62'), 'correct');
  assert.equal(Core.evaluateEntry(problem, '94'), 'wrong');
  assert.equal(Core.evaluateEntry(problem, '621'), 'wrong');
  assert.equal(Core.sanitizeEntry(' 6a2-'), '62');
  assert.equal(Core.evaluateEntry(problem, '6 2'), 'correct');
});

test('run summary counts skips and wrong entries against accuracy', () => {
  const log = [
    { correct: true, skipped: false, wrongEntries: 0 },
    { correct: true, skipped: false, wrongEntries: 2 },
    { correct: false, skipped: true, wrongEntries: 1 },
    { correct: true, skipped: false, wrongEntries: 0 },
  ];
  const summary = Core.summarizeRun(log, 120);
  assert.equal(summary.score, 3);
  assert.equal(summary.skips, 1);
  assert.equal(summary.wrongEntries, 3);
  assert.equal(summary.accuracy, 3 / 7);
  assert.equal(summary.questionsPerMinute, 1.5);
  assert.equal(Core.summarizeRun([], 60).accuracy, null);
});

test('the Lab reports four broad operations and flags the most time per correct answer', () => {
  const entry = (op, correct, ms, extra = {}) => ({ op, a: 1, b: 1, correct, skipped: !correct, wrongEntries: 0, ms, ...extra });
  const log = [];
  for (let i = 0; i < 12; i++) log.push(entry('add', true, 1000));
  for (let i = 0; i < 12; i++) log.push(entry('mul', i % 2 === 0, 1500));
  for (let i = 0; i < 5; i++) log.push(entry('div', true, 9000));
  const history = Core.addToLab({}, log, 123);
  const report = Core.labReport(history);
  assert.deepEqual(report.map((row) => row.label), ['Addition', 'Subtraction', 'Multiplication', 'Division']);

  const byOp = Object.fromEntries(report.map((row) => [row.op, row]));
  assert.equal(byOp.mul.weakest, true, 'slow-per-correct with enough data');
  assert.equal(byOp.div.weakest, false, 'too few questions to judge');
  assert.equal(byOp.add.weakest, false);
  assert.equal(byOp.mul.accuracy, 0.5);
  assert.equal(byOp.mul.averageSeconds, 1.5);
  assert.equal(byOp.mul.secondsPerCorrect, 3);
  assert.equal(byOp.sub.questions, 0);
  assert.equal(byOp.sub.accuracy, null);
  assert.equal(history.add[0].at, 123);

  // Only the most recent questions count, so an improved operation recovers.
  let improved = history;
  for (let i = 0; i < 3; i++) {
    improved = Core.addToLab(improved, Array.from({ length: 100 }, () => entry('mul', true, 500)));
  }
  const recovered = Object.fromEntries(Core.labReport(improved).map((row) => [row.op, row]));
  assert.equal(recovered.mul.questions, Core.LAB_RECENT_QUESTIONS);
  assert.equal(recovered.mul.accuracy, 1);
  assert.equal(recovered.add.weakest, true);

  const never = Core.labReport(Core.addToLab({}, [
    ...Array.from({ length: 10 }, () => entry('add', true, 1000)),
    ...Array.from({ length: 10 }, () => entry('sub', false, 1000)),
  ]));
  assert.equal(never[1].secondsPerCorrect, Infinity);
  assert.equal(never[1].weakest, true, 'zero correct answers is the weakest');
});

// ─── Page and controller ─────────────────────────────────────────────────────

test('page loads the core before the controller, and every referenced id exists', () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts, ['../js/arithmetic-core.js', 'arithmetic.js', 'stats.js']);
  for (const script of scripts) assert.ok(fs.existsSync(path.resolve(root, 'games', script)));
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, id] of controllerSource.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.has(id), `missing #${id}`);
  for (const id of ['add-left-min', 'add-left-max', 'add-right-min', 'add-right-max', 'mul-left-min', 'mul-left-max', 'mul-right-min', 'mul-right-max']) {
    assert.ok(ids.has(id), `missing #${id}`);
  }
  assert.match(html, /data-stats-game="arithmetic"/);
  assert.ok(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('games/arithmetic.html'));
});

class FakeElement {
  constructor(tagName = 'DIV', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.textContent = '';
    this.innerHTML = '';
    this.options = [];
    this.selectors = {};
    const classes = new Set();
    this.classList = {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force = !classes.has(name)) => { if (force) classes.add(name); else classes.delete(name); return force; },
    };
  }

  get className() { return [...this._classes()].join(' '); }
  set className(value) { for (const name of String(value).split(/\s+/).filter(Boolean)) this.classList.add(name); }
  _classes() { return ['hidden', 'theme-dark', 'selected', 'lab-weak', 'warning'].filter((name) => this.classList.contains(name)); }
  get selectedIndex() { return Math.max(0, this.options.findIndex((option) => option.value === this.value)); }
  append(...children) { this.children.push(...children.filter((child) => typeof child === 'object')); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  dispatch(name, event = {}) {
    const full = { target: this, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...event };
    for (const listener of this.listeners[name] || []) listener(full);
    return full;
  }
  focus() { this.focused = true; }
  querySelector(selector) { return (this.selectors[selector] ||= new FakeElement()); }
  querySelectorAll() { return []; }
  find(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const nested = child.find?.(predicate);
      if (nested) return nested;
    }
    return null;
  }
}

function setupPage({ coarse = false, storage = {}, confirm = true } = {}) {
  const elements = {};
  for (const match of html.matchAll(/<(\w+)([^>]*?)\sid="([^"]+)"([^>]*)>/g)) {
    elements[match[3]] = new FakeElement(match[1], match[3]);
    if (/class="[^"]*\bhidden\b/.test(match[2] + match[4])) elements[match[3]].classList.add('hidden');
  }
  const optionsFor = (id) => {
    const block = html.split(`id="${id}"`)[1].split('</select>')[0];
    return [...block.matchAll(/<option value="([^"]+)"[^>]*>([^<]+)</g)].map((match) => ({ value: match[1], textContent: match[2] }));
  };
  for (const id of ['duration-select', 'theme-select']) elements[id].options = optionsFor(id);
  elements['duration-select'].value = '120';
  elements['theme-select'].value = 'light';
  const opChecks = ['add', 'sub', 'mul', 'div'].map((value) => Object.assign(new FakeElement('input'), { value, checked: true }));
  const numpadKeys = [...html.matchAll(/data-key="([^"]+)"/g)].map((match) => {
    const key = new FakeElement('button');
    key.dataset.key = match[1];
    return key;
  });

  const documentListeners = {};
  const body = new FakeElement('body');
  const store = { ...storage };
  let clock = 1000;
  let frame = null;
  const observers = [];
  const document = {
    body,
    getElementById: (id) => elements[id] || null,
    querySelectorAll: (selector) => (selector === '.op-check' ? opChecks : selector === '.numpad-key' ? numpadKeys : []),
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (_, tag) => new FakeElement(tag),
    addEventListener: (name, listener) => { (documentListeners[name] ||= []).push(listener); },
  };
  body.dataset.statsGame = 'arithmetic';
  const runtime = vm.createContext({
    document,
    window: { confirm: () => confirm, addEventListener() {} },
    localStorage: {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, value) => { store[key] = String(value); },
    },
    performance: { now: () => clock },
    requestAnimationFrame: (callback) => { frame = callback; return 1; },
    cancelAnimationFrame: () => { frame = null; },
    matchMedia: () => ({ matches: coarse }),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
    },
    Intl,
    Date,
    crypto: { randomUUID: () => `id-${Math.random()}` },
    console,
  });
  runtime.globalThis = runtime;
  vm.runInContext(coreSource, runtime, { filename: 'arithmetic-core.js' });
  vm.runInContext(controllerSource, runtime, { filename: 'arithmetic.js' });
  vm.runInContext(statsSource, runtime, { filename: 'stats.js' });

  const el = (id) => elements[id];
  const visible = (id) => !el(id).classList.contains('hidden');
  const key = (name, target = body) => {
    const event = { key: name, code: name === ' ' ? 'Space' : name, target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const listener of documentListeners.keydown || []) listener(event);
    return event;
  };
  const type = (value) => {
    el('answer-input').value = value;
    el('answer-input').dispatch('input');
  };
  const answer = () => solve(el('problem').textContent);
  const tick = (ms) => {
    clock += ms;
    if (frame) frame();
  };
  const flushStats = () => { for (const observer of observers) observer.callback(); };
  const statsEntries = () => JSON.parse(store['options-games.stats.v1.arithmetic'] || '[]');
  const lab = () => JSON.parse(store['options-games.arithmetic.v1.lab'] || '{}');
  const practiceButton = (op) => el('lab-body').find((child) => child.dataset?.op === op);
  const pad = (name) => numpadKeys.find((button) => button.dataset.key === name).dispatch('click');
  return { el, visible, key, type, answer, tick, flushStats, statsEntries, lab, practiceButton, pad, opChecks, store, body };
}

test('boots to setup with a four-row Lab and the standard ranges', () => {
  const page = setupPage();
  assert.ok(page.visible('setup-screen'));
  assert.ok(!page.visible('game-screen'));
  assert.equal(page.el('lab-body').children.length, 4);
  assert.equal(page.el('mul-left-max').value, '12');
  assert.equal(page.el('add-right-max').value, '100');
  assert.match(page.el('best-note').textContent, /No personal best yet for 2 min/);
});

test('correct answers advance without Enter; wrong full-length entries are counted once each', () => {
  const page = setupPage();
  page.el('start-btn').dispatch('click');
  assert.ok(page.visible('game-screen') && page.visible('top-bar-right'));

  const first = page.el('problem').textContent;
  page.type(String(page.answer()));
  assert.equal(page.el('score-value').textContent, '1');
  assert.notEqual(page.el('problem').textContent, first);
  assert.equal(page.el('answer-input').value, '');

  const target = String(page.answer());
  const wrong = target[0] === '9' ? '1' + target.slice(1) : String(Number(target[0]) + 1) + target.slice(1);
  page.type(wrong);
  page.type(wrong + '5');
  page.type(wrong.slice(0, -1));
  page.type(wrong);
  page.type('');
  page.type(target);
  assert.equal(page.el('score-value').textContent, '2');

  page.tick(120000);
  assert.ok(page.visible('end-screen'));
  assert.equal(page.el('final-score').textContent, '2');
  assert.equal(page.el('end-accuracy').textContent, `${Math.round(2 / 4 * 100)}%`);
  assert.equal(page.el('end-qpm').textContent, '1.0 QPM');
  const chart = page.el('run-chart');
  const points = chart.children.filter((child) => child.attributes.class?.startsWith('run-chart-point'));
  assert.equal(points.length, 2, 'the unanswered question at the buzzer is excluded');
  assert.match(points[1].attributes.class, /point-retry/);
  points[1].dispatch('click');
  assert.match(page.el('run-detail').textContent, /#2 · .* = \d+ · correct after 2 wrong entries · \d+\.\ds/);
});

test('input keeps digits only', () => {
  const page = setupPage();
  page.el('start-btn').dispatch('click');
  page.type('1a 2');
  assert.equal(page.el('answer-input').value, '12');
});

test('Enter skips, Space restarts, and Esc quits without recording anything', () => {
  const page = setupPage();
  page.key(' ');
  assert.ok(page.visible('game-screen'), 'Space starts from setup');

  const before = page.el('problem').textContent;
  page.type('7');
  const enter = page.key('Enter', page.el('answer-input'));
  assert.ok(enter.defaultPrevented);
  assert.notEqual(page.el('problem').textContent, before);

  page.type(String(page.answer()));
  assert.equal(page.el('score-value').textContent, '1');
  const space = page.key(' ', page.el('answer-input'));
  assert.ok(space.defaultPrevented, 'Space never types into the answer');
  assert.equal(page.el('score-value').textContent, '0', 'restart resets the score');
  assert.ok(page.visible('game-screen'));

  page.type(String(page.answer()));
  page.key('Escape', page.el('answer-input'));
  assert.ok(page.visible('setup-screen'));
  page.flushStats();
  assert.deepEqual(page.statsEntries(), []);
  assert.deepEqual(page.lab(), {});
  page.tick(500000);
  assert.ok(page.visible('setup-screen'), 'a quit run never reaches the end screen');
});

test('skips lower accuracy and show what was typed in the chart detail', () => {
  const page = setupPage();
  page.el('start-btn').dispatch('click');
  page.type(String(page.answer()));
  page.type('9');
  page.key('Enter', page.el('answer-input'));
  page.tick(120000);
  assert.equal(page.el('end-skips').textContent, '1');
  assert.equal(page.el('end-accuracy').textContent, '50%');
  const skipPoint = page.el('run-chart').children.find((child) => /point-skip/.test(child.attributes.class || ''));
  skipPoint.dispatch('click');
  assert.match(page.el('run-detail').textContent, /skipped \(had typed 9\)/);
});

test('completed runs save past results, personal bests, and Lab data', () => {
  const page = setupPage();
  page.el('start-btn').dispatch('click');
  for (let i = 0; i < 3; i++) page.type(String(page.answer()));
  page.tick(120000);
  assert.equal(page.el('end-screen').dataset.statsIgnore, 'false');
  assert.equal(page.el('best-message').textContent, 'New personal best!');
  page.flushStats();
  assert.equal(page.statsEntries().length, 1);
  assert.equal(page.statsEntries()[0].score, 3);
  const lab = page.lab();
  assert.equal(Object.values(lab).flat().length, 3);

  page.el('menu-btn').dispatch('click');
  assert.match(page.el('best-note').textContent, /Personal best \(2 min\): 3/);

  page.key(' ');
  page.type(String(page.answer()));
  page.tick(120000);
  assert.equal(page.el('best-message').textContent, '', 'a lower score is not a best');
});

test('target practice drills one operation, updates the Lab, and is not saved to past results', () => {
  const page = setupPage();
  page.practiceButton('div').dispatch('click');
  assert.ok(page.visible('game-screen'));
  assert.ok(page.visible('practice-tag'));
  assert.equal(page.el('practice-tag').textContent, 'Practice: Division');
  for (let i = 0; i < 25; i++) {
    assert.match(page.el('problem').textContent, / ÷ /);
    page.type(String(page.answer()));
  }

  page.key(' ', page.el('answer-input'));
  assert.equal(page.el('practice-tag').textContent, 'Practice: Division', 'restart keeps practice mode');
  page.type(String(page.answer()));
  page.tick(120000);
  assert.equal(page.el('end-title').textContent, 'Target practice: Division');
  assert.equal(page.el('end-screen').dataset.statsIgnore, 'true');
  page.flushStats();
  assert.deepEqual(page.statsEntries(), []);
  assert.equal(page.lab().div.length, 1);
  assert.equal(page.lab().add.length, 0);
  assert.match(page.el('best-note').textContent, /No personal best yet/);

  page.el('play-again-btn').dispatch('click');
  assert.match(page.el('problem').textContent, / ÷ /, 'Play again repeats the practice');
});

test('settings are clamped, saved, and reset; no operations means no start', () => {
  const page = setupPage();
  page.el('mul-left-min').value = '20';
  page.el('mul-left-min').dispatch('change');
  assert.equal(page.el('mul-left-min').value, '12');
  assert.equal(page.el('mul-left-max').value, '20', 'reversed bounds are swapped in place');

  for (const check of page.opChecks) {
    check.checked = false;
    check.dispatch('change');
  }
  assert.equal(page.el('start-btn').disabled, true);
  assert.match(page.el('setup-error').textContent, /at least one operation/);
  page.key(' ');
  assert.ok(page.visible('setup-screen'), 'Space does not start with nothing selected');
  page.practiceButton('add').dispatch('click');
  assert.ok(page.visible('game-screen'), 'practice still works for a disabled operation');
  page.key('Escape', page.el('answer-input'));

  page.el('theme-select').value = 'dark';
  page.el('theme-select').dispatch('change');
  assert.ok(page.body.classList.contains('theme-dark'));

  const saved = JSON.parse(page.store['options-games.arithmetic.v1.settings']);
  assert.equal(saved.theme, 'dark');
  assert.deepEqual(saved.settings.multiplication.left, { min: 12, max: 20 });

  const reloaded = setupPage({ storage: page.store });
  assert.equal(reloaded.el('mul-left-max').value, '20');
  assert.ok(reloaded.body.classList.contains('theme-dark'));

  page.el('reset-btn').dispatch('click');
  assert.equal(page.el('mul-left-min').value, '2');
  assert.equal(page.el('mul-left-max').value, '12');
  assert.ok(page.opChecks.every((check) => check.checked));
  assert.equal(page.el('start-btn').disabled, false);
});

test('touch devices get the on-screen number pad, which can answer and skip', () => {
  const page = setupPage({ coarse: true });
  page.el('start-btn').dispatch('click');
  assert.ok(page.visible('numpad'));
  assert.equal(page.el('answer-input').inputMode, 'none', 'no system keyboard over the pad');

  const digits = String(page.answer());
  page.pad('9');
  page.pad('back');
  assert.equal(page.el('answer-input').value, '');
  for (const digit of digits) page.pad(digit);
  assert.equal(page.el('score-value').textContent, '1');

  const before = page.el('problem').textContent;
  page.pad('skip');
  assert.notEqual(page.el('problem').textContent, before);
  page.tick(120000);
  assert.equal(page.el('end-skips').textContent, '1');

  const desktop = setupPage();
  desktop.el('start-btn').dispatch('click');
  assert.ok(!desktop.visible('numpad'));
});
