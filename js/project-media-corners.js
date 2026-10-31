/* Move legacy image padding outside the photo so its corners stay visible. */
(function() {
  if (!document.body.classList.contains('project-glass')) return;
  document.querySelectorAll('#project-details img, #project-details video').forEach(function(img) {
    var style = getComputedStyle(img);
    var padding = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
    if (!padding.some(function(value) {
      return parseFloat(value) > 0
    })) return;
    var frame = document.createElement('span');
    frame.className = 'project-image-spacing';
    frame.style.width = img.style.width || '100%';
    img.parentNode.insertBefore(frame, img);
    frame.appendChild(img);
    img.style.width = '100%';
    function sync() {
      var s = getComputedStyle(img);
      frame.style.padding = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].join(' ');
    }
    sync();
    img.classList.add('project-image-rounded');
    // Read the legacy responsive padding from an unmodified clone on resize.
    var timer;
    window.addEventListener('resize', function() {
      clearTimeout(timer);
      timer = setTimeout(function() {
        img.classList.remove('project-image-rounded');
        sync();
        img.classList.add('project-image-rounded');
      }, 120);
    });

  });

})();
