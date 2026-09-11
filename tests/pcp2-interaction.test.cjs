const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gameDirectory = path.join(__dirname, '..', 'games');
const controller = fs.readFileSync(path.join(gameDirectory, 'pcp2.js'), 'utf8');

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.style = {};
    this.scrollTop = 0;
    this.selected = false;
    this.visibleTransitions = 0;
    this.classList = {
      contains: (name) => this.className.split(' ').includes(name),
      add: (name) => {
        if (!this.classList.contains(name)) this.className += ` ${name}`;
      },
      remove: (name) => {
        if (name === 'hidden' && this.classList.contains(name)) this.visibleTransitions += 1;
        this.className = this.className.split(' ').filter((item) => item !== name).join(' ');
      },
    };
  }

  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  fire(name, event = {}) { this.listeners[name]?.(event); }
}

function setup({ realBank = false, overQuotes = false } = {}) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  ['game-screen', 'end-screen', 'top-bar-right', 'timer-wrap', 'timer-label']
    .forEach((id) => element(id).classList.add('hidden'));
  element('duration-select').value = '60';
  element('mode-select').value = 'medium';
  let now = 0;
  let frame = 0;
  const frames = new Map();
  const requestedModes = [];
  const questions = [];
  const runtime = {
    document: { getElementById: element, createElement: () => new Element() },
    performance: { now: () => now },
    requestAnimationFrame: (callback) => {
      frames.set(++frame, callback);
      return frame;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  runtime.window = runtime;
  vm.createContext(runtime);

  if (realBank) {
    for (const script of ['pcp2-medium.js', 'pcp2-hard.js', 'pcp2-bank.js']) {
      vm.runInContext(fs.readFileSync(path.join(gameDirectory, script), 'utf8'), runtime, { filename: script });
    }
  } else {
    runtime.PCP2Bank = {
      createQuestion: () => ({
        id: `q${questions.length}`,
        family: 'Hidden family',
        contractInfo: ['K1 > K2', 'T1 < T2'],
        givens: overQuotes
          ? [{ label: 'Combo', value: -175, quote: 'p/o' }, { label: 'Risky', value: 225, quote: 'c/o' }]
          : [{ label: 'Call', value: 300 }, { label: 'Put', value: 200 }],
        targetLabel: `Target ${questions.length}`,
        answer: [0, -175, 125][questions.length % 3],
        steps: ['Final explanation.'],
      }),
    };
  }

  const createQuestion = runtime.PCP2Bank.createQuestion;
  runtime.PCP2Bank.createQuestion = (mode) => {
    requestedModes.push(mode);
    const question = createQuestion(mode);
    questions.push(question);
    return question;
  };
  vm.runInContext(controller, runtime, { filename: 'pcp2.js' });
  return {
    element, questions, requestedModes, frames,
    setTime: (value) => { now = value; },
    start: () => element('start-btn').fire('click'),
    submit(value) {
      element('answer-input').value = value;
      element('submit-btn').fire('click');
    },
  };
}

test('shows shuffled instrument rows and one accessible unknown without revealing answers', () => {
  const game = setup();
  game.start();
  const rows = game.element('price-table-body').children;
  assert.equal(rows.length, 3);
  assert.equal(rows.filter((row) => row.className === 'question-row').length, 1);
  assert.deepEqual(rows.map((row) => row.children[1].textContent).sort(), ['$2.00', '$3.00', '?']);
  assert.equal(game.element('answer-input').attributes['aria-label'], 'Target 0');
  assert.equal(game.element('feedback').textContent, '');
  assert.equal(game.element('missed-answer').textContent, '');
});

test('blank and nonfinite answers never count as zero; wrong answers allow unlimited retries', () => {
  const game = setup();
  game.start();
  for (const answer of ['', '  ', 'Infinity', 'NaN']) {
    game.submit(answer);
    assert.equal(game.element('feedback').textContent, 'Enter a value.');
    assert.equal(game.element('score-value').textContent, '0');
    assert.equal(game.questions.length, 1);
  }
  for (let attempt = 0; attempt < 5; attempt += 1) game.submit('50');
  assert.equal(game.element('feedback').textContent, 'Try again.');
  assert.equal(game.element('answer-input').selected, true);
  assert.equal(game.questions.length, 1);
  game.submit('0');
  assert.equal(game.element('score-value').textContent, '1');
  assert.equal(game.questions.length, 2);
  assert.equal(game.element('answer-input').value, '');
  assert.equal(game.element('feedback').textContent, '');
});

test('over quotes display positive magnitudes with c/o or p/o', () => {
  const game = setup({ overQuotes: true });
  game.start();
  const rows = game.element('price-table-body').children;
  const combo = rows.find((row) => row.children[0].textContent === 'Combo');
  const risky = rows.find((row) => row.children[0].textContent === 'Risky');
  assert.equal(combo.children[1].textContent, '$1.75 p/o');
  assert.equal(risky.children[1].textContent, '$2.25 c/o');
  assert.equal(game.questions[0].givens[0].value, -175);
});

test('correct signed answers round to cents and Enter advances immediately', () => {
  const game = setup();
  game.start();
  game.submit('0');
  game.element('answer-input').value = '-1.749';
  let prevented = false;
  game.element('answer-input').fire('keydown', {
    key: 'Enter', preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(game.questions.length, 3);
  assert.equal(game.element('score-value').textContent, '2');
});

test('submission at the deadline cannot score and completion is recorded once', () => {
  const game = setup();
  game.start();
  game.submit('0');
  const pendingFrame = [...game.frames.values()].at(-1);
  game.setTime(60000);
  game.submit('-1.75');
  assert.equal(game.element('score-value').textContent, '1');
  assert.equal(game.element('final-score').textContent, '1');
  assert.equal(game.element('end-screen').classList.contains('hidden'), false);
  assert.equal(game.element('game-screen').classList.contains('hidden'), true);
  assert.match(game.element('missed-answer').textContent, /Target 1: -\$1\.75\nFinal explanation\./);
  game.submit('-1.75');
  pendingFrame();
  assert.equal(game.element('end-screen').visibleTransitions, 1);
  assert.equal(game.questions.length, 2);
});

test('timer completion returns to settings and the next game uses Hard with a reset score', () => {
  const game = setup();
  game.start();
  game.submit('0');
  game.setTime(60000);
  [...game.frames.values()].at(-1)();
  game.element('play-again-btn').fire('click');
  assert.equal(game.element('setup-screen').classList.contains('hidden'), false);
  assert.equal(game.element('end-screen').classList.contains('hidden'), true);
  game.element('mode-select').value = 'hard';
  game.element('mode-select').fire('change');
  game.start();
  assert.equal(game.requestedModes.at(-1), 'hard');
  assert.equal(game.element('mode-display').textContent, 'Hard');
  assert.equal(game.element('score-value').textContent, '0');
  assert.equal(game.element('timer-label').textContent, '60s');
});

test('page preserves stats hooks, loads the bank before the controller, and omits the old answer flow', () => {
  const html = fs.readFileSync(path.join(gameDirectory, 'pcp2.html'), 'utf8');
  assert.match(html, /data-stats-game="pcp-2"/);
  assert.match(html, /value="medium" selected>Medium/);
  assert.doesNotMatch(html, /id="(?:next-btn|solution-panel|target-text|question-family)"/);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts, ['pcp2-medium.js', 'pcp2-hard.js', 'pcp2-bank.js', 'pcp2.js', 'stats.js']);
  for (const script of scripts) {
    assert.ok(fs.statSync(path.join(gameDirectory, script)).isFile(), `${script} must exist`);
  }
});

for (const mode of ['medium', 'hard']) {
  test(`real browser-global ${mode} bank integrates with rendering, retries, scoring, and completion`, () => {
    const game = setup({ realBank: true });
    game.element('mode-select').value = mode;
    game.start();
    assert.equal(game.element('game-screen').classList.contains('hidden'), false);

    for (let round = 0; round < 8; round += 1) {
      const question = game.questions.at(-1);
      const rows = game.element('price-table-body').children;
      assert.equal(question.givens.length, mode === 'medium' ? 6 : 9);
      assert.equal(rows.length, question.givens.length + 1);
      assert.equal(rows.filter((row) => row.className === 'question-row').length, 1);
      assert.ok(rows.every((row) => row.className === '' || row.className === 'question-row'), 'extra quotes must not have identifying styles');
      assert.equal(game.element('answer-input').attributes['aria-label'], question.targetLabel);
      for (const clue of question.givens) {
        const row = rows.find((item) => item.children[0].textContent === clue.label);
        assert.ok(row, `${question.id}: missing clue ${clue.label}`);
        const formatted = `${clue.value < 0 && !clue.quote ? '-' : ''}$${(Math.abs(clue.value) / 100).toFixed(2)}${clue.quote ? ` ${clue.quote}` : ''}`;
        assert.equal(row.children[1].textContent, formatted);
      }

      game.element('game-screen').scrollTop = 500;
      game.submit(((question.answer + 100) / 100).toFixed(2));
      assert.equal(game.element('feedback').textContent, 'Try again.');
      assert.equal(game.element('answer-input').selected, true);
      assert.equal(game.element('score-value').textContent, String(round));
      assert.equal(game.questions.length, round + 1);
      assert.equal(game.element('game-screen').scrollTop, 500);

      game.submit((question.answer / 100).toFixed(2));
      assert.equal(game.element('score-value').textContent, String(round + 1));
      assert.equal(game.questions.length, round + 2);
      assert.equal(game.element('feedback').textContent, '');
      assert.equal(game.element('answer-input').value, '');
      assert.equal(game.element('game-screen').scrollTop, 0);
      assert.equal(game.element('missed-answer').textContent, '');
    }

    assert.ok(game.requestedModes.every((requestedMode) => requestedMode === mode));
    const lastQuestion = game.questions.at(-1);
    game.setTime(60000);
    [...game.frames.values()].at(-1)();
    assert.equal(game.element('final-score').textContent, '8');
    assert.equal(game.element('end-screen').classList.contains('hidden'), false);
    assert.ok(game.element('missed-answer').textContent.includes(lastQuestion.targetLabel));
    assert.ok(game.element('missed-answer').textContent.includes(lastQuestion.steps[0]));
  });
}
