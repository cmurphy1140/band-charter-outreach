/* Navigation and fictional examples only: no network calls or saved activity. */
(() => {
  const pages = [...document.querySelectorAll('[data-page]')];
  const links = [...document.querySelectorAll('.steps a')];
  const knownPages = new Set(pages.map(page => page.dataset.page));

  function showPage(moveFocus = false) {
    const requested = location.hash.slice(1);
    const selected = knownPages.has(requested) ? requested : 'research';
    for (const page of pages) page.hidden = page.dataset.page !== selected;
    for (const link of links) {
      if (link.hash === `#${selected}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    if (moveFocus) {
      document.querySelector(`[data-page="${selected}"] h1`).focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function showSituation(value) {
    for (const panel of document.querySelectorAll('[data-situation]')) {
      panel.hidden = panel.dataset.situation !== value;
    }
  }

  for (const radio of document.querySelectorAll('[name="situation"]')) {
    radio.addEventListener('change', () => showSituation(radio.value));
  }
  document.querySelector('#reset-scenario').addEventListener('click', () => {
    const first = document.querySelector('[name="situation"]');
    first.checked = true;
    showSituation(first.value);
  });
  window.addEventListener('hashchange', () => showPage(true));
  showPage();
})();
