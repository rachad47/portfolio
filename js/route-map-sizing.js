/* Size each road-trip route map (trips with class nj-trip--route-map) to its text.
   Desktop: the map is as tall as the whole trip intro.
   Phones: the map sits beside the title, lead and facts, as tall as that block
   (the route runs full width below), and its width follows the map's proportions.
   Tablets (576–767px): the map floats at a fixed size set in journal.css. */
(function () {
  'use strict';
  var desktop = window.matchMedia('(min-width: 768px)');
  var phone = window.matchMedia('(max-width: 575px)');
  document.querySelectorAll('.nj-trip--route-map > .nj-trip-intro').forEach(function (intro) {
    var header = intro.querySelector('header');
    var title = header.querySelector('h2');
    var facts = header.querySelector('.trip-facts') || title;
    var map = intro.querySelector('.nj-drive-map');
    var caption = map.querySelector('figcaption');
    var image = map.querySelector('img');
    var frame;

    function captionHeight() {
      var style = getComputedStyle(caption);
      return caption.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    }

    function setProperty(name, value) {
      var previous = parseFloat(intro.style.getPropertyValue(name));
      if (!Number.isFinite(previous) || Math.abs(previous - value) > 0.5) {
        intro.style.setProperty(name, value + 'px');
      }
    }

    function sizeMap() {
      frame = null;
      if (desktop.matches) {
        intro.style.removeProperty('--route-map-width');
        setProperty('--route-map-height', Math.max(1, header.getBoundingClientRect().height - captionHeight()));
        return;
      }
      if (!phone.matches) {
        // Tablets: the map floats at a fixed size (journal.css).
        intro.style.removeProperty('--route-map-width');
        intro.style.removeProperty('--route-map-height');
        return;
      }
      var block = facts.getBoundingClientRect().bottom - title.getBoundingClientRect().top;
      var ratio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 4 / 3;
      var height = Math.max(40, block - captionHeight());
      // Never take more than 45% of the row, so the title keeps room.
      var width = Math.min(height * ratio, intro.clientWidth * 0.45);
      setProperty('--route-map-width', width);
      setProperty('--route-map-height', height);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(sizeMap);
    }
    if ('ResizeObserver' in window) {
      var observer = new ResizeObserver(schedule);
      [intro, header, title, facts, caption].forEach(function (element) {
        observer.observe(element);
      });
    }
    window.addEventListener('resize', schedule);
    desktop.addEventListener('change', schedule);
    phone.addEventListener('change', schedule);
    image.addEventListener('load', schedule);
    if (document.fonts) document.fonts.ready.then(schedule);
    schedule();
  });
})();
