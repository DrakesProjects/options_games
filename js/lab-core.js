/* Lab bookkeeping shared by the options games: per-question records rolled up
   into a few broad categories, with one category flagged as the problem area.
   Game-agnostic; each game supplies its own categories. */
(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  if (root) root.OptionsLabCore = core;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORED_PER_CATEGORY = 1000;
  const RECENT_PER_CATEGORY = 200;
  const MINIMUM_FOR_RANKING = 10;

  // Each record is one answered question (or, in Position Risks, one Greek):
  // { category, ms, wrongEntries }. The games have no skips, so every record
  // ends correct; misses show up as wrong entries and as time.
  function sanitize(record) {
    const ms = Number(record?.ms);
    const wrongEntries = Number(record?.wrongEntries);
    if (!Number.isFinite(ms) || ms < 0) return null;
    return {
      ms: Math.round(ms),
      wrongEntries: Number.isInteger(wrongEntries) && wrongEntries > 0 ? wrongEntries : 0,
    };
  }

  function addRecords(history, categories, records, completedAt = Date.now()) {
    const next = {};
    for (const { key } of categories) {
      const existing = Array.isArray(history?.[key]) ? history[key] : [];
      const added = records.filter((record) => record?.category === key)
        .map(sanitize).filter(Boolean)
        .map((record) => ({ ...record, at: completedAt }));
      next[key] = existing.concat(added).slice(-STORED_PER_CATEGORY);
    }
    // Keep data for categories this game isn't currently showing (e.g. a
    // disabled relationship) rather than silently discarding it.
    for (const [key, value] of Object.entries(history || {})) {
      if (!(key in next) && Array.isArray(value)) next[key] = value.slice(-STORED_PER_CATEGORY);
    }
    return next;
  }

  // metric 'time': problem area = most seconds per question (wrong entries
  // already cost time). metric 'firstTry': problem area = lowest share right
  // on the first submit, for games where answers share one timer.
  function report(history, categories, metric = 'time') {
    const rows = categories.map(({ key, label }) => {
      const records = (Array.isArray(history?.[key]) ? history[key] : [])
        .map(sanitize).filter(Boolean).slice(-RECENT_PER_CATEGORY);
      const count = records.length;
      const wrongEntries = records.reduce((sum, record) => sum + record.wrongEntries, 0);
      const firstTry = records.filter((record) => record.wrongEntries === 0).length;
      const totalMs = records.reduce((sum, record) => sum + record.ms, 0);
      return {
        key,
        label,
        count,
        accuracy: count === 0 ? null : count / (count + wrongEntries),
        firstTryAccuracy: count === 0 ? null : firstTry / count,
        averageSeconds: count === 0 ? null : totalMs / count / 1000,
        enoughData: count >= MINIMUM_FOR_RANKING,
        weakest: false,
      };
    });
    const ranked = rows.filter((row) => row.enoughData);
    if (ranked.length >= 2) {
      const worse = metric === 'firstTry'
        ? (row, worst) => row.firstTryAccuracy < worst.firstTryAccuracy
        : (row, worst) => row.averageSeconds > worst.averageSeconds;
      ranked.reduce((worst, row) => (worse(row, worst) ? row : worst)).weakest = true;
    }
    return rows;
  }

  return {
    STORED_PER_CATEGORY,
    RECENT_PER_CATEGORY,
    MINIMUM_FOR_RANKING,
    addRecords,
    report,
  };
}));
