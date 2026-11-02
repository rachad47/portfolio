(function() {
  'use strict';
  var photos = Array.from(document.querySelectorAll('.nj-photo, .field-poster-open'));
  var dialog = document.querySelector('.nj-lightbox');
  var current = 0;
  var opener;
  function display(index) {
    current = (index + photos.length) % photos.length;
    var photo = photos[current];
    dialog.querySelector('img').src = photo.dataset.full;
    dialog.querySelector('img').alt = photo.querySelector('img').alt;
    dialog.querySelector('p').textContent = photo.dataset.caption;

  }
  photos.forEach(function(button, index) {
    button.addEventListener('mouseenter', function() {
      var bounds = button.getBoundingClientRect();
      var growth = bounds.width * .325;
      button.style.transformOrigin = bounds.left < growth + 15 ? 'left center' : bounds.right + growth > innerWidth - 15 ? 'right center' : 'center';

    });
    button.addEventListener('click', function() {
      opener = button;
      display(index);
      dialog.showModal();
    });

  });
  dialog.querySelector('.cj-close').addEventListener('click', function() {
    dialog.close();
  });
  dialog.querySelector('.cj-lightbox-prev').addEventListener('click', function() {
    display(current - 1);
  });
  dialog.querySelector('.cj-lightbox-next').addEventListener('click', function() {
    display(current + 1);
  });
  dialog.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      display(current - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      display(current + 1);
    }

  });
  dialog.addEventListener('close', function() {
    if (opener) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', function(event) {
    if (event.target === dialog) {
      var box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    }
  });



  // Justify only galleries that opt in. Width/height attributes preserve the
  // original image proportions without waiting for lazy images to download.
  document.querySelectorAll('.nj-justified').forEach(function(gallery) {
    var items = Array.from(gallery.querySelectorAll('.nj-photo'));
    if (!items.length) return;
    function layoutGallery() {
      var width = gallery.clientWidth;
      if (!width) return;
      var styles = getComputedStyle(gallery);
      var gap = parseFloat(styles.columnGap) || 12;
      var target = parseFloat(styles.getPropertyValue('--justified-row-height')) || 220;
      var ratios = items.map(function(item) {
        var image = item.querySelector('img');
        return Number(image.getAttribute('width')) / Number(image.getAttribute('height')) || 1;
      });
      var count = items.length;
      var cost = Array(count + 1).fill(Infinity);
      var breaks = Array(count).fill(count);
      cost[count] = 0;
      for (var start = count - 1; start >= 0; start--) {
        var sum = 0;
        for (var end = start; end < count; end++) {
          sum += ratios[end];
          var height = (width - gap * (end - start)) / sum;
          if (height <= 0) break;
          // Keep a short final row left-aligned instead of enlarging it.
          var rowHeight = end === count - 1 ? Math.min(height, target) : height;
          var score = Math.pow(rowHeight - target, 2) * (end - start + 1) + cost[end + 1];
          if (score < cost[start]) {
            cost[start] = score;
            breaks[start] = end + 1;
          }
        }
      }
      for (var first = 0; first < count;) {
        var last = breaks[first];
        var total = ratios.slice(first, last).reduce(function(a, b) { return a + b; }, 0);
        var row = (width - gap * (last - first - 1)) / total;
        if (last === count) row = Math.min(row, target);
        for (var i = first; i < last; i++) {
          // Floor to avoid subpixel rounding pushing the last photo to a new line.
          items[i].style.width = Math.floor(row * ratios[i] * 100) / 100 + 'px';
        }
        first = last;
      }
    }
    if ('ResizeObserver' in window) new ResizeObserver(layoutGallery).observe(gallery);
    else window.addEventListener('resize', layoutGallery);
    layoutGallery();
  });

})();
