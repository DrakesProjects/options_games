/* Home page: fills each game card with the player's best rate and current
   Lab problem area, read from what the games saved in this browser. */
(() => {
  'use strict';

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value === null ? fallback : value;
    } catch {
      // Storage can be unavailable (private windows); cards still link to games.
      return fallback;
    }
  }

  function bestLine(gameId) {
    const saved = read(`options-games.stats.v1.${gameId}`, []);
    const rates = (Array.isArray(saved) ? saved : [])
      .map((entry) => entry?.answersPerMinute)
      .filter((rate) => Number.isFinite(rate) && rate > 0);
    if (!rates.length) return { text: 'No completed runs yet', empty: true };
    const runs = rates.length === 1 ? '1 run' : `${rates.length} runs`;
    return { text: `Best: ${Math.max(...rates).toFixed(1)} per min · ${runs}`, empty: false };
  }

  // Each Lab saves its current problem area whenever it changes.
  function weakLine(labs) {
    const parts = labs.split(',').map((item) => {
      const [id, tag] = item.split(':');
      const label = read(`options-games.lab-summary.v1.${id}`, {})?.problemArea;
      if (typeof label !== 'string' || !label) return null;
      return tag ? `${label} (${tag})` : label;
    }).filter(Boolean);
    return parts.length ? `Problem area: ${parts.join(' · ')}` : '';
  }

  function render() {
    for (const card of document.querySelectorAll('.hub-card')) {
      const best = bestLine(card.dataset.game);
      const bestNode = card.querySelector('[data-hub-best]');
      bestNode.textContent = best.text;
      bestNode.classList.toggle('hub-empty', best.empty);

      const weak = weakLine(card.dataset.labs || '');
      const weakNode = card.querySelector('[data-hub-weak]');
      weakNode.textContent = weak;
      weakNode.classList.toggle('hidden', !weak);
    }
  }

  // Another tab finishing a run updates this one.
  window.addEventListener('storage', render);
  render();
})();
