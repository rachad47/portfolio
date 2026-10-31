(function() {
  'use strict';
  var groups = JSON.parse(document.getElementById('cj-data').textContent), dialog = document.querySelector('.cj-lightbox'), activeGroup = 0, index = 0;
  function update() {
    var g = groups[activeGroup], p = g.photos[index], img = dialog.querySelector('img');
    img.src = 'assets/site/postcards/photo-' + p.id + '.webp';
    img.alt = g.title + ' — photograph ' + (index + 1);
    dialog.querySelector('p').textContent = g.title + ' · ' + (index + 1) + ' / ' + g.photos.length;
    dialog.querySelector('.cj-lightbox-prev').hidden = g.photos.length < 2;
    dialog.querySelector('.cj-lightbox-next').hidden = g.photos.length < 2;
  }
  function move(delta) {
    index = (index + delta + groups[activeGroup].photos.length) % groups[activeGroup].photos.length;
    update();
  }
  document.querySelectorAll('.cj-chapter').forEach(function(chapter, gi) {
    chapter.querySelectorAll('.cj-photo').forEach(function(button) {
      button.addEventListener('click', function() {
        activeGroup = gi;
        index = Number(button.dataset.photo);
        update();
        dialog.showModal();
      });
    });
  });
  dialog.querySelector('.cj-close').addEventListener('click', function() {
    dialog.close();
  });
  dialog.querySelector('.cj-lightbox-prev').addEventListener('click', function() {
    move(-1);
  });
  dialog.querySelector('.cj-lightbox-next').addEventListener('click', function() {
    move(1);
  });
  dialog.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    }
  });
  document.getElementById('cj-trip-select').addEventListener('change', function() {
    var target = document.getElementById(this.value);
    if (target) target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
})();
