/* Trip production layer demo — navigation only.
   No network, no storage, no persistence. Everything this file does is progressive
   enhancement: with the script absent, every section stays readable in document order,
   the rail links jump to them by id, and both change scenarios are shown. This file
   never writes markup; it only toggles the `hidden` attribute and aria-current. */
(() => {
  'use strict';

  const sections = Array.prototype.slice.call(document.querySelectorAll('[data-move]'));
  const navLinks = Array.prototype.slice.call(document.querySelectorAll('.moves a'));
  if (!sections.length || !navLinks.length) return;

  const known = new Set(sections.map(section => section.dataset.move));
  const first = sections[0].dataset.move;

  /* ---- one move at a time, addressed by hash so every move is linkable ----
     A hash that is not a move (the skip link's #main, say) is left alone: it belongs to
     something else on the page, and resetting to move one would throw the reader out. */
  let current = null;

  function showMove(moveFocus) {
    const requested = decodeURIComponent(location.hash.slice(1));
    let selected;
    if (known.has(requested)) selected = requested;
    else if (current) return;
    else selected = first;
    current = selected;

    for (const section of sections) section.hidden = section.dataset.move !== selected;
    for (const link of navLinks) {
      if (link.getAttribute('href') === '#' + selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    if (moveFocus) {
      const heading = document.querySelector('[data-move="' + selected + '"] h2');
      if (heading) heading.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  /* ---- the ask in move three selects which diff move four shows ---- */
  const scenarios = Array.prototype.slice.call(document.querySelectorAll('[data-scenario]'));
  const asks = Array.prototype.slice.call(document.querySelectorAll('input[name="ask"]'));

  function showScenario(value) {
    for (const scenario of scenarios) scenario.hidden = scenario.dataset.scenario !== value;
  }

  for (const ask of asks) {
    ask.addEventListener('change', () => { if (ask.checked) showScenario(ask.value); });
  }
  const checked = asks.find(ask => ask.checked) || asks[0];
  if (checked) showScenario(checked.value);

  window.addEventListener('hashchange', () => showMove(true));
  showMove(false);
})();
