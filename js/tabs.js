/* Homepage project tabs: switching, arrow keys, previous/next and deep links.
   The tabs and panels are written in index.html; this only changes which one is shown. */
(function () {
  'use strict';
  var section = document.getElementById('project');
  if (!section) return;
  var tabList = section.querySelector('.tp-tabs');
  var buttons = Array.prototype.slice.call(section.querySelectorAll('.tp-tab'));
  var panels = buttons.map(function (button) { return document.getElementById(button.getAttribute('aria-controls')); });
  var status = section.querySelector('.tp-status');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = Math.max(0, buttons.findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; }));

  function select(index, scroll) {
    current = index;
    panels.forEach(function (panel, i) {
      var active = i === index;
      panel.hidden = !active;
      panel.inert = !active;
      buttons[i].setAttribute('aria-selected', String(active));
      buttons[i].tabIndex = active ? 0 : -1;
      if (!active) panel.querySelectorAll('audio, video').forEach(function (media) { media.pause(); });
    });
    status.textContent = (index + 1) + ' / ' + buttons.length + ' projects · ' + buttons[index].textContent;
    if (scroll) tabList.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  }

  buttons.forEach(function (button, index) {
    button.addEventListener('click', function () { select(index); });
    button.addEventListener('keydown', function (event) {
      var last = buttons.length - 1, target;
      if (event.key === 'ArrowRight') target = index === last ? 0 : index + 1;
      if (event.key === 'ArrowLeft') target = index === 0 ? last : index - 1;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = last;
      if (target === undefined) return;
      event.preventDefault();
      buttons[target].focus();
      select(target);
    });
  });
  section.querySelector('.tp-prev').addEventListener('click', function () { select((current + buttons.length - 1) % buttons.length, true); });
  section.querySelector('.tp-next').addEventListener('click', function () { select((current + 1) % buttons.length, true); });

  function panelContaining(id) {
    var target = id && document.getElementById(id);
    return target ? panels.findIndex(function (panel) { return panel.contains(target); }) : -1;
  }
  function decodeHash(hash) { try { return decodeURIComponent(hash.slice(1)); } catch (e) { return ''; } }

  // Links to something inside a hidden tab (e.g. #orbit-design-team) open that tab first.
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var id = decodeHash(link.getAttribute('href'));
    var index = panelContaining(id);
    if (index < 0) return;
    event.preventDefault();
    select(index);
    if (location.hash !== link.getAttribute('href')) history.pushState(null, '', link.getAttribute('href'));
    requestAnimationFrame(function () {
      var navbar = document.querySelector('.navbar');
      var offset = navbar ? navbar.getBoundingClientRect().height + 24 : 24;
      var top = document.getElementById(id).getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
  });

  function openHash() { var index = panelContaining(decodeHash(location.hash)); if (index >= 0) select(index); }
  openHash();
  window.addEventListener('hashchange', openHash);
})();
