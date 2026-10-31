(function() {
  'use strict';
  var buttons = document.querySelectorAll('.orbit-figure-zoom');
  if (!buttons.length) return;
  var dialog = document.createElement('dialog');
  dialog.className = 'orbit-figure-dialog';
  dialog.setAttribute('aria-label', 'Enlarged testbed figure');
  var close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close ×';
  var image = document.createElement('img');
  dialog.appendChild(close);
  dialog.appendChild(image);
  document.body.appendChild(dialog);
  buttons.forEach(function(button) {
    button.addEventListener('click', function() {
      var source = button.querySelector('img');
      image.src = source.src;
      image.alt = source.alt;
      dialog.showModal();
    });
  });
  close.addEventListener('click', function() {
    dialog.close();
  });
})();
