/* Navigation ribbon: mobile menu, hide-on-scroll, smooth in-page links.
   Replaces jQuery + Bootstrap's collapse plugin + headroom.js with the same classes,
   so the CSS is unchanged: .collapse/.collapsing/.show on the menu and
   .headroom--pinned/--unpinned/--top/--not-top/--bottom/--not-bottom on the bar. */
(function () {
  'use strict';
  var nav = document.querySelector('.navbar');
  if (!nav) return;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Mobile menu ----------
  var toggler = nav.querySelector('.navbar-toggler');
  var menu = toggler && document.getElementById(toggler.getAttribute('aria-controls'));
  var animating = false;

  function transitionMs(el) {
    var cs = getComputedStyle(el);
    return (parseFloat(cs.transitionDuration) + parseFloat(cs.transitionDelay)) * 1000 || 0;
  }
  function afterTransition(el, done) {
    var finished = false;
    var finish = function () { if (finished) return; finished = true; el.removeEventListener('transitionend', finish); done(); };
    el.addEventListener('transitionend', finish);
    setTimeout(finish, transitionMs(el) + 5);
  }
  function setMenu(open) {
    if (!menu || animating || open === menu.classList.contains('show')) return;
    animating = true;
    toggler.classList.toggle('collapsed', !open);
    toggler.setAttribute('aria-expanded', String(open));
    if (open) {
      menu.classList.remove('collapse');
      menu.classList.add('collapsing');
      menu.style.height = '0px';
      afterTransition(menu, function () {
        menu.classList.remove('collapsing');
        menu.classList.add('collapse', 'show');
        menu.style.height = '';
        animating = false;
      });
      menu.style.height = menu.scrollHeight + 'px';
    } else {
      menu.style.height = menu.getBoundingClientRect().height + 'px';
      void menu.offsetHeight; // reflow so the height animates from its current value
      menu.classList.add('collapsing');
      menu.classList.remove('collapse', 'show');
      afterTransition(menu, function () {
        menu.classList.remove('collapsing');
        menu.classList.add('collapse');
        animating = false;
      });
      menu.style.height = '';
    }
  }
  if (toggler && menu) {
    toggler.addEventListener('click', function () { setMenu(!menu.classList.contains('show')); });
    // Close the phone menu after choosing a destination.
    menu.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () { if (window.innerWidth < 576) setMenu(false); });
    });
  }

  // ---------- Hide after deliberate scrolling; ignore Safari rubber-band bounce ----------
  var classes = nav.classList, lastY = 0, ticking = false;
  var direction = 0, travel = 0;
  function swap(add, remove) { classes.add(add); classes.remove(remove); }
  function docHeight() {
    var b = document.body, h = document.documentElement;
    return Math.max(b.scrollHeight, h.scrollHeight, b.offsetHeight, h.offsetHeight, b.clientHeight, h.clientHeight);
  }
  function update() {
    ticking = false;
    var y = window.pageYOffset;
    var view = document.documentElement.clientHeight || window.innerHeight;
    var maxY = Math.max(0, docHeight() - view);
    // Do not feed elastic overscroll into the direction tracker.
    if (y < 0 || y > maxY) return;
    swap(y <= 0 ? 'headroom--top' : 'headroom--not-top', y <= 0 ? 'headroom--not-top' : 'headroom--top');
    swap(y >= maxY ? 'headroom--bottom' : 'headroom--not-bottom', y >= maxY ? 'headroom--not-bottom' : 'headroom--bottom');
    var delta = y - lastY;
    lastY = y;
    if (y <= nav.offsetHeight + 24 || nav.contains(document.activeElement) ||
        (menu && (menu.classList.contains('show') || menu.classList.contains('collapsing')))) {
      swap('headroom--pinned', 'headroom--unpinned');
      direction = 0;
      travel = 0;
      return;
    }
    if (!delta) return;
    var nextDirection = delta > 0 ? 1 : -1;
    if (nextDirection !== direction) { direction = nextDirection; travel = 0; }
    travel += Math.abs(delta);
    if (travel >= (direction > 0 ? 12 : 6)) {
      swap(direction > 0 ? 'headroom--unpinned' : 'headroom--pinned',
           direction > 0 ? 'headroom--pinned' : 'headroom--unpinned');
      travel = 0;
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  classes.add('headroom', 'headroom--pinned');
  nav.addEventListener('focusin', function () { swap('headroom--pinned', 'headroom--unpinned'); });
  setTimeout(function () {
    lastY = Math.max(0, Math.min(window.pageYOffset, docHeight() - document.documentElement.clientHeight));
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }, 100);

  // ---------- Smooth scrolling for in-page navigation links ----------
  document.querySelectorAll('.nav-link, .custom-btn-link').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#' || href.length === 1) return;
      var target;
      try { target = document.getElementById(decodeURIComponent(href.slice(1))); } catch (e) { return; }
      if (!target) return;
      event.preventDefault();
      scrollToY(target.getBoundingClientRect().top + window.pageYOffset - 49, reducedMotion.matches ? 0 : 600);
    });
  });

  // Fixed-duration scroll with jQuery's "swing" easing (the feel the site always had).
  var scrollFrame;
  function scrollToY(y, duration) {
    cancelAnimationFrame(scrollFrame);
    var start = window.pageYOffset, distance = y - start, t0 = performance.now();
    if (!duration) { window.scrollTo(0, y); return; }
    (function step(now) {
      var p = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, start + distance * (0.5 - Math.cos(p * Math.PI) / 2));
      if (p < 1) scrollFrame = requestAnimationFrame(step);
    })(t0);
  }
})();
