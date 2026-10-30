(function () {
  'use strict';
  var nav = document.querySelector('.navbar-glass');
  var ribbon = nav && nav.querySelector(':scope > .container');
  // Chromium supports SVG displacement of live backdrop pixels. Other engines
  // use the same fixed ribbon with the translucent tint and glass rim.
  if (!ribbon || !window.ResizeObserver || !window.CSS ||
      !CSS.supports('backdrop-filter', 'url("#navbar-glass-refraction")') ||
      !/Chrome|Chromium|Edg\//.test(navigator.userAgent)) return;
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true'); svg.style.position = 'absolute'; svg.style.pointerEvents = 'none';
  svg.innerHTML = '<defs><filter id="navbar-glass-refraction" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feImage result="field" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="field" scale="18" xChannelSelector="R" yChannelSelector="G"/><feColorMatrix type="saturate" values="1.35"/></filter></defs>';
  document.body.appendChild(svg);
  var field = svg.querySelector('feImage'), scheduled = 0, lastWidth = 0, lastHeight = 0;
  function update() {
    scheduled = 0;
    var rect = ribbon.getBoundingClientRect(), width = Math.round(rect.width), height = Math.round(rect.height);
    if (!width || !height || (lastWidth === width && lastHeight === height)) return;
    lastWidth = width; lastHeight = height;
    var factor = Math.min(1, 1200 / width, 400 / height);
    var w = Math.max(1, Math.round(width * factor)), h = Math.max(1, Math.round(height * factor));
    var canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d'); if (!ctx) return;
    var pixels = ctx.createImageData(w, h), radius = Math.min(parseFloat(getComputedStyle(ribbon).borderTopLeftRadius) * factor, h / 2), band = Math.min(20 * factor, radius);
    if (!radius || !band) return;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var dx = x - Math.max(radius, Math.min(w - radius, x));
      var dy = y - Math.max(radius, Math.min(h - radius, y));
      var length = Math.hypot(dx, dy), depth = radius - length;
      var strength = length && depth >= 0 && depth < band ? Math.pow(1 - depth / band, 2) * 115 : 0;
      var i = (y * w + x) * 4;
      pixels.data[i] = 128 + (length ? dx / length * strength : 0);
      pixels.data[i + 1] = 128 + (length ? dy / length * strength : 0);
      pixels.data[i + 2] = 128; pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    field.setAttribute('width', width); field.setAttribute('height', height);
    field.setAttribute('href', canvas.toDataURL('image/png'));
    nav.classList.add('ng-optical');
  }
  new ResizeObserver(function () { if (!scheduled) scheduled = requestAnimationFrame(update); }).observe(ribbon);
})();
