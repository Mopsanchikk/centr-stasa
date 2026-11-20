// tema.js: перемикач день/ніч, вибір пам'ятається.
export function initTema() {
  const mark = () => document.querySelectorAll('[data-tema]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tema === document.documentElement.dataset.theme));
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tema]');
    if (!b) return;
    document.documentElement.dataset.theme = b.dataset.tema;
    try { localStorage.setItem('centr2-tema', b.dataset.tema); } catch (err) { /* приватний режим */ }
    mark();
  });
  mark();
}
