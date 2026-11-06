(function() {
  'use strict';
  var photos = Array.from(document.querySelectorAll('.nj-photo, .field-poster-open'));
  var dialog = document.querySelector('.nj-lightbox');
  var photoZoom = window.JournalPhotoZoom(dialog);
  var current = 0;
  var opener;
  function display(index) {
    current = (index + photos.length) % photos.length;
    var photo = photos[current];
    photoZoom.reset();
    dialog.querySelector('img').src = photo.dataset.full;
    dialog.querySelector('img').alt = photo.querySelector('img').alt;
    dialog.querySelector('p').textContent = photo.dataset.caption;

  }
  // A body-level preview escapes the scroll container's clipping boundary.
  var hoverPreview = document.createElement('img');
  hoverPreview.className = 'nj-hover-preview';
  hoverPreview.alt = '';
  hoverPreview.setAttribute('aria-hidden', 'true');
  hoverPreview.hidden = true;
  document.body.appendChild(hoverPreview);
  var hoverTimer;
  var hoverVersion = 0;
  var hoverAnimation;
  function hideHoverPreview() {
    hoverVersion++;
    clearTimeout(hoverTimer);
    if (hoverAnimation) hoverAnimation.cancel();
    hoverPreview.hidden = true;
  }
  function showHoverPreview(button) {
    if (!button.closest('.nj-photo-rail') || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (button.closest('.is-dragging')) return;
    hideHoverPreview();
    var version = hoverVersion;
    // Passing across a row should not trigger a preview for every image, so wait a moment.
    hoverTimer = setTimeout(async function() {
      var image = button.querySelector('img');
      try {
        if (image.decode) await image.decode();
        if (version !== hoverVersion || dialog.open) return;
        var source = image.currentSrc || image.src;
        if (hoverPreview.getAttribute('src') !== source) hoverPreview.src = source;
        if (hoverPreview.decode) await hoverPreview.decode();
      } catch (error) {
        return;
      }
      if (version !== hoverVersion || dialog.open) return;
      var box = image.getBoundingClientRect();
      var scale = Math.min(2, (innerWidth - 24) / box.width, (innerHeight - 24) / box.height);
      var width = box.width * scale;
      var height = box.height * scale;
      var left = Math.max(12, Math.min(innerWidth - width - 12, box.left + (box.width - width) / 2));
      var top = Math.max(12, Math.min(innerHeight - height - 12, box.top + (box.height - height) / 2));
      hoverPreview.style.width = width + 'px';
      hoverPreview.style.height = height + 'px';
      hoverPreview.style.left = left + 'px';
      hoverPreview.style.top = top + 'px';
      hoverPreview.hidden = false;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        hoverAnimation = hoverPreview.animate([
          { transform: 'translate(' + (box.left - left) + 'px, ' + (box.top - top) + 'px) scale(' + (1 / scale) + ')', opacity: .85 },
          { transform: 'translate(0, 0) scale(1)', opacity: 1 }
        ], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
      }
    }, 200);
  }
  window.addEventListener('scroll', hideHoverPreview, { capture: true, passive: true });
  window.addEventListener('resize', hideHoverPreview);
  window.addEventListener('blur', hideHoverPreview);
  photos.forEach(function(button, index) {
    button.addEventListener('mouseleave', hideHoverPreview);
    button.addEventListener('blur', hideHoverPreview);
    button.addEventListener('focus', function() { showHoverPreview(button); });
    button.addEventListener('mouseenter', function() {
      showHoverPreview(button);
      var bounds = button.getBoundingClientRect();
      var growth = bounds.width * .325;
      button.style.transformOrigin = bounds.left < growth + 15 ? 'left center' : bounds.right + growth > innerWidth - 15 ? 'right center' : 'center';

    });
    button.addEventListener('click', function() {
      hideHoverPreview();
      opener = button;
      display(index);
      dialog.showModal();
    });

  });
  function closePhoto() {
    dialog.close();
  }
  dialog.querySelector('.cj-close').addEventListener('click', closePhoto);
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
    photoZoom.clear();
    // Release the enlarged image reference instead of retaining it while hidden.
    dialog.querySelector('img').removeAttribute('src');
    dialog.querySelector('img').alt = '';
    dialog.querySelector('p').textContent = '';

    if (opener) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', function(event) {
    if (event.target === dialog) {
      var box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closePhoto();
    }
  });



  // Mouse: click and drag a horizontal rail to scroll it (photo rows and the
  // "More places" links). A real drag (over 5px) never opens a photo or follows
  // a link; touch screens keep their normal swipe.
  function enableDragScroll(rail) {
    var startX = 0;
    var startLeft = 0;
    var pressed = false;
    var dragging = false;
    rail.addEventListener('pointerdown', function(event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pressed = true;
      dragging = false;
      startX = event.clientX;
      startLeft = rail.scrollLeft;
    });
    window.addEventListener('pointermove', function(event) {
      if (!pressed) return;
      var moved = event.clientX - startX;
      if (!dragging && Math.abs(moved) > 5) {
        dragging = true;
        rail.classList.add('is-dragging');
        hideHoverPreview();
      }
      if (dragging) rail.scrollLeft = startLeft - moved;
    });
    window.addEventListener('pointerup', function() {
      if (!pressed) return;
      pressed = false;
      if (dragging) {
        // Let the click that follows this drag see the flag, then reset.
        setTimeout(function() {
          dragging = false;
          rail.classList.remove('is-dragging');
        }, 0);
      }
    });
    rail.addEventListener('click', function(event) {
      if (!dragging) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    rail.addEventListener('dragstart', function(event) { event.preventDefault(); });
  }

  // All photo galleries are native horizontal rails; original proportions stay intact.
  document.querySelectorAll('.nj-photos').forEach(function(gallery, index) {
    if (!gallery.querySelector('.nj-photo')) return;
    gallery.classList.add('nj-photo-rail');
    gallery.id = gallery.id || 'photo-rail-' + index;
    var section = gallery.closest('section');
    var heading = section && section.querySelector('h3, h2');
    var title = heading ? heading.textContent.trim() : 'Travel';
    gallery.setAttribute('aria-label', title + ' photographs');
    var controls = document.createElement('div');
    controls.className = 'nj-rail-controls';
    var buttons = [-1, 1].map(function(direction) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = direction < 0 ? '←' : '→';
      button.setAttribute('aria-label', (direction < 0 ? 'Previous' : 'Next') + ' ' + title + ' photographs');
      button.setAttribute('aria-controls', gallery.id);
      button.addEventListener('click', function() { step(direction); });
      controls.appendChild(button);
      return button;
    });

    // Arrows move by whole photos: forward to the first photo cut off on the
    // right, back by about a screen, always lining a photo up with the left edge.
    function photoStarts() {
      var rail = gallery.getBoundingClientRect();
      var inset = parseFloat(getComputedStyle(gallery).paddingLeft) || 0;
      return Array.from(gallery.querySelectorAll('.nj-photo')).map(function(photo) {
        var rect = photo.getBoundingClientRect();
        return { start: rect.left - rail.left + gallery.scrollLeft - inset, end: rect.right - rail.left + gallery.scrollLeft };
      });
    }
    function step(direction) {
      hideHoverPreview();
      var view = gallery.scrollLeft;
      var width = gallery.clientWidth;
      var starts = photoStarts();
      var target;
      if (direction > 0) {
        var next = starts.find(function(photo) { return photo.end > view + width + 2; });
        target = next ? next.start : gallery.scrollWidth;
      } else {
        var earlier = starts.filter(function(photo) { return photo.start < view - 2; });
        var back = earlier.find(function(photo) { return photo.start >= view - width - 2; });
        target = back ? back.start : earlier.length ? earlier[earlier.length - 1].start : 0;
      }
      gallery.scrollTo({
        left: Math.max(0, target),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }

    enableDragScroll(gallery);
    var galleryHeader = heading && heading.closest('header');
    if (galleryHeader) {
      galleryHeader.classList.add('nj-gallery-heading');
      // Headings with a one-line note get their own layout on phones (journal.css).
      if (galleryHeader.querySelector(':scope > p')) galleryHeader.classList.add('nj-gallery-heading--note');
      galleryHeader.appendChild(controls);
    } else {
      gallery.before(controls);
    }
    function updateArrows() {
      var overflowing = gallery.scrollWidth > gallery.clientWidth + 1;
      controls.hidden = !overflowing;
      // Scroll snapping parks the first photo a couple of pixels in, so allow a little slack.
      buttons[0].disabled = gallery.scrollLeft <= 4;
      buttons[1].disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 4;
      // Fade whichever edge has more photos beyond it (journal.css).
      gallery.classList.toggle('rail-fade--start', overflowing && !buttons[0].disabled);
      gallery.classList.toggle('rail-fade--end', overflowing && !buttons[1].disabled);
      gallery.classList.toggle('is-scrollable', overflowing);
    }
    gallery.addEventListener('scroll', updateArrows, { passive: true });
    gallery.querySelectorAll('img').forEach(function(image) {
      image.addEventListener('load', updateArrows);
    });
    if ('ResizeObserver' in window) new ResizeObserver(updateArrows).observe(gallery);
    else window.addEventListener('resize', updateArrows);
    updateArrows();
  });

  // The extra destination links have their own independent rail.
  var destinationRail = document.querySelector('.field-more-rail');
  if (destinationRail) {
    var previousDestinations = document.querySelector('.field-more-prev');
    var nextDestinations = document.querySelector('.field-more-next');
    function updateDestinationArrows() {
      previousDestinations.disabled = destinationRail.scrollLeft <= 1;
      nextDestinations.disabled = destinationRail.scrollLeft + destinationRail.clientWidth >= destinationRail.scrollWidth - 1;
      // Soft fades at whichever end has more places beyond it (journal.css).
      var overflowing = destinationRail.scrollWidth > destinationRail.clientWidth + 1;
      destinationRail.classList.toggle('rail-fade--start', overflowing && destinationRail.scrollLeft > 4);
      destinationRail.classList.toggle('rail-fade--end', overflowing && destinationRail.scrollLeft + destinationRail.clientWidth < destinationRail.scrollWidth - 4);
      destinationRail.classList.toggle('is-scrollable', overflowing);
    }
    enableDragScroll(destinationRail);
    function scrollDestinations(direction) {
      destinationRail.scrollBy({
        left: direction * destinationRail.clientWidth * .75,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }
    previousDestinations.addEventListener('click', function() { scrollDestinations(-1); });
    nextDestinations.addEventListener('click', function() { scrollDestinations(1); });
    destinationRail.addEventListener('scroll', updateDestinationArrows, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(updateDestinationArrows).observe(destinationRail);
    else window.addEventListener('resize', updateDestinationArrows);
    updateDestinationArrows();
  }

  // Phones: all destination links scroll sideways in two rows (journal.css);
  // fade whichever edge has more links beyond it.
  var destinations = document.querySelector('.field-trip-nav');
  if (destinations) {
    var updateDestinationFade = function() {
      var overflowing = destinations.scrollWidth > destinations.clientWidth + 1;
      destinations.classList.toggle('rail-fade--start', overflowing && destinations.scrollLeft > 4);
      destinations.classList.toggle('rail-fade--end', overflowing && destinations.scrollLeft + destinations.clientWidth < destinations.scrollWidth - 4);
    };
    destinations.addEventListener('scroll', updateDestinationFade, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(updateDestinationFade).observe(destinations);
    else window.addEventListener('resize', updateDestinationFade);
    updateDestinationFade();
  }

})();
