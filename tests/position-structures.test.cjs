const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const catalog = require('../js/position-structures.js');
const bank = require('../games/pcp2-bank.js');

const pricing = fs.readFileSync(path.join(__dirname, '../js/greeks.js'), 'utf8')
  .split('// ─── Greek metadata')[0];
const runtime = vm.createContext({ PositionStructures: catalog });
vm.runInContext(pricing, runtime);
const positions = vm.runInContext('NAMED_POSITIONS', runtime);

test('named structures match all PCP 2 position kinds, excluding non-position inputs', () => {
  const banks = bank.getBanks();
  const kinds = new Set([...banks.medium, ...banks.hard]
    .flatMap((family) => family.keys.map((key) => key.split(':')[0]))
    .filter((kind) => !['strike', 'rc', 'parity'].includes(kind)));
  assert.deepEqual(new Set(catalog.structures.map((entry) => entry.key.split(':')[0])), kinds);
  assert.equal(catalog.structures.length, 20);
  assert.equal(positions.length, 40);
  assert.equal(new Set(positions.map((position) => position.name)).size, 40);
  for (const entry of catalog.structures) {
    const over = ['combo', 'risky'].includes(entry.key.split(':')[0]) ? ' c/o' : '';
    const label = bank.labelOf(entry.key, bank.contractIndices([entry.key])) + over;
    assert.equal(entry.label.toLowerCase(), label.toLowerCase());
    assert.ok(entry.strikes.every((strike, index) => index === 0 || entry.strikes[index - 1] > strike));
  }
});

test('every named structure reproduces its exact PCP 2 expression from its signed legs', () => {
  for (const entry of catalog.structures) {
    const result = Array(12).fill(0);
    for (const leg of entry.legs) {
      const key = leg.type === 'underlying' ? 'stock'
        : leg.type === 'cash' ? `strike:${leg.strike}`
          : `${leg.type}:${leg.strike}:${leg.expiry}`;
      bank.expression(key).forEach((coefficient, index) => { result[index] += coefficient * leg.direction; });
    }
    assert.deepEqual(result, bank.expression(entry.key), entry.label);
  }
});

test('long and short positions have opposite computed Greek signs and identical moneyness', () => {
  for (const entry of catalog.structures) {
    const long = positions.find((position) => position.structureKey === entry.key && position.direction === 1);
    const short = positions.find((position) => position.structureKey === entry.key && position.direction === -1);
    assert.equal(long.moneyness, short.moneyness);
    assert.doesNotMatch(long.moneyness, /\b(?:buy|sell|long|short)\b/i);
    const net = runtime.computeNetGreeks(long.legs);
    for (const key of Object.keys(net)) {
      assert.ok(Number.isFinite(net[key]), `${entry.label}: ${key}`);
      assert.equal(long.greeks[key], entry.conventionalZeros.includes(key) ? '~0' : runtime.sign(net[key], key));
      assert.equal(short.greeks[key], long.greeks[key] === '+' ? '-' : long.greeks[key] === '-' ? '+' : '~0');
    }
  }
  for (const kind of ['combo', 'box', 'jelly', 'reversal', 'conversion']) {
    const position = positions.find((entry) => entry.structureKey.split(':')[0] === kind);
    for (const greek of ['gamma', 'vega', 'vanna', 'charm', 'speed', 'volga', 'vegaDecay', 'zomma', 'color']) {
      assert.equal(position.greeks[greek], '~0', `${kind}: ${greek} must cancel`);
    }
  }
});

test('time spreads buy front and straddle swaps name the actual long strike first', () => {
  for (const kind of ['ct', 'pt']) {
    const entry = catalog.structures.find((position) => position.key.startsWith(`${kind}:`));
    const position = catalog.createPosition(entry, 1);
    assert.equal(position.legs[0].dte, 30);
    assert.equal(position.legs[0].direction, 1);
    assert.equal(position.legs[1].dte, 60);
    assert.equal(position.legs[1].direction, -1);
    assert.ok(position.name.includes('T₁T₂'));
  }
  const swap = catalog.structures.find((entry) => entry.key.startsWith('swap:'));
  assert.equal(catalog.createPosition(swap, 1).name, 'K₁ − K₂ straddle swap');
  assert.equal(catalog.createPosition(swap, -1).name, 'K₂ − K₁ straddle swap');
  assert.deepEqual(catalog.createPosition(swap, -1).legs.filter((leg) => leg.direction > 0).map((leg) => leg.K), [95, 95]);
});

test('the normal CDF uses the standard-normal scale', () => {
  assert.ok(Math.abs(runtime.normCDF(0) - 0.5) < 1e-7);
  assert.ok(Math.abs(runtime.normCDF(1) - 0.8413447460685429) < 1e-7);
  assert.ok(Math.abs(runtime.normCDF(-1) - 0.1586552539314571) < 1e-7);
});

test('put and call charm match calendar-time delta decay in the no-dividend model', () => {
  const h = 1e-5;
  for (const K of [90, 100, 110]) {
    for (const T of [30 / 365, 60 / 365]) {
      for (const type of ['call', 'put']) {
        const actual = runtime.bsGreeks(type, 100, K, 0.05, 0.25, T).charm;
        const front = runtime.bsGreeks(type, 100, K, 0.05, 0.25, T - h).delta;
        const back = runtime.bsGreeks(type, 100, K, 0.05, 0.25, T + h).delta;
        assert.ok(Math.abs(actual - (front - back) / (2 * h)) < 1e-4);
      }
    }
  }
});

test('vega decay matches calendar-time vega decay away from the money', () => {
  const h = 1e-5;
  for (const K of [85, 95, 100, 105, 115]) {
    for (const T of [30 / 365, 60 / 365]) {
      for (const sigma of [0.15, 0.25, 0.45]) {
        for (const type of ['call', 'put']) {
          const actual = runtime.bsGreeks(type, 100, K, 0.05, sigma, T).vegaDecay;
          const front = runtime.bsGreeks(type, 100, K, 0.05, sigma, T - h).vega;
          const back = runtime.bsGreeks(type, 100, K, 0.05, sigma, T + h).vega;
          const expected = (front - back) / (2 * h);
          assert.ok(Math.abs(actual - expected) < 1e-4, `${type} K=${K} T=${T} sigma=${sigma}: ${actual} vs ${expected}`);
        }
      }
    }
  }
});

test('the ~0 cutoff catches only near-exact cancellations, with no named answer within 20% of it', () => {
  const scale = vm.runInContext('GREEK_SCALE', runtime);
  const fraction = vm.runInContext('ZERO_FRACTION', runtime);
  const find = (kind) => positions.find((position) => position.structureKey.split(':')[0] === kind && position.direction === 1);
  const raw = (kind, key) => runtime.sign(runtime.computeNetGreeks(find(kind).legs)[key], key);
  // Residues small enough to be arithmetic noise.
  assert.equal(raw('jelly', 'theta'), '~0');
  assert.equal(raw('butterfly', 'delta'), '~0');
  assert.equal(raw('straddle', 'volga'), '~0');
  // Small but real exposures with no convention keep their signs.
  assert.equal(find('cv').greeks.theta, '-');
  assert.equal(find('swap').greeks.theta, '+');
  assert.equal(find('jelly').greeks.rho, '-');
  assert.equal(find('box').greeks.rho, '-');
  assert.equal(find('call').greeks.charm, '-');
  for (const position of positions) {
    const net = runtime.computeNetGreeks(position.legs);
    for (const [key, value] of Object.entries(net)) {
      const ratio = Math.abs(value) / (fraction * scale[key]);
      assert.ok(ratio < 0.8 || ratio > 1.2, `${position.name} ${key} is within 20% of the ~0 cutoff (${ratio.toFixed(3)})`);
    }
  }
});

test('conventional zeros apply to both sides and never hide a sizable exposure', () => {
  const scale = vm.runInContext('GREEK_SCALE', runtime);
  const find = (kind, direction) => positions.find((position) => position.structureKey.split(':')[0] === kind && position.direction === direction);
  const expected = {
    call: ['vanna'], put: ['vanna'], bw: ['vanna'], ps: ['vanna'],
    straddle: ['delta', 'rho', 'vanna'], strangle: ['delta', 'rho', 'vanna'],
    box: ['theta'], ct: ['delta', 'vanna', 'charm'], pt: ['delta', 'vanna', 'charm'],
    butterfly: ['delta', 'rho', 'vanna', 'charm'], iron: ['delta', 'rho', 'vanna', 'charm'],
  };
  for (const entry of catalog.structures) {
    const kind = entry.key.split(':')[0];
    assert.deepEqual(entry.conventionalZeros, expected[kind] || [], entry.label);
    const net = runtime.computeNetGreeks(catalog.createPosition(entry, 1).legs);
    for (const key of entry.conventionalZeros) {
      assert.ok(key in scale, `${entry.label}: unknown Greek ${key}`);
      const share = Math.abs(net[key]) / scale[key];
      assert.ok(share < 0.15, `${entry.label} ${key} is ${(share * 100).toFixed(1)}% of a typical option, too large to call zero`);
      for (const direction of [1, -1]) assert.equal(find(kind, direction).greeks[key], '~0', `${entry.label} ${key}`);
    }
  }
});
