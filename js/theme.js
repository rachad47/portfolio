/* Colour mode: the theme lives on <html data-theme>. A one-line script in each page's
   <head> applies the saved choice before first paint; this handles the toggle. */
(function () {
  'use strict';
  var root = document.documentElement;
  var buttons = document.querySelectorAll('.color-mode');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dark = root.getAttribute('data-theme') === 'dark';
  var transition;

  function apply(isDark) {
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(isDark)); });
  }
  apply(dark);

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      dark = !dark;
      var next = dark;
      if (transition) transition.skipTransition();
      if (document.startViewTransition && !reducedMotion.matches) {
        transition = document.startViewTransition(function () { apply(next); });
        transition.ready.catch(function () { /* rapid toggles may skip a fade */ });
        transition.finished.catch(function () {});
      } else {
        apply(next);
      }
      try { localStorage.setItem('portfolio-color-mode-v2', dark ? 'dark' : 'light'); } catch (e) { /* storage unavailable */ }
    });
  });
})();
