(function (root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  if (root) root.PositionStructures = catalog;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Match PCP 2's signed structure definitions, not similarly named strategies
  // with different legs. Fixed cash denotes today's strike amount, not a bond.
  const market = { S: 100, r: 0.05, sigma: 0.25, expiries: [30, 60] };
  const option = (type, strike, direction = 1, expiry = 1) => ({ type, strike, direction, expiry });
  const call = (strike, direction = 1, expiry = 1) => option('call', strike, direction, expiry);
  const put = (strike, direction = 1, expiry = 1) => option('put', strike, direction, expiry);
  const stock = (direction = 1) => ({ type: 'underlying', direction });
  const cash = (strike, direction = 1) => ({ type: 'cash', strike, direction });
  // conventionalZeros: Greeks a trader would call zero for this structure even
  // though the model leaves a small residue (from the 5% rate, or strikes set
  // at spot rather than the forward). Tests require each to stay small.
  const structure = (key, label, strikes, legs, conventionalZeros = []) =>
    ({ key, label, strikes, legs, conventionalZeros });
  const ATM_ZEROS = ['vanna'];
  const SYMMETRIC_VOL_ZEROS = ['delta', 'rho', 'vanna'];
  const CALENDAR_ZEROS = ['delta', 'vanna', 'charm'];
  const FLY_ZEROS = ['delta', 'rho', 'vanna', 'charm'];

  const structures = [
    structure('call:1:1', 'Call', [100], [call(1)], ATM_ZEROS),
    structure('put:1:1', 'Put', [100], [put(1)], ATM_ZEROS),
    structure('stock', 'Stock', [], [stock()]),
    structure('combo:1:1', 'Combo c/o', [100], [call(1), put(1, -1)]),
    structure('straddle:1:1', 'Straddle', [100], [call(1), put(1)], SYMMETRIC_VOL_ZEROS),
    structure('bw:1:1', 'B/W', [100], [call(1), stock(-1), cash(1)], ATM_ZEROS),
    structure('ps:1:1', 'P&S', [100], [put(1), stock(), cash(1, -1)], ATM_ZEROS),
    structure('risky:1:2:1', 'K₁ − K₂ risky c/o', [105, 95], [call(1), put(2, -1)]),
    structure('strangle:1:2:1', 'K₁ − K₂ strangle', [105, 95], [call(1), put(2)], SYMMETRIC_VOL_ZEROS),
    structure('box:1:2', 'K₁ − K₂ box', [105, 95], [call(2), call(1, -1), put(1), put(2, -1)], ['theta']),
    structure('cv:1:2:1', 'K₁ − K₂ call vertical', [105, 95], [call(2), call(1, -1)]),
    structure('pv:1:2:1', 'K₁ − K₂ put vertical', [105, 95], [put(1), put(2, -1)]),
    structure('swap:1:2:1', 'K₁ − K₂ straddle swap', [105, 95], [call(1), put(1), call(2, -1), put(2, -1)]),
    structure('ct:1:1:2', 'T₁T₂ call spread', [100], [call(1), call(1, -1, 2)], CALENDAR_ZEROS),
    structure('pt:1:1:2', 'T₁T₂ put spread', [100], [put(1), put(1, -1, 2)], CALENDAR_ZEROS),
    structure('jelly:1:1:2', 'T₁T₂ jelly roll', [100], [call(1), put(1, -1), call(1, -1, 2), put(1, 1, 2)]),
    structure('butterfly:1', 'K₁ − K₂ − K₃ butterfly', [105, 100, 95], [call(1), call(2, -2), call(3)], FLY_ZEROS),
    structure('iron:1', 'K₁ − K₂ − K₃ iron fly', [105, 100, 95], [call(2), put(2), call(1, -1), put(3, -1)], FLY_ZEROS),
    structure('reversal:1', 'Reversal', [100], [call(1), put(1, -1), stock(-1), cash(1)]),
    structure('conversion:1', 'Conversion', [100], [put(1), call(1, -1), stock(), cash(1, -1)]),
  ];

  function createPosition(entry, direction) {
    const legs = entry.legs.map((leg) => ({
      ...leg,
      direction: direction * leg.direction,
      S: market.S,
      ...(leg.type === 'underlying' ? {} : { K: entry.strikes[leg.strike - 1] }),
      ...(['call', 'put'].includes(leg.type) ? {
        r: market.r, sigma: market.sigma, dte: market.expiries[leg.expiry - 1],
      } : {}),
    }));
    const seen = new Set();
    const moneyness = legs.filter((leg) => ['call', 'put'].includes(leg.type))
      .sort((left, right) => left.strike - right.strike || left.type.localeCompare(right.type)).flatMap((leg) => {
      const contract = `${leg.type}:${leg.strike}`;
      if (seen.has(contract)) return [];
      seen.add(contract);
      const status = leg.K === market.S ? 'ATM'
        : ((leg.type === 'call' ? market.S > leg.K : market.S < leg.K) ? 'ITM' : 'OTM');
      const strike = entry.strikes.length > 1 ? `K${'₀₁₂₃₄₅₆₇₈₉'[leg.strike]}=$${leg.K} ` : '';
      return [`${strike}${leg.type} ${status}`];
    }).join(' · ');
    let name = `${direction > 0 ? 'Long' : 'Short'} ${entry.label}`;
    if (entry.key.startsWith('swap:')) {
      // The first strike in a swap label always identifies the long straddle.
      const [, high, low] = entry.key.split(':');
      const order = direction > 0 ? [high, low] : [low, high];
      name = `${order.map((strike) => `K${'₀₁₂₃₄₅₆₇₈₉'[Number(strike)]}`).join(' − ')} straddle swap`;
    }
    return {
      structureKey: entry.key,
      name,
      direction,
      moneyness,
      conventionalZeros: entry.conventionalZeros,
      legs,
    };
  }

  return { market, structures, createPosition };
}));
