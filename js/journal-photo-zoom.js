(function () {
  'use strict';

  window.JournalPhotoZoom = function (dialog) {
    if (!window.matchMedia('(pointer: coarse)').matches && !navigator.maxTouchPoints) {
      return { reset: function () {}, clear: function () {} };
    }
    var image = dialog.querySelector('img');
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    if (!context) return { reset: function () {}, clear: function () {} };
    canvas.className = 'journal-photo-canvas';
    canvas.hidden = true;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-description', 'Pinch or double-tap to zoom. Drag to pan. Press 0 to reset.');
    image.after(canvas);

    var width = 0, height = 0, ratio = 1;
    var scale = 1, x = 0, y = 0, ready = false;
    var gesture = null, tap = null, lastTap = null;
    var frame = 0;
    var MAX_ZOOM = 6;

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function draw() {
      frame = 0;
      if (!ready || !dialog.open) return;
      x = clamp(x, -width * (scale - 1) / 2, width * (scale - 1) / 2);
      y = clamp(y, -height * (scale - 1) / 2, height * (scale - 1) / 2);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      // Only the visible source region is drawn into a fixed-size bitmap.
      var sourceWidth = image.naturalWidth / scale;
      var sourceHeight = image.naturalHeight / scale;
      var sourceX = (image.naturalWidth - sourceWidth) / 2 - x * image.naturalWidth / (width * scale);
      var sourceY = (image.naturalHeight - sourceHeight) / 2 - y * image.naturalHeight / (height * scale);
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
      canvas.setAttribute('aria-label', (image.alt || 'Travel photograph') + ', zoom ' + Math.round(scale * 100) + '%');
    }
    function redraw() { if (!frame) frame = requestAnimationFrame(draw); }

    function clear() {
      ready = false;
      scale = 1; x = 0; y = 0;
      gesture = null; tap = null; lastTap = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      canvas.hidden = true;
      canvas.width = canvas.height = 1;
      image.style.removeProperty('display');
      dialog.classList.remove('journal-photo-zoom');
    }
    function fit() {
      if (!dialog.open || !image.complete || !image.naturalWidth) return;
      canvas.hidden = true;
      image.style.removeProperty('display');
      var box = image.getBoundingClientRect();
      if (!box.width || !box.height) return;
      var viewport = window.visualViewport;
      var viewportWidth = viewport ? viewport.width : innerWidth;
      var viewportHeight = viewport ? viewport.height : innerHeight;
      var style = getComputedStyle(dialog);
      var horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2;
      var verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 2;
      var captionHeight = dialog.querySelector('p').getBoundingClientRect().height + 12;
      var availableWidth = Math.max(1, viewportWidth * .96 - horizontalPadding);
      var availableHeight = Math.max(1, viewportHeight * .96 - verticalPadding - captionHeight);
      var fitScale = Math.min(1, availableWidth / box.width, availableHeight / box.height);
      width = box.width * fitScale;
      height = box.height * fitScale;
      // A single bounded surface, independent of the photo's zoom factor.
      ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2000000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      scale = 1; x = 0; y = 0;
      ready = true;
      image.style.display = 'none';
      canvas.hidden = false;
      dialog.classList.add('journal-photo-zoom');
      draw();
    }
    image.addEventListener('load', fit);
    image.addEventListener('error', clear);

    function point(touch) {
      var box = canvas.getBoundingClientRect();
      return { x: touch.clientX - box.left - width / 2, y: touch.clientY - box.top - height / 2 };
    }
    function center(touches) {
      var a = point(touches[0]), b = point(touches[1]);
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
    }
    function begin(touches) {
      if (touches.length >= 2) {
        var middle = center(touches);
        gesture = { pinch: true, distance: middle.distance, scale: scale,
          anchorX: (middle.x - x) / scale, anchorY: (middle.y - y) / scale };
        tap = null;
      } else if (touches.length === 1) {
        var p = point(touches[0]);
        gesture = { pinch: false, startX: p.x, startY: p.y, x: x, y: y };
      }
    }
    function zoomAt(nextScale, p) {
      nextScale = clamp(nextScale, 1, MAX_ZOOM);
      x = p.x - (p.x - x) * nextScale / scale;
      y = p.y - (p.y - y) * nextScale / scale;
      scale = nextScale;
      redraw();
    }
    canvas.addEventListener('touchstart', function (event) {
      if (!ready) return;
      event.preventDefault();
      if (event.touches.length === 1) {
        var p = point(event.touches[0]);
        tap = { x: p.x, y: p.y, time: Date.now(), moved: false };
      }
      begin(event.touches);
    }, { passive: false });
    canvas.addEventListener('touchmove', function (event) {
      if (!ready) return;
      event.preventDefault();
      if (!gesture || gesture.pinch !== (event.touches.length >= 2)) begin(event.touches);
      if (!gesture) return;
      if (gesture.pinch) {
        var middle = center(event.touches);
        scale = clamp(gesture.scale * middle.distance / gesture.distance, 1, MAX_ZOOM);
        x = middle.x - gesture.anchorX * scale;
        y = middle.y - gesture.anchorY * scale;
      } else if (event.touches.length) {
        var p = point(event.touches[0]);
        x = gesture.x + p.x - gesture.startX;
        y = gesture.y + p.y - gesture.startY;
        if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > 6) tap.moved = true;
      }
      redraw();
    }, { passive: false });
    canvas.addEventListener('touchend', function (event) {
      if (!ready) return;
      if (event.cancelable) event.preventDefault();
      if (event.touches.length) { tap = null; begin(event.touches); return; }
      if (tap && !tap.moved && Date.now() - tap.time < 300) {
        if (lastTap && Date.now() - lastTap.time < 350 && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 30) {
          zoomAt(scale > 1 ? 1 : 2.5, tap);
          lastTap = null;
        } else lastTap = { x: tap.x, y: tap.y, time: Date.now() };
      }
      tap = null; gesture = null;
    }, { passive: false });
    canvas.addEventListener('touchcancel', function () { gesture = null; tap = null; lastTap = null; });
    canvas.addEventListener('wheel', function (event) {
      if (!ready) return;
      event.preventDefault();
      zoomAt(scale * Math.exp(-event.deltaY * .002), point(event));
    }, { passive: false });
    dialog.addEventListener('keydown', function (event) {
      if (!ready) return;
      if (event.key === '+' || event.key === '=') zoomAt(scale * 1.5, { x: 0, y: 0 });
      else if (event.key === '-') zoomAt(scale / 1.5, { x: 0, y: 0 });
      else if (event.key === '0') zoomAt(1, { x: 0, y: 0 });
      else return;
      event.preventDefault();
    });

    // Intercept browser page zoom only while this touch photo viewer is open.
    function preventPagePinch(event) {
      if (dialog.open && (event.type.indexOf('gesture') === 0 || event.touches.length > 1)) {
        if (event.cancelable) event.preventDefault();
      }
    }
    document.addEventListener('touchstart', preventPagePinch, { passive: false });
    document.addEventListener('touchmove', preventPagePinch, { passive: false });
    document.addEventListener('gesturestart', preventPagePinch, { passive: false });
    document.addEventListener('gesturechange', preventPagePinch, { passive: false });
    var resizeFrame = 0;
    function resize() {
      if (!dialog.open || !ready || resizeFrame) return;
      resizeFrame = requestAnimationFrame(function () { resizeFrame = 0; fit(); });
    }
    window.addEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    return { reset: clear, clear: clear };
  };
})();
