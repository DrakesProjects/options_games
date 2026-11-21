/* Site-wide light/dark theme. Every page loads this as the first thing in
   <body>, so the saved theme applies before the page paints. The home page's
   #theme-select changes it, and other open tabs follow along. */
(() => {
  'use strict';

  const THEME_KEY = 'options-games.theme';
  // Mental Math used to keep its own theme in its settings; carry it over once.
  const LEGACY_KEY = 'options-games.arithmetic.v1.settings';

  function savedTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      if (theme === 'light' || theme === 'dark') return theme;
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}');
      return legacy && legacy.theme === 'dark' ? 'dark' : null;
    } catch {
      return null;
    }
  }

  function save(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable (private windows); the theme still applies.
    }
  }

  function apply(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    const select = document.getElementById('theme-select');
    if (select) select.value = theme;
  }

  const initial = savedTheme() || 'light';
  if (initial === 'dark') save(initial);
  apply(initial);

  function connectSelect() {
    const select = document.getElementById('theme-select');
    if (!select) return;
    select.value = savedTheme() || 'light';
    select.addEventListener('change', () => {
      const theme = select.value === 'dark' ? 'dark' : 'light';
      save(theme);
      apply(theme);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connectSelect);
  else connectSelect();

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY || event.key === null) apply(savedTheme() || 'light');
  });
})();
