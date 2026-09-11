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
      document.querySelector(`[data-page="${selected}"] h2`).focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function selectView(group, value, focus = false) {
    for (const panel of document.querySelectorAll(`[data-${group}]`)) {
      panel.hidden = panel.dataset[group] !== value;
    }
    for (const button of document.querySelectorAll(`[data-select="${group}"]`)) {
      button.setAttribute('aria-pressed', String(button.dataset.value === value));
    }
    if (focus && group === 'material') {
      document.querySelector(`#${value}-preview-title`).focus({ preventScroll: true });
    }
  }
  for (const button of document.querySelectorAll('[data-select]')) {
    button.addEventListener('click', () => selectView(button.dataset.select, button.dataset.value, true));
  }
  for (const link of document.querySelectorAll('[data-preview]')) {
    link.addEventListener('click', () => selectView('material', link.dataset.preview));
  }
  selectView('opportunity', 'schools');
  selectView('material', 'director');

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
