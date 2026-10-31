(function($) {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dark = true;
  // Start in navy until the visitor explicitly chooses a mode.
  try {
    dark = window.localStorage.getItem('portfolio-color-mode-v2') !== 'light';

  } catch (error) { /* Keep navy when browser storage is unavailable. */ }

  function setColorMode(enabled) {
    $('body').toggleClass('dark-mode', enabled);
    $('.color-mode-icon').toggleClass('active', enabled);
    $('.color-mode').attr('aria-pressed', String(enabled));

  }
  setColorMode(dark);
  $('.color-mode').on('click', function() {
    dark = !dark;
    setColorMode(dark);
    try {
      window.localStorage.setItem('portfolio-color-mode-v2', dark ? 'dark' : 'light');

    } catch (error) { /* The toggle still works when storage is unavailable. */ }

  });

  // Close the mobile menu after choosing a destination.
  $('.navbar-collapse .nav-link').on('click', function() {
    if (window.innerWidth < 576) $('.navbar-collapse').collapse('hide');

  });
  $('.navbar').headroom();
  $('.owl-carousel').owlCarousel({ items: 1, loop: false, rewind: true, margin: 10, nav: true });
  $('.social-links a').tooltip();

  $('.nav-link, .custom-btn-link').on('click', function(event) {
    var href = this.getAttribute('href');
    if (!href || href.charAt(0) !== '#' || href.length === 1) return;
    var target;
    try {
      target = document.getElementById(decodeURIComponent(href.slice(1)));
    }
    catch (error) {
      return;
    }
    if (!target) return;
    event.preventDefault();
    $('html, body').stop().animate({ scrollTop: $(target).offset().top - 49 }, reducedMotion.matches ? 0 : 600);

  });

  // Download large hover previews only when a visitor interacts with a card.
  $('.thumbnail, .ce-project').on('mouseenter focusin', function() {
    if (reducedMotion.matches) return;
    $(this).find('img[data-src]').each(function() {
      this.src = this.getAttribute('data-src');
      this.removeAttribute('data-src');

    });

  });

  var playButton = document.getElementById('play');
  var heartbeat = document.getElementById('heartbeat');
  if (playButton && heartbeat) {
    playButton.addEventListener('mouseenter', function() {
      if (reducedMotion.matches) return;
      var playback = heartbeat.play();
      if (playback && playback.catch) playback.catch(function() { /* Browsers may block hover audio. */ });

    });
    playButton.addEventListener('mouseleave', function() {
      heartbeat.pause();
      heartbeat.currentTime = 0;

    });

  }

})(jQuery);
