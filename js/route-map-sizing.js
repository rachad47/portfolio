(function () {
  'use strict';
  var desktop = window.matchMedia('(min-width: 768px)');
  document.querySelectorAll('#selected-trip-6 > .nj-trip-intro, #selected-trip-13 > .nj-trip-intro, #selected-trip-17 > .nj-trip-intro').forEach(function (intro) {
    var header = intro.querySelector('header');
    var map = intro.querySelector('.nj-drive-map');
    var caption = map.querySelector('figcaption');
    var image = map.querySelector('img');
    var frame;
    function sizeMap() {
      frame = null;
      if (!desktop.matches) {
        intro.style.removeProperty('--route-map-height');
        return;
      }
      var captionStyle = getComputedStyle(caption);
      var captionHeight = caption.getBoundingClientRect().height + parseFloat(captionStyle.marginTop) + parseFloat(captionStyle.marginBottom);
      var height = Math.max(1, header.getBoundingClientRect().height - captionHeight);
      var previous = parseFloat(intro.style.getPropertyValue('--route-map-height'));
      if (!Number.isFinite(previous) || Math.abs(previous - height) > 0.5) {
        intro.style.setProperty('--route-map-height', height + 'px');
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(sizeMap);
    }
    if ('ResizeObserver' in window) {
      var observer = new ResizeObserver(schedule);
      observer.observe(header);
      observer.observe(caption);
    }
    window.addEventListener('resize', schedule);
    desktop.addEventListener('change', schedule);
    image.addEventListener('load', schedule);
    if (document.fonts) document.fonts.ready.then(schedule);
    schedule();
  });
})();