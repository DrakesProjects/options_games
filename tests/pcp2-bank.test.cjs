'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const bank = require('../games/pcp2-bank.js');

function seededRandom(seed = 714932) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Independent numerical rank check; exactness of production compilation is
// checked separately by multiplying its integer coefficients into each vector.
function rank(vectors) {
  const matrix = vectors.map((vector) => vector.slice());
  let row = 0;
  for (let column = 0; column < (matrix[0]?.length || 0) && row < matrix.length; column += 1) {
    const candidate = matrix.findIndex((values, index) => index >= row && Math.abs(values[column]) > 1e-9);
    if (candidate < 0) continue;
    [matrix[row], matrix[candidate]] = [matrix[candidate], matrix[row]];
    const pivot = matrix[row][column];
    matrix[row] = matrix[row].map((value) => value / pivot);
    for (let other = row + 1; other < matrix.length; other += 1) {
      const scale = matrix[other][column];
      matrix[other] = matrix[other].map((value, index) => value - scale * matrix[row][index]);
    }
    row += 1;
  }
  return row;
}

test('catalogs have broad coverage and no invalid or duplicated active families', () => {
  const banks = bank.getBanks();
  assert.deepEqual(banks.errors, []);
  assert.ok(banks.medium.length >= 60);
  assert.ok(banks.hard.length >= 100);
  assert.deepEqual(banks.givenQuoteCounts, { medium: 6, hard: 9 });
  const all = [...banks.medium, ...banks.hard];
  assert.equal(new Set(all.map((family) => family.id)).size, all.length);
  assert.equal(new Set(all.map((family) => family.signature)).size, all.length);
  const required = ['stock', 'strike', 'rc', 'call', 'put', 'combo', 'straddle', 'bw', 'ps',
    'risky', 'strangle', 'box', 'cv', 'pv', 'swap', 'ct', 'pt', 'jelly', 'butterfly', 'iron', 'reversal', 'conversion'];
  for (const mode of ['medium', 'hard']) {
    assert.equal(banks.givenQuoteCounts[mode], Math.max(...banks[mode].map((family) => family.keys.length - 1)) + 2);
    const kinds = new Set(banks[mode].flatMap((family) => family.keys.map((key) => key.split(':')[0])));
    for (const kind of required) assert.ok(kinds.has(kind), `${mode} lacks ${kind} targets`);
  }
});

test('every family has one exact dependency and every clue is essential for every possible target', () => {
  const banks = bank.getBanks();
  for (const family of [...banks.medium, ...banks.hard]) {
    assert.equal(rank(family.vectors), family.keys.length - 1, family.id);
    for (let dimension = 0; dimension < 12; dimension += 1) {
      assert.equal(family.vectors.reduce((sum, vector, index) => sum + vector[dimension] * family.coefficients[index], 0), 0, family.id);
    }
    for (let removed = 0; removed < family.keys.length; removed += 1) {
      const remaining = family.vectors.filter((_, index) => index !== removed);
      assert.equal(rank(remaining), remaining.length, `${family.id}: redundant clue ${family.keys[removed]}`);
    }
  }
});

test('all target rotations generate cent-exact solutions from the visible clues', () => {
  const random = seededRandom();
  const banks = bank.getBanks();
  for (const family of [...banks.medium, ...banks.hard]) {
    for (let target = 0; target < family.keys.length; target += 1) {
      for (let sample = 0; sample < 8; sample += 1) {
        const question = bank.questionFor(family, target, random);
        assert.equal(question.targetKey, family.keys[target]);
        assert.equal(question.givens.length, banks.givenQuoteCounts[family.mode]);
        assert.ok(Number.isInteger(question.answer));
        assert.ok(question.givens.every((given) => Number.isInteger(given.value)));
        assert.ok(!question.givens.some((given) => given.key === question.targetKey));
        assert.equal(new Set([question.targetLabel, ...question.givens.map((given) => given.label)]).size, question.givens.length + 1);
        const extra = question.givens.filter((given) => !family.keys.includes(given.key));
        assert.ok(extra.length >= 2);
        assert.ok(extra.every((given) => !['stock', 'strike', 'rc', 'parity', 'call', 'put'].includes(given.key.split(':')[0])));
        assert.equal(rank([...family.vectors, ...extra.map((given) => bank.expression(given.key, family.equalSpacing))]), family.keys.length - 1 + extra.length);
        const values = new Map(question.givens.map((given) => [given.key, given.value]));
        values.set(question.targetKey, question.answer);
        assert.equal(family.keys.reduce((sum, key, index) => sum + values.get(key) * family.coefficients[index], 0), 0);
      }
    }
  }
});

test('distractors cannot replace any original clue or provide an alternative answer path', () => {
  const random = seededRandom(71033);
  const banks = bank.getBanks();
  for (const family of [...banks.medium, ...banks.hard]) {
    for (let target = 0; target < family.keys.length; target += 1) {
      const question = bank.questionFor(family, target, random);
      const targetVector = bank.expression(question.targetKey, family.equalSpacing);
      const clues = question.givens.map((given) => ({ ...given, vector: bank.expression(given.key, family.equalSpacing) }));
      for (const key of family.keys.filter((key) => key !== question.targetKey)) {
        const withoutRequiredClue = clues.filter((clue) => clue.key !== key).map((clue) => clue.vector);
        assert.equal(rank([...withoutRequiredClue, targetVector]), rank(withoutRequiredClue) + 1,
          `${question.id}: distractors allow skipping ${key}`);
      }
    }
  }
});

test('extra quotes use the same cent-exact market and consistent contract labels', () => {
  const banks = bank.getBanks();
  [...banks.medium, ...banks.hard].forEach((family, index) => {
    const seed = 81531 + index;
    const state = bank.generateState(Boolean(family.equalSpacing), seededRandom(seed));
    const question = bank.questionFor(family, 0, seededRandom(seed));
    for (const given of question.givens) assert.equal(given.value, bank.valueOf(given.key, state), `${question.id}: ${given.key}`);
    assert.equal(question.answer, bank.valueOf(question.targetKey, state));
    const keys = [question.targetKey, ...question.givens.map((given) => given.key)];
    const context = { ...bank.contractIndices(keys), keys };
    for (const given of question.givens) {
      const aliases = given.label.toLowerCase().includes('synthetic call vertical') ? { [given.key]: 'Synthetic call vertical' } : {};
      assert.equal(given.label, `${bank.labelOf(given.key, context, aliases)}${given.quote ? ` ${given.quote}` : ''}`);
    }
    const displayedStrikePrices = context.strikes.map((strike) => state.strikes[strike - 1]);
    assert.ok(displayedStrikePrices.every((strike, i) => i === 0 || displayedStrikePrices[i - 1] > strike));
  });
});

test('market generation preserves cents, put/r/c ranges, PCP, ordering, and convexity', () => {
  const random = seededRandom(82713);
  const observedCarries = new Set();
  const putResidues = new Set();
  const butterflyChanges = new Set();
  for (let sample = 0; sample < 4000; sample += 1) {
    const equalSpacing = sample % 2 === 0;
    const state = bank.generateState(equalSpacing, random);
    assert.ok(state.basis.every(Number.isInteger));
    const [highGap, lowGap] = [state.strikes[0] - state.strikes[1], state.strikes[1] - state.strikes[2]];
    assert.ok(highGap > 0 && lowGap > 0);
    assert.ok(state.strikes.every((strike) => strike >= 4000 && strike <= 15000));
    if (equalSpacing) assert.equal(highGap, lowGap);
    for (let t = 0; t < 2; t += 1) {
      observedCarries.add(state.carries[t]);
      assert.ok(state.carries[t] >= -10 && state.carries[t] <= 300);
      assert.ok(state.puts[t].every((put) => put >= 0 && put <= 2000));
      assert.ok(state.calls[t].every((call) => call > 0));
      for (let k = 0; k < 3; k += 1) {
        putResidues.add(state.puts[t][k] % 4);
        assert.equal(state.calls[t][k] - state.puts[t][k], state.stock - state.strikes[k] + state.carries[t]);
        assert.equal(bank.valueOf(`put:${k + 1}:${t + 1}`, state), state.puts[t][k]);
        assert.ok(bank.valueOf(`bw:${k + 1}:${t + 1}`, state) > 0);
        assert.ok(bank.valueOf(`ps:${k + 1}:${t + 1}`, state) > 0);
        if (k > 0) {
          assert.ok(state.calls[t][k] >= state.calls[t][k - 1]);
          assert.ok(state.puts[t][k] <= state.puts[t][k - 1]);
        }
        if (t > 0) {
          assert.ok(state.calls[t][k] >= state.calls[t - 1][k]);
          assert.ok(state.puts[t][k] >= state.puts[t - 1][k]);
        }
      }
      assert.ok((state.puts[t][0] - state.puts[t][1]) * lowGap >= (state.puts[t][1] - state.puts[t][2]) * highGap);
    }
    if (equalSpacing) butterflyChanges.add(bank.valueOf('butterfly:2', state) - bank.valueOf('butterfly:1', state));
  }
  assert.ok(observedCarries.has(-10) && observedCarries.has(0) && observedCarries.has(300));
  assert.equal(putResidues.size, 4, 'premiums must not be restricted to a four-cent grid');
  assert.ok(butterflyChanges.size > 100, 'expiration surfaces must not force matching butterflies');
});

test('sampling is uniform across the full question bank, including every target rotation', () => {
  const banks = bank.getBanks();
  for (const mode of ['medium', 'hard']) {
    const rotations = banks[mode].flatMap((family) => family.keys.map((_, targetIndex) => `${family.id}:${targetIndex}`));
    const stateRandom = seededRandom(5729);
    rotations.forEach((id, index) => {
      let first = true;
      const question = bank.createQuestion(mode, () => {
        if (first) { first = false; return (index + 0.5) / rotations.length; }
        return stateRandom();
      });
      assert.equal(question.id, id);
    });
  }
});

test('contract labels remap only the strikes and expirations actually present', () => {
  const keys = ['strangle:1:3:2', 'risky:1:3:2', 'call:1:2'];
  assert.deepEqual(bank.contractIndices(keys), { strikes: [1, 3], expiries: [2] });
  const context = { ...bank.contractIndices(keys), keys };
  assert.equal(bank.labelOf('strangle:1:3:2', context), 'K₁ − K₂ strangle');
  assert.equal(bank.labelOf('call:1:2', context), 'K₁ call');
  const calendar = bank.contractIndices(['put:2:1', 'put:2:2', 'pt:2:1:2']);
  assert.equal(bank.labelOf('put:2:1', calendar), 'T₁ put');
  assert.equal(bank.labelOf('pt:2:1:2', calendar), 'T₁T₂ put spread');
  const single = bank.contractIndices(['call:2:2', 'put:2:2', 'rc:2']);
  assert.equal(bank.labelOf('call:2:2', single), 'Call');
  assert.equal(bank.labelOf('put:2:2', single), 'Put');
  assert.equal(bank.labelOf('rc:2', single), 'r/c');
});

test('multiple strikes are labeled consistently on every strike-dependent structure', () => {
  const label = (key, keys) => bank.labelOf(key, { ...bank.contractIndices(keys), keys });
  const vertical = ['cv:1:2:1', 'call:1:1', 'call:2:1'];
  assert.equal(label(vertical[0], vertical), 'K₁ − K₂ call vertical');
  assert.equal(label(vertical[1], vertical), 'K₁ call');
  assert.equal(label(vertical[2], vertical), 'K₂ call');
  const wings = ['strangle:1:2:1', 'call:1:1', 'put:2:1'];
  assert.equal(label(wings[1], wings), 'K₁ call');
  assert.equal(label(wings[2], wings), 'K₂ put');
  const wrongWing = ['strangle:1:2:1', 'call:2:1'];
  assert.equal(label(wrongWing[1], wrongWing), 'K₂ call');
  const mixed = ['strangle:1:2:1', 'call:1:1', 'straddle:2:1'];
  assert.equal(label(mixed[1], mixed), 'K₁ call');
  const fly = ['iron:1', 'straddle:2:1', 'strangle:1:3:1'];
  assert.equal(label(fly[0], fly), 'K₁ − K₂ − K₃ iron fly');
  assert.equal(label(fly[1], fly), 'K₂ straddle');
  assert.equal(label(fly[2], fly), 'K₁ − K₃ strangle');
  const adjacent = ['butterfly:1', 'strangle:1:2:1', 'strangle:2:3:1'];
  assert.equal(label(adjacent[0], adjacent), 'K₁ − K₂ − K₃ butterfly');
  assert.equal(label(adjacent[1], adjacent), 'K₁ − K₂ strangle');
  assert.equal(label(adjacent[2], adjacent), 'K₂ − K₃ strangle');
  const swap = ['swap:1:2:1', 'straddle:1:1', 'straddle:2:1'];
  assert.equal(label(swap[0], swap), 'K₁ − K₂ straddle swap');
  const reversedSwap = ['swap:2:1:1', 'straddle:1:1', 'straddle:2:1'];
  assert.equal(label(reversedSwap[0], reversedSwap), 'K₂ − K₁ straddle swap');
});

test('time precedes strikes and name while independent quantities omit inapplicable labels', () => {
  const context = { strikes: [1, 2, 3], expiries: [1, 2] };
  const examples = {
    'call:1:2': 'T₂ K₁ call',
    'put:2:1': 'T₁ K₂ put',
    'combo:2:1': 'T₁ K₂ combo',
    'straddle:1:2': 'T₂ K₁ straddle',
    'bw:1:1': 'T₁ K₁ B/W',
    'ps:1:1': 'T₁ K₁ P&S',
    'rc:2': 'T₂ r/c',
    'reversal:1': 'T₁ reversal',
    'conversion:2': 'T₂ conversion',
    'strangle:1:3:2': 'T₂ K₁ − K₃ strangle',
    'risky:1:2:1': 'T₁ K₁ − K₂ risky',
    'cv:1:2:1': 'T₁ K₁ − K₂ call vertical',
    'pv:1:2:2': 'T₂ K₁ − K₂ put vertical',
    'swap:2:1:2': 'T₂ K₂ − K₁ straddle swap',
    'ct:1:1:2': 'T₁T₂ K₁ call spread',
    'pt:2:1:2': 'T₁T₂ K₂ put spread',
    'jelly:1:1:2': 'T₁T₂ K₁ jelly roll',
    'jelly:2:1:2': 'T₁T₂ K₂ jelly roll',
    'butterfly:2': 'T₂ K₁ − K₂ − K₃ butterfly',
    'iron:1': 'T₁ K₁ − K₂ − K₃ iron fly',
    'box:1:2': 'K₁ − K₂ box',
    'parity:2': 'K₂ parity',
    'strike:1': 'K₁',
    stock: 'Stock',
  };
  for (const [key, expected] of Object.entries(examples)) assert.equal(bank.labelOf(key, context), expected);
  assert.equal(bank.labelOf('cv:1:2:1', context, { 'cv:1:2:1': 'Synthetic call vertical' }), 'T₁ K₁ − K₂ synthetic call vertical');
});

test('jelly rolls retain their common strike in labels without changing their carry value', () => {
  const state = bank.generateState(false, seededRandom(19387));
  for (const strike of [1, 2, 3]) {
    const key = `jelly:${strike}:1:2`;
    assert.deepEqual(bank.contractIndices([key]), { strikes: [strike], expiries: [1, 2] });
    assert.equal(bank.valueOf(key, state),
      bank.valueOf(`combo:${strike}:1`, state) - bank.valueOf(`combo:${strike}:2`, state));
    assert.equal(bank.valueOf(key, state), state.carries[0] - state.carries[1]);
    assert.equal(bank.labelOf(key, bank.contractIndices([key])), 'T₁T₂ jelly roll');
  }
  const remapped = bank.contractIndices(['jelly:3:1:2', 'call:1:1']);
  assert.equal(bank.labelOf('jelly:3:1:2', remapped), 'T₁T₂ K₂ jelly roll');

  const family = bank.getBanks().medium.find((entry) => entry.id === 'straddle-time-put-jelly');
  const target = bank.questionFor(family, 3, seededRandom(412));
  assert.equal(target.targetLabel, 'T₁T₂ K₁ jelly roll');
  assert.ok(target.steps[0].startsWith(`${target.targetLabel} = `));
  const clue = bank.questionFor(family, 0, seededRandom(412));
  const jelly = clue.givens.find((given) => given.key === 'jelly:1:1:2');
  assert.equal(jelly.label, 'T₁T₂ K₁ jelly roll');
  assert.ok(clue.steps[0].includes(jelly.label));
});

test('time spreads buy front and sell back, with consistent jelly-roll replication', () => {
  const random = seededRandom(65291);
  for (let sample = 0; sample < 100; sample += 1) {
    const state = bank.generateState(sample % 2 === 0, random);
    for (const strike of [1, 2, 3]) {
      const callSpread = bank.valueOf(`ct:${strike}:1:2`, state);
      const putSpread = bank.valueOf(`pt:${strike}:1:2`, state);
      const jelly = bank.valueOf(`jelly:${strike}:1:2`, state);
      assert.equal(callSpread, state.calls[0][strike - 1] - state.calls[1][strike - 1]);
      assert.equal(putSpread, state.puts[0][strike - 1] - state.puts[1][strike - 1]);
      assert.equal(jelly, callSpread - putSpread);
      assert.equal(jelly, bank.valueOf(`straddle:${strike}:1`, state)
        - bank.valueOf(`straddle:${strike}:2`, state) - 2 * putSpread);
    }
  }
  // The screenshot's $5.96 back-minus-front quote becomes -$5.96.
  const family = bank.getBanks().medium.find((entry) => entry.id === 'straddle-time-put-jelly');
  const values = [2194, 3460, -596, -74];
  assert.deepEqual(family.coefficients, [1, -1, -2, -1]);
  assert.equal(values.reduce((total, value, index) => total + value * family.coefficients[index], 0), 0);
});

test('c/o and p/o quotes preserve algebraic signs and unknowns do not disclose their sign', () => {
  const random = seededRandom(791);
  const family = bank.getBanks().medium.find((entry) => entry.id === 'combo-options');
  const signs = new Set();
  for (let sample = 0; sample < 100; sample += 1) {
    const question = bank.questionFor(family, 1, random);
    const combo = question.givens.find((given) => given.key === 'combo:1:1');
    const put = question.givens.find((given) => given.key === 'put:1:1');
    assert.equal(combo.quote, combo.value < 0 ? 'p/o' : 'c/o');
    signs.add(combo.quote);
    const quotedAmount = Math.abs(combo.value);
    assert.equal(question.answer, put.value + (combo.quote === 'p/o' ? -quotedAmount : quotedAmount));
    assert.ok(combo.label.endsWith(` ${combo.quote}`));
    if (combo.quote === 'p/o') assert.equal(question.steps[0], `${question.targetLabel} = − ${combo.label} + ${put.label}`);
    const target = bank.questionFor(family, 0, random);
    assert.ok(target.targetLabel.endsWith(' c/o'));
  }
  assert.deepEqual([...signs].sort(), ['c/o', 'p/o']);
});

test('reversal and conversion keep their signs as alternate quotations without duplicate families', () => {
  const family = bank.getBanks().medium.find((entry) => entry.id === 'combo-parity-carry');
  assert.equal(family.presentations.length, 2);
  const random = seededRandom(33929);
  for (let alias = 1; alias <= family.presentations.length; alias += 1) {
    const presentation = family.presentations[alias - 1];
    for (let target = 0; target < family.keys.length; target += 1) {
      const question = bank.questionFor(family, target, random, alias);
      assert.equal(question.id, `${family.id}:${target}`);
      const values = new Map(question.givens.map((given) => [given.key, given.value]));
      values.set(question.targetKey, question.answer);
      assert.equal(presentation.keys.reduce((sum, key, index) => sum + values.get(key) * presentation.coefficients[index], 0), 0);
    }
  }
});
