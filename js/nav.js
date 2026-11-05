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

  // ---------- Hide on scroll down, show on scroll up (headroom.js 0.9.4 behaviour) ----------
  var classes = nav.classList, lastY = 0, ticking = false;
  function swap(add, remove) { if (!classes.contains(add)) { classes.add(add); classes.remove(remove); } }
  function docHeight() {
    var b = document.body, h = document.documentElement;
    return Math.max(b.scrollHeight, h.scrollHeight, b.offsetHeight, h.offsetHeight, b.clientHeight, h.clientHeight);
  }
  function update() {
    ticking = false;
    var y = window.pageYOffset, view = window.innerHeight || document.documentElement.clientHeight, height = docHeight();
    if (y < 0 || y + view > height) { lastY = y; return; } // ignore overscroll bounce
    if (y <= 0) swap('headroom--top', 'headroom--not-top'); else swap('headroom--not-top', 'headroom--top');
    if (y + view >= height) swap('headroom--bottom', 'headroom--not-bottom'); else swap('headroom--not-bottom', 'headroom--bottom');
    if (y > lastY && y >= 0) {
      if (classes.contains('headroom--pinned') || !classes.contains('headroom--unpinned')) { classes.add('headroom--unpinned'); classes.remove('headroom--pinned'); }
    } else if ((y < lastY) || y <= 0) {
      if (classes.contains('headroom--unpinned')) { classes.remove('headroom--unpinned'); classes.add('headroom--pinned'); }
    }
    lastY = y;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  classes.add('headroom');
  setTimeout(function () {
    lastY = window.pageYOffset;
    window.addEventListener('scroll', onScroll, false);
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
