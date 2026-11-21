const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gameDirectory = path.join(__dirname, '..', 'games');
const controller = fs.readFileSync(path.join(gameDirectory, 'parity.js'), 'utf8');
const html = fs.readFileSync(path.join(gameDirectory, 'parity.html'), 'utf8');

// Values from the game's sandbox have its own prototypes; compare as plain data.
const plain = (value) => JSON.parse(JSON.stringify(value));

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.style = {};
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.checked = true;
    this.classList = {
      contains: (name) => this.className.split(' ').includes(name),
      add: (name) => { if (!this.classList.contains(name)) this.className += ` ${name}`; },
      remove: (name) => { this.className = this.className.split(' ').filter((item) => item !== name).join(' '); },
      toggle: (name, force = !this.classList.contains(name)) => (force ? this.classList.add(name) : this.classList.remove(name)),
    };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  focus() {}
  select() {}
}

function setup() {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  ['game-screen', 'end-screen', 'top-bar-right', 'timer-wrap', 'timer-label', 'practice-tag']
    .forEach((id) => element(id).classList.add('hidden'));
  element('duration-select').value = '60';
  let now = 0;
  const frames = new Map();
  let frame = 0;
  const recorded = [];
  let labOptions;
  const runtime = {
    document: { getElementById: element, createElement: () => new Element() },
    performance: { now: () => now },
    requestAnimationFrame: (callback) => { frames.set(++frame, callback); return frame; },
    cancelAnimationFrame: (id) => frames.delete(id),
    OptionsLab: {
      mount(options) {
        labOptions = options;
        return {
          record: (records) => recorded.push(records),
          use() {},
          labelOf: (key) => options.categories.find((category) => category.key === key).label,
        };
      },
    },
  };
  vm.createContext(runtime);
  vm.runInContext(controller, runtime, { filename: 'parity.js' });

  // Read the round off the screen and solve it with put-call parity.
  function round() {
    const rows = Object.fromEntries(element('price-table-body').children.map((row) => [
      row.children[0].textContent,
      row.children[1].textContent === '?' ? null : Number(row.children[1].textContent.replace('$', '')),
    ]));
    const target = element('answer-input').placeholder;
    const parity = rows.Stock - rows.Strike;
    const rc = rows['r/c'];
    const call = rows.Call ?? (rows.Put !== undefined && rows.Put !== null ? rows.Put + parity + rc
      : rows['B/W'] !== undefined && rows['B/W'] !== null ? rows['B/W'] + parity : rows['P&S'] + rc);
    const answers = {
      Call: call, Put: call - parity - rc, Straddle: 2 * call - parity - rc, 'B/W': call - parity, 'P&S': call - rc,
    };
    return { target, answer: answers[target].toFixed(2) };
  }

  return {
    element, recorded, round,
    lab: () => labOptions,
    setTime: (value) => { now = value; },
    start: () => element('start-btn').listeners.click({ type: 'click' }),
    submit(value) {
      element('answer-input').value = String(value);
      element('submit-btn').listeners.click();
    },
    expire() {
      now += 10 ** 9;
      for (const callback of [...frames.values()]) callback();
    },
  };
}

test('a normal run records each answered question by what it solved for, with time and misses', () => {
  const game = setup();
  assert.deepEqual(plain(game.lab().categories.map((category) => category.label)), ['Call', 'Put', 'Straddle', 'B/W & P&S']);
  game.start();
  const expected = [];
  for (let index = 0; index < 6; index++) {
    const { target, answer } = game.round();
    const misses = index % 3;
    for (let miss = 0; miss < misses; miss++) game.submit(Number(answer) + 1);
    game.element('answer-input').value = '';
    game.element('submit-btn').listeners.click(); // blank entries aren't misses
    game.setTime((index + 1) * 1000 + index * 250);
    game.submit(answer);
    expected.push({ Call: 'call', Put: 'put', Straddle: 'straddle', 'B/W': 'bwps', 'P&S': 'bwps' }[target]);
  }
  game.round(); // shown but never answered
  game.expire();
  assert.equal(game.recorded.length, 1);
  const log = plain(game.recorded[0]);
  assert.equal(log.length, 6);
  assert.deepEqual(log.map((record) => record.category), expected);
  assert.deepEqual(log.map((record) => record.wrongEntries), [0, 1, 2, 0, 1, 2]);
  assert.deepEqual(log.map((record) => record.ms), [1000, 1250, 1250, 1250, 1250, 1250]);
  assert.equal(game.element('end-screen').dataset.statsIgnore, 'false');
  assert.equal(game.element('end-title').textContent, "Time's up");
  assert.equal(game.element('practice-tag').classList.contains('hidden'), true);
});

test('practice drills one category even when it is turned off, and is not saved to past results', () => {
  const game = setup();
  game.element('straddle-check').checked = false;
  game.element('covered-check').checked = false;
  game.lab().onPractice('straddle');
  assert.equal(game.element('practice-tag').textContent, 'Practice: Straddle');
  assert.equal(game.element('practice-tag').classList.contains('hidden'), false);
  for (let index = 0; index < 8; index++) {
    const { target, answer } = game.round();
    assert.equal(target, 'Straddle');
    game.submit(answer);
  }
  game.expire();
  assert.deepEqual([...new Set(plain(game.recorded[0]).map((record) => record.category))], ['straddle']);
  assert.equal(game.element('end-screen').dataset.statsIgnore, 'true');
  assert.equal(game.element('end-title').textContent, 'Practice: Straddle');

  game.element('play-again-btn').listeners.click();
  game.start();
  assert.equal(game.element('practice-tag').classList.contains('hidden'), true);
  for (let index = 0; index < 20; index++) {
    const { target, answer } = game.round();
    assert.ok(['Call', 'Put'].includes(target), target);
    game.submit(answer);
  }
  game.expire();
  assert.equal(game.element('end-screen').dataset.statsIgnore, 'false');
});

test('a blank answer is asked for again, never graded as $0.00 or counted as a miss', () => {
  const game = setup();
  game.start();
  for (let index = 0; index < 5; index++) {
    const before = game.round();
    for (const blank of ['', '   ']) {
      game.submit(blank);
      assert.equal(game.element('feedback').textContent, 'Enter a value.');
      assert.deepEqual(game.round(), before, 'still on the same question');
    }
    game.submit(before.answer);
  }
  game.expire();
  assert.equal(plain(game.recorded[0]).length, 5);
  assert.ok(plain(game.recorded[0]).every((record) => record.wrongEntries === 0));
});

test('B/W & P&S practice covers both and a run with no answers records nothing new', () => {
  const game = setup();
  game.lab().onPractice('bwps');
  const seen = new Set();
  for (let index = 0; index < 30; index++) {
    const { target, answer } = game.round();
    seen.add(target);
    game.submit(answer);
  }
  assert.deepEqual([...seen].sort(), ['B/W', 'P&S']);
  game.expire();
  game.element('play-again-btn').listeners.click();
  game.start();
  game.expire();
  assert.deepEqual(plain(game.recorded[1]), []);
});

test('the page loads the Lab before the game and has the practice and end-title hooks', () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts, ['../js/lab-core.js', 'lab.js', 'parity.js', 'stats.js']);
  assert.match(html, /id="practice-tag" class="practice-tag hidden"/);
  assert.match(html, /<h2 id="end-title">Time's up<\/h2>/);
});
