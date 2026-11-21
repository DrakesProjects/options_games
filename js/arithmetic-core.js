(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  if (root) root.ArithmeticCore = core;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OPERATIONS = ['add', 'sub', 'mul', 'div'];
  const OPERATION_LABELS = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' };
  const SYMBOLS = { add: '+', sub: '−', mul: '×', div: '÷' };
  const RANGE_LIMIT = 9999;

  // Subtraction reverses an addition problem and division reverses a
  // multiplication problem, so answers stay positive whole numbers.
  const STANDARD_SETTINGS = Object.freeze({
    operations: Object.freeze({ add: true, sub: true, mul: true, div: true }),
    addition: Object.freeze({ left: Object.freeze({ min: 2, max: 100 }), right: Object.freeze({ min: 2, max: 100 }) }),
    multiplication: Object.freeze({ left: Object.freeze({ min: 2, max: 12 }), right: Object.freeze({ min: 2, max: 100 }) }),
  });

  const LAB_MINIMUM_QUESTIONS = 10;
  const LAB_RECENT_QUESTIONS = 200;
  const LAB_STORED_QUESTIONS = 1000;

  function cloneStandard() {
    return JSON.parse(JSON.stringify(STANDARD_SETTINGS));
  }

  function toBound(value, fallback) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.min(RANGE_LIMIT, Math.max(1, number));
  }

  function normalizeRange(range, fallback) {
    let min = toBound(range && range.min, fallback.min);
    let max = toBound(range && range.max, fallback.max);
    if (min > max) [min, max] = [max, min];
    return { min, max };
  }

  function normalizePair(pair, fallback) {
    return {
      left: normalizeRange(pair && pair.left, fallback.left),
      right: normalizeRange(pair && pair.right, fallback.right),
    };
  }

  function normalizeSettings(raw) {
    const standard = cloneStandard();
    const source = raw && typeof raw === 'object' ? raw : {};
    const operations = {};
    for (const op of OPERATIONS) {
      operations[op] = typeof source.operations?.[op] === 'boolean' ? source.operations[op] : standard.operations[op];
    }
    return {
      operations,
      addition: normalizePair(source.addition, standard.addition),
      multiplication: normalizePair(source.multiplication, standard.multiplication),
    };
  }

  function isStandard(settings) {
    return JSON.stringify(normalizeSettings(settings)) === JSON.stringify(cloneStandard());
  }

  function enabledOperations(settings) {
    return OPERATIONS.filter((op) => settings.operations[op]);
  }

  function randomInt(random, { min, max }) {
    return min + Math.floor(random() * (max - min + 1));
  }

  function createProblem(op, settings, random = Math.random) {
    if (!OPERATIONS.includes(op)) throw new Error(`Unknown operation: ${op}`);
    const pair = op === 'add' || op === 'sub' ? settings.addition : settings.multiplication;
    const left = randomInt(random, pair.left);
    const right = randomInt(random, pair.right);
    let a;
    let b;
    let answer;
    if (op === 'add') {
      [a, b, answer] = [left, right, left + right];
    } else if (op === 'sub') {
      // Subtract either addend so both ranges appear as answers.
      const total = left + right;
      const subtrahend = random() < 0.5 ? left : right;
      [a, b, answer] = [total, subtrahend, total - subtrahend];
    } else if (op === 'mul') {
      // The small factor can appear on either side.
      [a, b] = random() < 0.5 ? [left, right] : [right, left];
      answer = left * right;
    } else {
      // The divisor always comes from the first multiplication range.
      [a, b, answer] = [left * right, left, right];
    }
    return { op, a, b, answer, text: `${a} ${SYMBOLS[op]} ${b}` };
  }

  // Draws uniformly across enabled operations and avoids an immediate repeat
  // whenever the ranges allow another problem.
  function createGenerator(settings, { operations, random = Math.random } = {}) {
    const normalized = normalizeSettings(settings);
    const ops = operations && operations.length ? operations.slice() : enabledOperations(normalized);
    if (ops.length === 0) throw new Error('At least one operation must be enabled.');
    let previous = null;
    return function next() {
      let problem;
      for (let attempt = 0; attempt < 20; attempt++) {
        const op = ops[Math.floor(random() * ops.length)];
        problem = createProblem(op, normalized, random);
        if (!previous || problem.text !== previous.text) break;
      }
      previous = problem;
      return problem;
    };
  }

  function sanitizeEntry(value) {
    return String(value ?? '').replace(/\D/g, '').slice(0, 9);
  }

  // A wrong entry is a full-length answer that doesn't match. Shorter input is
  // still pending, because the player may be partway through typing.
  function evaluateEntry(problem, value) {
    const digits = sanitizeEntry(value);
    const target = String(problem.answer);
    if (digits === target) return 'correct';
    if (digits.length >= target.length) return 'wrong';
    return 'pending';
  }

  function summarizeRun(log, durationSeconds) {
    const correct = log.filter((entry) => entry.correct).length;
    const skips = log.filter((entry) => entry.skipped).length;
    const wrongEntries = log.reduce((sum, entry) => sum + entry.wrongEntries, 0);
    const attempts = correct + skips + wrongEntries;
    return {
      score: correct,
      questions: log.length,
      skips,
      wrongEntries,
      accuracy: attempts === 0 ? null : correct / attempts,
      questionsPerMinute: durationSeconds > 0 ? correct * 60 / durationSeconds : 0,
    };
  }

  function addToLab(history, log, completedAt = Date.now()) {
    const next = {};
    for (const op of OPERATIONS) {
      const existing = Array.isArray(history?.[op]) ? history[op] : [];
      const added = log.filter((entry) => entry.op === op).map((entry) => ({
        correct: Boolean(entry.correct),
        skipped: Boolean(entry.skipped),
        wrongEntries: entry.wrongEntries,
        ms: Math.round(entry.ms),
        a: entry.a,
        b: entry.b,
        at: completedAt,
      }));
      next[op] = existing.concat(added).slice(-LAB_STORED_QUESTIONS);
    }
    return next;
  }

  function labReport(history) {
    const rows = OPERATIONS.map((op) => {
      const records = (Array.isArray(history?.[op]) ? history[op] : []).slice(-LAB_RECENT_QUESTIONS);
      const correct = records.filter((record) => record.correct).length;
      const skips = records.filter((record) => record.skipped).length;
      const wrongEntries = records.reduce((sum, record) => sum + (record.wrongEntries || 0), 0);
      const attempts = correct + skips + wrongEntries;
      const totalMs = records.reduce((sum, record) => sum + (record.ms || 0), 0);
      const correctMs = records.filter((record) => record.correct).reduce((sum, record) => sum + record.ms, 0);
      return {
        op,
        label: OPERATION_LABELS[op],
        questions: records.length,
        correct,
        accuracy: attempts === 0 ? null : correct / attempts,
        averageSeconds: correct === 0 ? null : correctMs / correct / 1000,
        // Time spent per correct answer folds slowness, misses, and skips
        // into one number, so a single weakest operation can be flagged.
        secondsPerCorrect: records.length === 0 ? null : (correct === 0 ? Infinity : totalMs / correct / 1000),
        enoughData: records.length >= LAB_MINIMUM_QUESTIONS,
        weakest: false,
      };
    });
    const ranked = rows.filter((row) => row.enoughData);
    if (ranked.length >= 2) {
      const weakest = ranked.reduce((worst, row) => (row.secondsPerCorrect > worst.secondsPerCorrect ? row : worst));
      weakest.weakest = true;
    }
    return rows;
  }

  return {
    OPERATIONS,
    OPERATION_LABELS,
    SYMBOLS,
    STANDARD_SETTINGS,
    LAB_MINIMUM_QUESTIONS,
    LAB_RECENT_QUESTIONS,
    normalizeSettings,
    isStandard,
    enabledOperations,
    createProblem,
    createGenerator,
    sanitizeEntry,
    evaluateEntry,
    summarizeRun,
    addToLab,
    labReport,
  };
}));
