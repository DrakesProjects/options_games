/* Setup-screen tabs: Play (settings), Lab, and History (past results), so the
   three panels no longer stack in one long column. Loaded last, after the
   game and stats.js have added their panels. */
(() => {
  'use strict';

  const setupScreen = document.getElementById('setup-screen');
  if (!setupScreen) return;

  const sections = [
    { name: 'Play', panel: setupScreen.querySelector('.setup-box') },
    { name: 'Lab', panel: setupScreen.querySelector('.lab-panel') },
    { name: 'History', panel: setupScreen.querySelector('.stats-panel') },
  ].filter((section) => section.panel);
  if (sections.length < 2) return;

  const bar = document.createElement('div');
  bar.className = 'setup-tabs';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Game sections');

  function select(index, focus = false) {
    sections.forEach((section, position) => {
      const active = position === index;
      section.tab.setAttribute('aria-selected', active ? 'true' : 'false');
      section.tab.tabIndex = active ? 0 : -1;
      section.panel.classList.toggle('hidden', !active);
    });
    if (focus) sections[index].tab.focus();
  }

  sections.forEach((section, index) => {
    const key = section.name.toLowerCase();
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'setup-tab';
    tab.id = `setup-tab-${key}`;
    tab.textContent = section.name;
    tab.setAttribute('role', 'tab');
    if (!section.panel.id) section.panel.id = `setup-panel-${key}`;
    tab.setAttribute('aria-controls', section.panel.id);
    section.panel.setAttribute('role', 'tabpanel');
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      select((index + step + sections.length) % sections.length, true);
    });
    section.tab = tab;
    bar.append(tab);
  });

  setupScreen.prepend(bar);
  select(0);
})();
