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
    dialog.classList.add('journal-touch-viewer');
    canvas.className = 'journal-photo-canvas';
    canvas.hidden = true;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-description', 'Pinch or double-tap to zoom. Drag to pan. Swipe to change photo. Tap to show or hide the controls. Press 0 to reset.');
    image.after(canvas);

    var width = 0, height = 0, ratio = 1, photoWidth = 0, photoHeight = 0;
    var scale = 1, x = 0, y = 0, ready = false;
    var gesture = null, tap = null, lastTap = null, tapTimer = 0;
    var frame = 0;
    var MAX_ZOOM = 6;

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function draw() {
      frame = 0;
      if (!ready || !dialog.open) return;
      var drawnWidth = photoWidth * scale, drawnHeight = photoHeight * scale;
      x = clamp(x, -Math.max(0, drawnWidth - width) / 2, Math.max(0, drawnWidth - width) / 2);
      y = clamp(y, -Math.max(0, drawnHeight - height) / 2, Math.max(0, drawnHeight - height) / 2);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'medium';
      // Clip the photo to the screen, not to its original fitted rectangle.
      var left = (width - drawnWidth) / 2 + x;
      var top = (height - drawnHeight) / 2 + y;
      var visibleLeft = Math.max(0, left), visibleTop = Math.max(0, top);
      var visibleWidth = Math.min(width, left + drawnWidth) - visibleLeft;
      var visibleHeight = Math.min(height, top + drawnHeight) - visibleTop;
      context.drawImage(image,
        (visibleLeft - left) * image.naturalWidth / drawnWidth,
        (visibleTop - top) * image.naturalHeight / drawnHeight,
        visibleWidth * image.naturalWidth / drawnWidth,
        visibleHeight * image.naturalHeight / drawnHeight,
        visibleLeft, visibleTop, visibleWidth, visibleHeight);
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
      var viewport = window.visualViewport;
      var pageScale = viewport ? viewport.scale : 1;
      var nextWidth = Math.round(viewport ? viewport.width * pageScale : innerWidth);
      var nextHeight = Math.max(1, Math.round(viewport ? viewport.height * pageScale : innerHeight));
      if (ready && width === nextWidth && height === nextHeight) return;
      var oldWidth = width, oldHeight = height;
      width = nextWidth;
      height = nextHeight;
      var fitScale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      photoWidth = image.naturalWidth * fitScale;
      photoHeight = image.naturalHeight * fitScale;
      if (ready) {
        x *= width / oldWidth;
        y *= height / oldHeight;
      } else { scale = 1; x = 0; y = 0; }
      // A single bounded surface, independent of the photo's zoom factor.
      ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2000000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
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
      return { x: (touch.clientX - box.left) * width / box.width - width / 2,
        y: (touch.clientY - box.top) * height / box.height - height / 2 };
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
    // Swipe sideways (not zoomed in) to change photo, using the dialog's own arrow buttons.
    function swipe(event) {
      if (!gesture || gesture.pinch || scale > 1 || !event.changedTouches.length) return;
      var end = point(event.changedTouches[0]);
      var dx = end.x - gesture.startX, dy = end.y - gesture.startY;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      var button = dialog.querySelector(dx < 0 ? '.cj-lightbox-next' : '.cj-lightbox-prev');
      if (button) button.click();
    }
    canvas.addEventListener('touchend', function (event) {
      if (!ready) return;
      if (event.cancelable) event.preventDefault();
      if (event.touches.length) { tap = null; begin(event.touches); return; }
      if (tap && !tap.moved && Date.now() - tap.time < 300) {
        clearTimeout(tapTimer);
        if (lastTap && Date.now() - lastTap.time < 350 && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 30) {
          zoomAt(scale > 1 ? 1 : 2.5, tap);
          lastTap = null;
        } else {
          lastTap = { x: tap.x, y: tap.y, time: Date.now() };
          // A single tap (no second tap follows) shows or hides the × and caption.
          tapTimer = setTimeout(function () {
            lastTap = null;
            dialog.classList.toggle('journal-ui-hidden');
          }, 350);
        }
      } else swipe(event);
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
    // Keep document-level non-passive handlers off the normal scrolling page.
    var pinchEvents = ['touchstart', 'touchmove', 'gesturestart', 'gesturechange'];
    function syncPinchHandlers() {
      if (dialog.open) updateViewport();
      else { clearTimeout(tapTimer); dialog.classList.remove('journal-ui-hidden'); }
      pinchEvents.forEach(function (type) {
        document.removeEventListener(type, preventPagePinch);
        if (dialog.open) document.addEventListener(type, preventPagePinch, { passive: false });
      });
    }
    new MutationObserver(syncPinchHandlers).observe(dialog, { attributes: true, attributeFilter: ['open'] });
    var resizeFrame = 0;
    function updateViewport() {
      if (!dialog.open) return;
      var viewport = window.visualViewport;
      var pageScale = viewport ? viewport.scale : 1;
      // Position in layout coordinates, then cancel the inherited page magnification.
      // This keeps the controls screen-sized without resetting the user's page zoom.
      dialog.style.setProperty('--photo-viewport-left', (viewport ? viewport.offsetLeft : 0) + 'px');
      dialog.style.setProperty('--photo-viewport-top', (viewport ? viewport.offsetTop : 0) + 'px');
      dialog.style.setProperty('--photo-viewport-width', (viewport ? viewport.width * pageScale : innerWidth) + 'px');
      dialog.style.setProperty('--photo-viewport-height', (viewport ? viewport.height * pageScale : innerHeight) + 'px');
      dialog.style.setProperty('--photo-page-inverse', 1 / pageScale);
      fit();
    }
    function resize() {
      if (!dialog.open || resizeFrame) return;
      resizeFrame = requestAnimationFrame(function () { resizeFrame = 0; updateViewport(); });
    }
    window.addEventListener('resize', resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resize);
      window.visualViewport.addEventListener('scroll', resize, { passive: true });
    }
    return { reset: clear, clear: clear };
  };
})();
