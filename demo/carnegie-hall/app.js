/* Navigation and fictional examples only: no network calls or saved activity. */
(() => {
  const pages = [...document.querySelectorAll('[data-page]')];
  const links = [...document.querySelectorAll('.steps a')];
  const knownPages = new Set(pages.map(page => page.dataset.page));

  // Move the existing nodes, not copies: content, links and disclosure state survive.
  function arrangeSupportingContent() {
    const research = document.querySelector('[data-support="research"]');
    const materials = document.querySelector('[data-support="material"]');
    if (!research || !materials) return;
    research.append(document.querySelector('.research-overview'));
    for (const kind of ['schools', 'operators']) {
      const group = document.createElement('div');
      group.dataset.opportunity = kind;
      const selectors = kind === 'schools' ? ['.contact', '#sources'] : ['#mtc-example details'];
      for (const selector of selectors) group.append(document.querySelector(selector));
      research.append(group);
    }
    const directorDownloads = document.querySelector('#director-preview .download-links');
    directorDownloads.dataset.material = 'director';
    materials.append(directorDownloads, document.querySelector('.download-links[data-material="faq"]'));
    document.querySelector('[data-support="follow-up"]').append(
      document.querySelector('.scenario-heading a[download]')
    );
  }
  arrangeSupportingContent();

  function addOptionalDetail(node, label) {
    const details = document.createElement('details');
    details.className = 'optional-detail';
    const summary = document.createElement('summary');
    summary.textContent = label;
    node.before(details);
    details.append(summary, node);
  }
  // Leave a natural pause after the primary example. No content is discarded.
  addOptionalDetail(document.querySelector('.comparison'), 'Explore the contrasting Salem example');
  for (const workflow of document.querySelectorAll('.workflow')) {
    addOptionalDetail(workflow, 'Walk through the five planning states');
  }

  function showPage(moveFocus = false) {
    const requested = location.hash.slice(1);
    const selected = knownPages.has(requested) ? requested : 'research';
    for (const page of pages) page.hidden = page.dataset.page !== selected;
    for (const panel of document.querySelectorAll('[data-support]')) {
      panel.hidden = panel.dataset.support !== selected;
    }
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
