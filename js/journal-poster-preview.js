// Journal intro: while a destination link is hovered (or keyboard-focused),
// the national parks poster shows a photo from that trip (the first one,
// unless the link has a data-preview attribute; see previewFor below).
(function() {
  'use strict';
  var frame = document.querySelector('.field-poster-open');
  if (!frame) return;

  var preview = document.createElement('img');
  preview.className = 'field-poster-preview';
  preview.alt = '';
  preview.setAttribute('aria-hidden', 'true');
  preview.decoding = 'async';
  frame.appendChild(preview);

  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var active = null;
  var timer;

  // Which photo a link previews:
  //   data-preview="3"                    the trip's 3rd photo
  //   data-preview="assets/travel/…webp"  that exact image
  //   (no attribute)                      the trip's first photo
  // The photo is cropped to fill the frame, keeping its centre. To keep
  // another part, add data-preview-position (any CSS object-position value):
  //   data-preview-position="bottom"   or "top", "center 30%", …
  function previewFor(link) {
    var choice = link.dataset.preview;
    if (choice && !/^\d+$/.test(choice)) return choice;
    var target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return null;
    var photos = target.querySelectorAll('.nj-photo img');
    var image = photos[choice ? Number(choice) - 1 : 0] || photos[0];
    return image && image.getAttribute('src');
  }

  function show(link) {
    var src = previewFor(link);
    clearTimeout(timer);
    if (!src) return hide();
    active = link;
    // Sweeping across a row of links should not load every photo on the way.
    timer = setTimeout(function() {
      var probe = new Image();
      probe.onload = function() {
        if (active !== link) return;
        preview.src = src;
        preview.style.objectPosition = link.dataset.previewPosition || '';
        frame.classList.add('is-previewing');
      };
      probe.src = src;
    }, 60);
  }

  function hide() {
    clearTimeout(timer);
    active = null;
    frame.classList.remove('is-previewing');
  }

  document.querySelectorAll('.field-trip-nav a[href^="#"]').forEach(function(link) {
    link.addEventListener('mouseenter', function() {
      if (canHover.matches) show(link);
    });
    link.addEventListener('mouseleave', hide);
    link.addEventListener('focus', function() {
      if (link.matches(':focus-visible')) show(link);
    });
    link.addEventListener('blur', hide);
  });
})();
