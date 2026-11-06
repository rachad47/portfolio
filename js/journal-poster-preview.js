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

// Balance phone destinations by their rendered widths; restore desktop groups on resize.
(function () {
  'use strict';
  var nav = document.querySelector('.field-trip-nav');
  var first = nav && nav.querySelector('.field-featured-links');
  var second = nav && nav.querySelector('.field-more-rail');
  if (!first || !second) return;
  var entries = Array.from(nav.querySelectorAll('a[href^="#"]')).map(function (link) {
    var marker = document.createComment('Destination desktop position');
    link.before(marker);
    return { link: link, marker: marker };
  });
  var phone = window.matchMedia('(max-width: 575px)');
  var scheduled = false;
  function update() {
    scheduled = false;
    entries.forEach(function (entry) { entry.marker.after(entry.link); });
    if (!phone.matches) return;
    var links = entries.map(function (entry) { return entry.link; }).filter(function (link) {
      return getComputedStyle(link).display !== 'none';
    });
    var yosemite = links.findIndex(function (link) { return link.title === '🏔️ Yosemite National Park'; });
    var sequoia = links.findIndex(function (link) { return link.title === '🌲 Sequoia National Park'; });
    if (yosemite >= 0 && sequoia >= 0) {
      var temp = links[yosemite]; links[yosemite] = links[sequoia]; links[sequoia] = temp;
    }
    // Keep the requested opening destinations fixed, then balance the rest.
    var starts = [
      ['#grand-canyon-vegas-grand-canyon', '#hawaii-volcanoes-national-park'],
      ['#trip-banff-national-park', '#morocco-desert', '#selected-trip-18']
    ];
    var rows = [[], []], lengths = [0, 0];
    function add(link, row) {
      if (rows[row].length) lengths[row] += 8;
      lengths[row] += link.getBoundingClientRect().width;
      rows[row].push(link);
    }
    starts.forEach(function (hashes, row) {
      hashes.forEach(function (hash) {
        var link = links.find(function (item) { return item.hash === hash; });
        if (link) add(link, row);
      });
    });
    links.forEach(function (link) {
      if (rows[0].includes(link) || rows[1].includes(link)) return;
      add(link, lengths[0] <= lengths[1] ? 0 : 1);
    });
    rows.forEach(function (row, index) {
      row.forEach(function (link) { (index === 0 ? first : second).appendChild(link); });
    });
    nav.dispatchEvent(new Event('scroll'));
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }
  phone.addEventListener('change', schedule);
  window.addEventListener('resize', schedule, { passive: true });
  if (document.fonts) document.fonts.ready.then(schedule);
  update();
})();
