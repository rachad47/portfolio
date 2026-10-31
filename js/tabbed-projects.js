(function ($) {
  'use strict';
  var section = document.getElementById('project');
  if (!section) return;
  var carousel = $(section).find('.owl-carousel');
  if (carousel.data('owl.carousel')) carousel.trigger('destroy.owl.carousel');
  var originals = carousel.children('.item').toArray();
  var definitions = [
    { label: 'Flying probes 🎯', title: '', entries: [0] },
    { label: 'Satellite design team 🛰️', title: '', entries: [8] },
    { label: 'Flight & racing ✈️', title: 'Real controls. Virtual worlds.', intro: 'Two hands-on builds connecting physical controls to driving and flight simulators.', entries: [1, 2] },
    { label: 'Hackathons', title: 'Hackathon projects', intro: 'Canada Welcomes and Better Delivery: two team projects built at hackathons.', entries: [4, 5] },
    { label: 'High-school DIY', title: 'Where the tinkering started.', intro: 'Early hands-on projects in robotics and automation.', entries: [7, 6] },
    { label: 'Job scripts', title: '', entries: [3] }
  ];
  if (originals.length !== 9) return;
  var tabs = document.createElement('div'); tabs.className = 'tp-tabs';
  tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Projects');
  var buttons = [], panels = [];
  definitions.forEach(function (definition, index) {
    var panel = document.createElement('div'); panel.className = 'item tp-group';
    panel.id = 'tp-panel-' + index; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'tp-tab-' + index);
    if (definition.title) {
      var header = document.createElement('div'); header.className = 'tp-group-heading';
      var title = document.createElement('h3'); title.textContent = definition.title;
      var intro = document.createElement('p'); intro.textContent = definition.intro;
      header.appendChild(title); header.appendChild(intro); panel.appendChild(header);
    }
    definition.entries.forEach(function (entryIndex) {
      var entry = originals[entryIndex];
      entry.classList.remove('item'); entry.classList.add('tp-entry');
      panel.appendChild(entry);
    });
    carousel[0].appendChild(panel); panels.push(panel);
    var button = document.createElement('button'); button.type = 'button'; button.className = 'tp-tab';
    button.id = 'tp-tab-' + index; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', panel.id);
    button.textContent = definition.label;
    button.addEventListener('click', function () { select(index); });
    button.addEventListener('keydown', function (event) {
      var target;
      if (event.key === 'ArrowRight') target = (index + 1) % definitions.length;
      if (event.key === 'ArrowLeft') target = (index + definitions.length - 1) % definitions.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = definitions.length - 1;
      if (target === undefined) return;
      event.preventDefault(); buttons[target].focus(); select(target);
    });
    buttons.push(button); tabs.appendChild(button);
  });
  carousel.before(tabs);
  var controls = document.createElement('div'); controls.className = 'tp-controls';
  controls.innerHTML = '<span class="tp-status" aria-live="polite" aria-atomic="true"></span><div class="tp-arrows"><button type="button" class="tp-prev" aria-label="Previous project">← <span>Previous project</span></button><button type="button" class="tp-next" aria-label="Next project"><span>Next project</span> →</button></div>';
  carousel.after(controls);
  var current = 0;
  function select(index, scroll) {
    current = index;
    panels.forEach(function (panel, i) {
      var active = i === index; panel.hidden = !active; panel.inert = !active;
      panel.setAttribute('aria-hidden', String(!active));
      buttons[i].setAttribute('aria-selected', String(active)); buttons[i].tabIndex = active ? 0 : -1;
      if (!active) $(panel).find('audio,video').each(function () { this.pause(); });
    });
    controls.querySelector('.tp-status').textContent = (index + 1) + ' / ' + definitions.length + ' projects · ' + definitions[index].label;
    if (scroll) tabs.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  controls.querySelector('.tp-prev').addEventListener('click', function () { select((current + definitions.length - 1) % definitions.length, true); });
  controls.querySelector('.tp-next').addEventListener('click', function () { select((current + 1) % definitions.length, true); });
  function openHash() {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (error) { return; }
    var target = id && document.getElementById(id);
    if (target) panels.forEach(function (panel, i) { if (panel.contains(target)) select(i); });
  }
  // Reveal hidden project content before scrolling to an incoming section link.
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var target;
    try { target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1))); }
    catch (error) { return; }
    if (!target) return;
    var index = panels.findIndex(function (panel) { return panel.contains(target); });
    if (index < 0) return;
    event.preventDefault();
    select(index);
    if (location.hash !== link.getAttribute('href')) history.pushState(null, '', link.getAttribute('href'));
    requestAnimationFrame(function () {
      var navbar = document.querySelector('.navbar');
      var offset = navbar ? navbar.getBoundingClientRect().height + 24 : 24;
      window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  });
  section.classList.add('tp-ready', 'tp-grouped'); select(0); openHash();
  window.addEventListener('hashchange', openHash);
})(jQuery);
