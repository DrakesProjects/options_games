const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'theme.js'), 'utf8');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function load({ storage = {}, withSelect = false, readyState = 'complete', brokenStorage = false } = {}) {
  const classes = new Set();
  const listeners = {};
  const select = withSelect ? { value: '', listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } } : null;
  const store = { ...storage };
  const runtime = {
    document: {
      readyState,
      body: { classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } },
      getElementById: (id) => (id === 'theme-select' ? select : null),
      addEventListener: (name, fn) => { listeners[`document:${name}`] = fn; },
    },
    window: { addEventListener: (name, fn) => { listeners[`window:${name}`] = fn; } },
    localStorage: brokenStorage
      ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
      : { getItem: (key) => (key in store ? store[key] : null), setItem: (key, value) => { store[key] = String(value); } },
  };
  vm.runInContext(source, vm.createContext(runtime));
  return { dark: () => classes.has('theme-dark'), select, store, listeners };
}

test('pages start light, and a saved dark theme applies at load', () => {
  assert.equal(load().dark(), false);
  const page = load({ storage: { 'options-games.theme': 'dark' } });
  assert.equal(page.dark(), true);
});

test('Mental Math\'s old dark setting carries over once and is saved site-wide', () => {
  const legacy = { 'options-games.arithmetic.v1.settings': JSON.stringify({ theme: 'dark', duration: '60' }) };
  const page = load({ storage: legacy });
  assert.equal(page.dark(), true);
  assert.equal(page.store['options-games.theme'], 'dark');
  // An explicit site-wide choice wins over the old setting.
  assert.equal(load({ storage: { ...legacy, 'options-games.theme': 'light' } }).dark(), false);
  const light = load({ storage: { 'options-games.arithmetic.v1.settings': JSON.stringify({ theme: 'light' }) } });
  assert.equal(light.dark(), false);
  assert.equal(light.store['options-games.theme'], undefined);
});

test('the home page selector shows the saved theme, saves changes, and applies them', () => {
  const page = load({ storage: { 'options-games.theme': 'dark' }, withSelect: true });
  assert.equal(page.select.value, 'dark');
  page.select.value = 'light';
  page.select.listeners.change();
  assert.equal(page.dark(), false);
  assert.equal(page.store['options-games.theme'], 'light');
  page.select.value = 'dark';
  page.select.listeners.change();
  assert.equal(page.dark(), true);
  assert.equal(page.store['options-games.theme'], 'dark');
});

test('the selector is connected after the page finishes loading', () => {
  const page = load({ withSelect: true, readyState: 'loading' });
  assert.equal(page.select.listeners.change, undefined);
  page.listeners['document:DOMContentLoaded']();
  assert.equal(page.select.value, 'light');
  assert.equal(typeof page.select.listeners.change, 'function');
});

test('other open tabs follow a theme change', () => {
  const page = load();
  page.store['options-games.theme'] = 'dark';
  page.listeners['window:storage']({ key: 'some-other-key' });
  assert.equal(page.dark(), false);
  page.listeners['window:storage']({ key: 'options-games.theme' });
  assert.equal(page.dark(), true);
});

test('blocked storage falls back to light without breaking the page', () => {
  const page = load({ brokenStorage: true, withSelect: true });
  assert.equal(page.dark(), false);
  page.select.value = 'dark';
  page.select.listeners.change();
  assert.equal(page.dark(), true);
});

test('every page loads the theme first, and only the home page has the selector', () => {
  const pages = {
    'index.html': 'theme.js',
    'games/parity.html': '../theme.js',
    'games/pcp2.html': '../theme.js',
    'games/greeks.html': '../theme.js',
    'games/arithmetic.html': '../theme.js',
  };
  for (const [file, src] of Object.entries(pages)) {
    const html = read(file);
    assert.match(html, new RegExp(`<body[^>]*>\\s*<script src="${src.replace(/\./g, '\\.')}"></script>`), file);
    assert.equal(/id="theme-select"/.test(html), file === 'index.html', file);
  }
  const home = read('index.html');
  assert.match(home, /<div class="hub-theme">[\s\S]*<option value="light">Light<\/option>[\s\S]*<option value="dark">Dark<\/option>/);
});
