(function () {
  'use strict';
  var photos = Array.from(document.querySelectorAll('.nj-photo'));
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
  photos.forEach(function (button, index) {
    button.addEventListener('mouseenter', function () {
      var bounds = button.getBoundingClientRect();
      var growth = bounds.width * .325;
      button.style.transformOrigin = bounds.left < growth + 15 ? 'left center' : bounds.right + growth > innerWidth - 15 ? 'right center' : 'center';
    });
    button.addEventListener('click', function () { opener = button; display(index); dialog.showModal(); });
  });
  dialog.querySelector('.cj-close').addEventListener('click', function () { dialog.close(); });
  dialog.querySelector('.cj-lightbox-prev').addEventListener('click', function () { display(current - 1); });
  dialog.querySelector('.cj-lightbox-next').addEventListener('click', function () { display(current + 1); });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); display(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); display(current + 1); }
  });
  dialog.addEventListener('close', function () { if (opener) opener.focus({ preventScroll: true }); });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) { var box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  document.getElementById('nj-trip-select').addEventListener('change', function () {
    var target = document.getElementById(this.value);
    if (target) target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
})();
