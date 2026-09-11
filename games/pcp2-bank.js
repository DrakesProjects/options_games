(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./pcp2-medium.js'), require('./pcp2-hard.js'));
  } else {
    root.PCP2Bank = factory(root.PCP2MediumFamilies, root.PCP2HardFamilies);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (mediumCatalog, hardCatalog) {
  'use strict';

  const basis = ['S', 'K1', 'K2', 'K3', 'R1', 'R2', 'C11', 'C12', 'C21', 'C22', 'C31', 'C32'];
  const gcd = (a, b) => {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b) [a, b] = [b, a % b];
    return a;
  };
  const rational = (numerator, denominator = 1n) => {
    if (denominator === 0n) throw new Error('Division by zero.');
    const divisor = gcd(numerator, denominator);
    const sign = denominator < 0n ? -1n : 1n;
    return [numerator / divisor * sign, denominator / divisor * sign];
  };
  const subtract = (a, b) => rational(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
  const multiply = (a, b) => rational(a[0] * b[0], a[1] * b[1]);
  const divide = (a, b) => rational(a[0] * b[1], a[1] * b[0]);
  const unit = (name) => basis.map((entry) => entry === name ? 1 : 0);
  const combine = (...terms) => basis.map((_, index) => (
    terms.reduce((sum, [coefficient, vector]) => sum + coefficient * vector[index], 0)
  ));

  // All expressions are reduced using only the stipulated PCP identity and,
  // when stated in the question, equal strike spacing. Sampling rules add no clues.
  function expression(key, equalSpacing = false) {
    const [kind, ...indices] = key.split(':');
    const [a, b, c] = indices.map(Number);
    const strike = (k) => k === 3 && equalSpacing
      ? combine([2, unit('K2')], [-1, unit('K1')]) : unit(`K${k}`);
    const call = (k, t) => unit(`C${k}${t}`);
    const put = (k, t) => combine([1, call(k, t)], [-1, unit('S')], [1, strike(k)], [-1, unit(`R${t}`)]);
    const straddle = (k, t) => combine([1, call(k, t)], [1, put(k, t)]);

    switch (kind) {
      case 'stock': return unit('S');
      case 'strike': return strike(a);
      case 'rc': case 'reversal': return unit(`R${a}`);
      case 'conversion': return combine([-1, unit(`R${a}`)]);
      case 'parity': return combine([1, unit('S')], [-1, strike(a)]);
      case 'call': return call(a, b);
      case 'put': return put(a, b);
      case 'combo': return combine([1, call(a, b)], [-1, put(a, b)]);
      case 'straddle': return straddle(a, b);
      case 'bw': return combine([1, call(a, b)], [-1, unit('S')], [1, strike(a)]);
      case 'ps': return combine([1, call(a, b)], [-1, unit(`R${b}`)]);
      case 'risky': return combine([1, call(a, c)], [-1, put(b, c)]);
      case 'strangle': return combine([1, call(a, c)], [1, put(b, c)]);
      case 'box': return combine([1, strike(a)], [-1, strike(b)]);
      case 'cv': return combine([1, call(b, c)], [-1, call(a, c)]);
      case 'pv': return combine([1, put(a, c)], [-1, put(b, c)]);
      case 'swap': return combine([1, straddle(a, c)], [-1, straddle(b, c)]);
      case 'ct': return combine([1, call(a, c)], [-1, call(a, b)]);
      case 'pt': return combine([1, put(a, c)], [-1, put(a, b)]);
      case 'jelly': return combine([1, unit(`R${a}`)], [-1, unit(`R${b}`)]);
      case 'butterfly': return combine([1, call(1, a)], [-2, call(2, a)], [1, call(3, a)]);
      case 'iron': return combine([1, call(2, a)], [1, put(2, a)], [-1, call(1, a)], [-1, put(3, a)]);
      default: throw new Error(`Unknown PCP 2 instrument: ${key}`);
    }
  }

  // A circuit has exactly one dependency and no zero coefficient. Consequently,
  // any member is uniquely determined by all others, and each clue is essential.
  function dependency(vectors) {
    const columns = vectors.length;
    const matrix = basis.map((_, row) => vectors.map((vector) => rational(BigInt(vector[row]))));
    const pivots = [];
    let pivotRow = 0;
    for (let column = 0; column < columns && pivotRow < matrix.length; column += 1) {
      const candidate = matrix.findIndex((row, index) => index >= pivotRow && row[column][0] !== 0n);
      if (candidate < 0) continue;
      [matrix[pivotRow], matrix[candidate]] = [matrix[candidate], matrix[pivotRow]];
      const pivot = matrix[pivotRow][column];
      matrix[pivotRow] = matrix[pivotRow].map((value) => divide(value, pivot));
      for (let row = 0; row < matrix.length; row += 1) {
        if (row === pivotRow || matrix[row][column][0] === 0n) continue;
        const factor = matrix[row][column];
        matrix[row] = matrix[row].map((value, index) => subtract(value, multiply(factor, matrix[pivotRow][index])));
      }
      pivots.push(column);
      pivotRow += 1;
    }
    if (columns - pivots.length !== 1) return null;
    const free = Array.from({ length: columns }, (_, index) => index).find((index) => !pivots.includes(index));
    const coefficients = Array.from({ length: columns }, () => [0n, 1n]);
    coefficients[free] = [1n, 1n];
    pivots.forEach((column, row) => { coefficients[column] = [-matrix[row][free][0], matrix[row][free][1]]; });
    if (coefficients.some(([numerator]) => numerator === 0n)) return null;
    const denominator = coefficients.reduce((common, [, value]) => common / gcd(common, value) * value, 1n);
    let integers = coefficients.map(([numerator, divisor]) => numerator * (denominator / divisor));
    const divisor = integers.reduce((common, value) => gcd(common, value), 0n);
    const sign = integers[0] < 0n ? -1n : 1n;
    integers = integers.map((value) => value / divisor * sign);
    return integers.map(Number);
  }

  // Extend an exact row-echelon basis only when a quote contributes a new
  // dimension. Distractors independent of the entire original circuit cannot
  // reveal its target or substitute for any required clue, even together.
  function extendSpan(span, vector) {
    let row = vector.map((value) => rational(BigInt(value)));
    for (const entry of span) {
      const factor = row[entry.pivot];
      if (factor[0] === 0n) continue;
      row = row.map((value, index) => subtract(value, multiply(factor, entry.row[index])));
    }
    const pivot = row.findIndex(([numerator]) => numerator !== 0n);
    if (pivot < 0) return null;
    const divisor = row[pivot];
    return [...span, { pivot, row: row.map((value) => divide(value, divisor)) }]
      .sort((a, b) => a.pivot - b.pivot);
  }

  function canonicalVector(vector) {
    const divisor = vector.reduce((common, value) => gcd(common, BigInt(value)), 0n);
    if (divisor === 0n) return 'zero';
    const sign = vector.find((value) => value !== 0) < 0 ? -1n : 1n;
    return vector.map((value) => String(BigInt(value) / divisor * sign)).join(',');
  }

  function compileFamily(family) {
    if (new Set(family.keys).size !== family.keys.length) throw new Error(`${family.id}: repeated instrument.`);
    const vectors = family.keys.map((key) => expression(key, family.equalSpacing));
    const coefficients = dependency(vectors);
    if (!coefficients) throw new Error(`${family.id}: clues are redundant or do not determine a unique answer.`);
    const signature = vectors.map(canonicalVector).sort().join('|');
    return { ...family, vectors, coefficients, signature };
  }

  let compiled;
  function getBanks() {
    if (compiled) return compiled;
    const banks = { medium: [], hard: [], givenQuoteCounts: {}, duplicates: [], errors: [] };
    const seen = new Map();
    const ids = new Set();
    for (const [mode, catalog] of [['medium', mediumCatalog], ['hard', hardCatalog]]) {
      if (!Array.isArray(catalog)) throw new Error(`Missing PCP 2 ${mode} catalog.`);
      for (const entry of catalog) {
        try {
          if (ids.has(entry.id)) throw new Error(`${entry.id}: duplicate family ID.`);
          ids.add(entry.id);
          if (mode === 'hard' && entry.keys.length < 5) throw new Error(`${entry.id}: Hard requires at least four essential clues.`);
          const family = compileFamily({ ...entry, mode });
          if (seen.has(family.signature)) {
            const existing = seen.get(family.signature);
            banks.duplicates.push({ id: entry.id, sameAs: existing.id });
            // Carry, reversal, and conversion are useful alternate quotations
            // of one identity, not additional families or probability weight.
            if (mode === 'medium' && entry.keys.slice().sort().join('|') !== existing.keys.slice().sort().join('|')) {
              existing.presentations = [...(existing.presentations || []), family];
            }
            continue;
          }
          seen.set(family.signature, family);
          banks[mode].push(family);
        } catch (error) {
          banks.errors.push(error.message);
        }
      }
      banks.givenQuoteCounts[mode] = Math.max(...banks[mode].map((family) => family.keys.length - 1)) + 2;
    }
    compiled = banks;
    return banks;
  }

  function randomInteger(minimum, maximum, random) {
    return minimum + Math.floor(random() * (maximum - minimum + 1));
  }

  // Independently sample convex put curves in cents, then derive calls by PCP.
  // Unlike a fixed payoff distribution, this does not force equal butterflies
  // or equal option time spreads at different strikes.
  function generateState(equalSpacing = false, random = Math.random) {
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const center = randomInteger(4500, 14500, random);
      const upperGap = randomInteger(200, 500, random);
      const lowerGap = equalSpacing ? upperGap : randomInteger(200, 500, random);
      const strikes = [center + upperGap, center, center - lowerGap];
      const stock = center + randomInteger(-250, 250, random);
      const carries = [randomInteger(-10, 300, random), randomInteger(-10, 300, random)];
      const calls = [];
      const puts = [];
      let valid = true;
      for (let t = 0; t < 2; t += 1) {
        const lowVertical = randomInteger(0, lowerGap, random);
        const minimumUpper = Math.ceil(lowVertical * upperGap / lowerGap);
        const highVertical = randomInteger(minimumUpper, upperGap, random);
        const offsets = [lowVertical + highVertical, lowVertical, 0];
        let minimumBase = 0;
        for (let k = 0; k < 3; k += 1) {
          const forward = stock - strikes[k] + carries[t];
          minimumBase = Math.max(minimumBase,
            1 - forward - offsets[k],
            1 - carries[t] - offsets[k],
            1 - (stock - strikes[k]) - offsets[k]);
          if (t > 0) {
            minimumBase = Math.max(minimumBase, puts[t - 1][k] - offsets[k], calls[t - 1][k] - offsets[k] - forward);
          }
        }
        const maximumBase = 2000 - offsets[0];
        if (minimumBase > maximumBase) { valid = false; break; }
        const base = randomInteger(minimumBase, maximumBase, random);
        puts.push(offsets.map((offset) => base + offset));
        calls.push(puts[t].map((premium, k) => premium + stock - strikes[k] + carries[t]));
      }
      if (!valid) continue;
      const state = { stock, strikes, carries, calls, puts, equalSpacing };
      state.basis = [stock, ...strikes, ...carries, calls[0][0], calls[1][0], calls[0][1], calls[1][1], calls[0][2], calls[1][2]];
      return state;
    }
    throw new Error('Unable to generate a valid PCP 2 market.');
  }

  function valueOf(key, state) {
    return expression(key, state.equalSpacing).reduce((total, coefficient, index) => total + coefficient * state.basis[index], 0);
  }

  function contractIndices(keys) {
    const strikes = new Set();
    const expiries = new Set();
    for (const key of keys) {
      const [kind, ...raw] = key.split(':');
      const [a, b, c] = raw.map(Number);
      if (['strike', 'parity'].includes(kind)) strikes.add(a);
      if (['rc', 'reversal', 'conversion'].includes(kind)) expiries.add(a);
      if (['call', 'put', 'combo', 'straddle', 'bw', 'ps'].includes(kind)) { strikes.add(a); expiries.add(b); }
      if (['box', 'risky', 'strangle', 'cv', 'pv', 'swap'].includes(kind)) {
        strikes.add(a); strikes.add(b);
        if (c) expiries.add(c);
      }
      if (['ct', 'pt'].includes(kind)) { strikes.add(a); expiries.add(b); expiries.add(c); }
      if (kind === 'jelly') { expiries.add(a); expiries.add(b); }
      if (['butterfly', 'iron'].includes(kind)) { [1, 2, 3].forEach((k) => strikes.add(k)); expiries.add(a); }
    }
    return { strikes: [...strikes].sort(), expiries: [...expiries].sort() };
  }

  const distractorCache = new WeakMap();

  function distractorPool(family) {
    if (distractorCache.has(family)) return distractorCache.get(family);
    const keys = [];
    for (let time = 1; time <= 2; time += 1) {
      for (let strike = 1; strike <= 3; strike += 1) {
        for (const kind of ['combo', 'straddle', 'bw', 'ps']) keys.push(`${kind}:${strike}:${time}`);
        for (let low = strike + 1; low <= 3; low += 1) {
          for (const kind of ['risky', 'strangle', 'cv', 'pv', 'swap']) keys.push(`${kind}:${strike}:${low}:${time}`);
        }
      }
      for (const kind of ['reversal', 'conversion']) keys.push(`${kind}:${time}`);
      // Adding a fly to an unequal-strike family must not silently impose an
      // equal-spacing constraint, which could change the intended solution.
      if (family.equalSpacing) for (const kind of ['butterfly', 'iron']) keys.push(`${kind}:${time}`);
    }
    for (let high = 1; high <= 3; high += 1) {
      for (let low = high + 1; low <= 3; low += 1) keys.push(`box:${high}:${low}`);
      for (const kind of ['ct', 'pt']) keys.push(`${kind}:${high}:1:2`);
    }
    keys.push('jelly:1:2');

    const span = family.vectors.reduce((current, vector) => extendSpan(current, vector) || current, []);
    const candidates = keys.filter((key) => !family.keys.includes(key)).map((key) => ({
      key,
      vector: expression(key, family.equalSpacing),
      contracts: contractIndices([key]),
    })).filter(({ vector }) => extendSpan(span, vector));
    const pool = { span, candidates };
    distractorCache.set(family, pool);
    return pool;
  }

  function selectDistractors(family, count, random) {
    const pool = distractorPool(family);
    const candidates = pool.candidates.map((candidate) => ({ ...candidate, tie: random() }));
    let span = pool.span;
    const selected = [];
    for (let index = 0; index < count; index += 1) {
      const context = contractIndices([...family.keys, ...selected]);
      // Prefer existing contracts to avoid adding gratuitous labels. New
      // strikes or expirations are allowed when independence requires them.
      const cost = (candidate) => (
        candidate.contracts.strikes.filter((strike) => !context.strikes.includes(strike)).length
        + candidate.contracts.expiries.filter((time) => !context.expiries.includes(time)).length
      );
      candidates.sort((a, b) => cost(a) - cost(b) || a.tie - b.tie);
      let accepted = false;
      while (candidates.length > 0) {
        const candidate = candidates.shift();
        const expanded = extendSpan(span, candidate.vector);
        if (!expanded) continue;
        span = expanded;
        selected.push(candidate.key);
        accepted = true;
        break;
      }
      if (!accepted) throw new Error(`${family.id}: unable to add ${count} independent distractors.`);
    }
    return selected;
  }

  function labelOf(key, context, aliases = {}) {
    const [kind, ...raw] = key.split(':');
    const [a, b, c] = raw.map(Number);
    const k = (value) => `K${subscript(context.strikes.indexOf(value) + 1)}`;
    const t = (value) => `T${subscript(context.expiries.indexOf(value) + 1)}`;
    const atTime = (value) => context.expiries.length > 1 ? ` · ${t(value)}` : '';
    const prefix = (name, strikes) => {
      if (!strikes) return name;
      const text = ['B/W', 'P&S'].includes(name) ? name : name[0].toLowerCase() + name.slice(1);
      return `${strikes} ${text}`;
    };
    const atStrike = (name) => prefix(name,
      context.strikes.length > 1 && !isObviousWing(key, context.keys || []) ? k(a) : '');
    // Two ordered strikes have one conventional high/low pair. Three strikes
    // have several possible intervals, so name the pair in that case.
    const atPair = (name) => prefix(name, context.strikes.length > 2 ? `${k(a)} − ${k(b)}` : '');
    const optionNames = { call: 'Call', put: 'Put', combo: 'Combo', straddle: 'Straddle', bw: 'B/W', ps: 'P&S' };
    if (optionNames[kind]) return `${atStrike(optionNames[kind])}${atTime(b)}`;
    switch (kind) {
      case 'stock': return 'Stock';
      case 'strike': return context.strikes.length > 1 ? k(a) : 'Strike';
      case 'parity': return atStrike('Parity');
      case 'rc': return `r/c${context.expiries.length > 1 ? subscript(context.expiries.indexOf(a) + 1) : ''}`;
      case 'reversal': return `Reversal${atTime(a)}`;
      case 'conversion': return `Conversion${atTime(a)}`;
      case 'box': return atPair('Box');
      case 'risky': return `${atPair('Risky')}${atTime(c)}`;
      case 'strangle': return `${atPair('Strangle')}${atTime(c)}`;
      case 'cv': return `${atPair(aliases[key] || 'Call vertical')}${atTime(c)}`;
      case 'pv': return `${atPair('Put vertical')}${atTime(c)}`;
      case 'swap': return `${k(a)} − ${k(b)} straddle swap${atTime(c)}`;
      case 'ct': return `${atStrike('Call spread')} · ${t(c)} − ${t(b)}`;
      case 'pt': return `${atStrike('Put spread')} · ${t(c)} − ${t(b)}`;
      case 'jelly': return 'Jelly roll';
      case 'butterfly': return `Butterfly${atTime(a)}`;
      case 'iron': return `Iron fly${atTime(a)}`;
      default: throw new Error(`Missing label for ${key}`);
    }
  }

  const subscript = (number) => String(number).replace(/\d/g, (digit) => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)]);

  function isObviousWing(key, keys) {
    const [kind, strike, expiry] = key.split(':');
    if (!['call', 'put'].includes(kind) || keys.length === 0) return false;
    // A simple outside-pair split identifies its call and put wings. Once
    // other structures or same-kind premiums appear, retain explicit strikes.
    if (keys.some((item) => !['call', 'put', 'strangle', 'risky'].includes(item.split(':')[0]))) return false;
    const options = keys.filter((item) => item.startsWith(`${kind}:`));
    if (options.some((item) => item.split(':')[1] !== strike)) return false;
    const pairs = keys.filter((item) => ['strangle', 'risky'].includes(item.split(':')[0]));
    return pairs.length > 0 && pairs.every((item) => {
      const [, high, low, time] = item.split(':');
      return (kind === 'call' ? high : low) === strike && time === expiry;
    });
  }

  const isOverQuote = (key) => ['combo', 'risky'].includes(key.split(':')[0]);
  const money = (cents) => `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;

  function questionFor(family, targetIndex, random = Math.random, presentationIndex = 0) {
    const canonicalId = family.id;
    const canonicalTargetIndex = targetIndex;
    if (presentationIndex > 0) {
      const targetVector = canonicalVector(family.vectors[targetIndex]);
      family = family.presentations[presentationIndex - 1];
      targetIndex = family.vectors.findIndex((vector) => canonicalVector(vector) === targetVector);
    }
    const state = generateState(Boolean(family.equalSpacing), random);
    const givenQuoteCount = getBanks().givenQuoteCounts[family.mode || 'medium'];
    const distractors = selectDistractors(family, givenQuoteCount - (family.keys.length - 1), random);
    const allKeys = [...family.keys, ...distractors];
    const context = { ...contractIndices(allKeys), keys: allKeys };
    const aliases = {};
    for (const key of allKeys) {
      if (key.startsWith('cv:') && random() < 0.25) aliases[key] = 'Synthetic call vertical';
    }
    const values = allKeys.map((key) => valueOf(key, state));
    const labels = allKeys.map((key) => labelOf(key, context, aliases));
    // Keep unknown combo/risky targets in the signed c/o convention. Choosing
    // their direction from the hidden answer would reveal its sign.
    if (isOverQuote(family.keys[targetIndex])) labels[targetIndex] += ' (c/o)';
    const targetCoefficient = family.coefficients[targetIndex];
    const terms = family.keys.flatMap((key, index) => index === targetIndex ? [] : [{
      key,
      label: labels[index],
      value: values[index],
      ...(isOverQuote(key) ? { quote: values[index] < 0 ? 'p/o' : 'c/o' } : {}),
      numerator: -family.coefficients[index],
    }]);
    const numerator = terms.reduce((sum, term) => sum + term.numerator * term.value, 0);
    if (numerator % targetCoefficient !== 0 || numerator / targetCoefficient !== values[targetIndex]) {
      throw new Error(`${family.id}: the generated values do not satisfy the exact solution.`);
    }
    const formulaTerms = terms.map((term, index) => {
      const coefficient = term.numerator * Math.sign(targetCoefficient) * (term.quote === 'p/o' ? -1 : 1);
      const sign = coefficient < 0 ? '− ' : (index === 0 ? '' : '+ ');
      return `${sign}${Math.abs(coefficient) === 1 ? '' : `${Math.abs(coefficient)} × `}${term.label}${term.quote ? ` (${term.quote})` : ''}`;
    });
    const divisor = Math.abs(targetCoefficient);
    const formula = `${labels[targetIndex]} = ${divisor === 1 ? '' : '('}${formulaTerms.join(' ')}${divisor === 1 ? '' : `) / ${divisor}`}`;
    const extraQuotes = distractors.map((key, index) => {
      const position = family.keys.length + index;
      return {
        key,
        label: labels[position],
        value: values[position],
        ...(isOverQuote(key) ? { quote: values[position] < 0 ? 'p/o' : 'c/o' } : {}),
      };
    });
    const contractInfo = [];
    if (context.strikes.length > 1 && labels.some((label) => /K[₀-₉]/u.test(label))) {
      contractInfo.push(context.strikes.map((_, index) => `K${subscript(index + 1)}`).join(' > '));
    }
    if (family.equalSpacing && context.strikes.length === 3) contractInfo.push('Equal strike spacing');
    if (context.expiries.length > 1) contractInfo.push(context.expiries.map((_, index) => `T${subscript(index + 1)}`).join(' < '));
    return {
      id: `${canonicalId}:${canonicalTargetIndex}`,
      family: family.name,
      familyId: canonicalId,
      presentationId: family.id,
      contractInfo,
      givens: [
        ...terms.map(({ key, label, value, quote }) => ({ key, label, value, ...(quote ? { quote } : {}) })),
        ...extraQuotes,
      ],
      targetKey: family.keys[targetIndex],
      targetLabel: labels[targetIndex],
      answer: values[targetIndex],
      steps: [formula],
    };
  }

  let questionBanks;
  function createQuestion(mode = 'medium', random = Math.random) {
    const banks = getBanks();
    if (banks.errors.length) throw new Error(banks.errors.join('\n'));
    if (!questionBanks) {
      questionBanks = Object.fromEntries(['medium', 'hard'].map((difficulty) => [difficulty,
        banks[difficulty].flatMap((family) => family.keys.map((_, targetIndex) => ({ family, targetIndex }))),
      ]));
    }
    const bank = questionBanks[mode === 'hard' ? 'hard' : 'medium'];
    const { family, targetIndex } = bank[Math.floor(random() * bank.length)];
    const presentationIndex = Math.floor(random() * (1 + (family.presentations?.length || 0)));
    return questionFor(family, targetIndex, random, presentationIndex);
  }

  return { createQuestion, getBanks, compileFamily, dependency, expression, generateState, valueOf, questionFor, labelOf, contractIndices, money };
}));
