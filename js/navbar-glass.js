(function() {
  'use strict';
  // Bent glass edges: each glass control gets an SVG displacement filter sized to
  // its own shape, applied through backdrop-filter. Only Chromium can displace
  // live backdrop pixels; other engines keep the plain frosted glass.
  var nav = document.querySelector('.navbar-glass');
  var ribbon = nav && nav.querySelector(':scope > .container');
  if (!window.ResizeObserver || !window.CSS ||
    !CSS.supports('backdrop-filter', 'url("#navbar-glass-refraction")') ||
    !/Chrome|Chromium|Edg\//.test(navigator.userAgent)) return;

  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.pointerEvents = 'none';
  var defs = document.createElementNS(ns, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);

  // Builds the displacement map for a rounded rectangle: pixels near the rounded
  // ends are pushed outward, strongest at the rim.
  function fieldImage(el, width, height) {
    var factor = Math.min(1, 1200 / width, 400 / height);
    var w = Math.max(1, Math.round(width * factor)), h = Math.max(1, Math.round(height * factor));
    var radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) * factor, w / 2, h / 2);
    var band = Math.min(20 * factor, radius);
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx || !radius || !band) return '';
    var pixels = ctx.createImageData(w, h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var dx = x - Math.max(radius, Math.min(w - radius, x));
      var dy = y - Math.max(radius, Math.min(h - radius, y));
      var length = Math.hypot(dx, dy), depth = radius - length;
      var strength = length && depth >= 0 && depth < band ? Math.pow(1 - depth / band, 2) * 115 : 0;
      var i = (y * w + x) * 4;
      pixels.data[i] = 128 + (length ? dx / length * strength : 0);
      pixels.data[i + 1] = 128 + (length ? dy / length * strength : 0);
      pixels.data[i + 2] = 128;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png');
  }

  // Watches one element and keeps its filter matched to its size. onReady runs
  // once the first map is in place, so the CSS switches over only when it works.
  function bend(el, id, onReady) {
    var filter = document.createElementNS(ns, 'filter');
    filter.id = id;
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', '1');
    filter.setAttribute('height', '1');
    filter.setAttribute('filterUnits', 'objectBoundingBox');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.innerHTML = '<feImage result="field" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="field" scale="18" xChannelSelector="R" yChannelSelector="G"/><feColorMatrix type="saturate" values="1.35"/>';
    defs.appendChild(filter);
    var image = filter.querySelector('feImage'), scheduled = 0, lastWidth = 0, lastHeight = 0, ready = false;
    function update() {
      scheduled = 0;
      var rect = el.getBoundingClientRect(), width = Math.round(rect.width), height = Math.round(rect.height);
      if (!width || !height || (lastWidth === width && lastHeight === height)) return;
      var href = fieldImage(el, width, height);
      if (!href) return;
      lastWidth = width;
      lastHeight = height;
      image.setAttribute('width', width);
      image.setAttribute('height', height);
      image.setAttribute('href', href);
      if (!ready) { ready = true; onReady(); }
    }
    new ResizeObserver(function() {
      if (!scheduled) scheduled = requestAnimationFrame(update);
    }).observe(el);
  }

  // The navigation ribbon (nav.css reads .ng-optical).
  if (ribbon) bend(ribbon, 'navbar-glass-refraction', function() { nav.classList.add('ng-optical'); });

  // Other glass controls, such as the journal's places button (journal.css reads
  // .glass-optical and the --glass-bend filter reference).
  document.querySelectorAll('.places-up, .places-button, .places-list').forEach(function(el, n) {
    var id = 'glass-bend-' + n;
    bend(el, id, function() {
      el.style.setProperty('--glass-bend', 'url("#' + id + '")');
      el.classList.add('glass-optical');
    });
  });
})();
