// Journal: getting around the places. A glass button in the corner names the
// place being read; tapping it opens a list of every place, grouped by trip,
// and the ↑ button above it goes back to the destination links at the top.
// It appears once those links have scrolled away. Built from the trips, so a
// new trip or stop shows up here without extra markup.
//
// A place is each stop of a road trip, or the trip itself when it has no stops.
// It is named like its destination link at the top; one without a link uses
// its heading. Add data-place="…" to a <section> to name it yourself.
(function() {
  'use strict';
  var intro = document.querySelector('.field-trip-nav');
  if (!intro || !('IntersectionObserver' in window)) return;

  var linkNames = {};
  intro.querySelectorAll('a[href^="#"]').forEach(function(a) {
    var id = decodeURIComponent(a.hash.slice(1));
    if (!linkNames[id]) linkNames[id] = a.textContent;
  });

  // "Lassen Volcanic National Park🌋" -> "Lassen Volcanic NP"
  function clean(text) {
    return text
      .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
      .replace(/National Parks?/, 'NP')
      .split('·')[0]
      .replace(/\s+/g, ' ')
      .trim();
  }

  function nameOf(section) {
    if (section.dataset.place) return section.dataset.place;
    if (linkNames[section.id]) return clean(linkNames[section.id]);
    var heading = section.querySelector('h3, h2');
    return clean(heading ? heading.textContent : section.id);
  }

  // Groups: a road trip with its stops, or a single trip on its own.
  var places = [];
  var groups = [];
  document.querySelectorAll('section.nj-trip[id]').forEach(function(trip) {
    var stops = Array.from(trip.querySelectorAll('section.nj-stop[id]'));
    var members = stops.length ? stops : [trip];
    var heading = trip.querySelector('h2');
    groups.push({
      title: stops.length && heading ? clean(heading.textContent) : null,
      places: members.map(function(section) {
        var place = { section: section, name: nameOf(section), links: [] };
        places.push(place);
        return place;
      })
    });
  });
  if (!places.length) return;

  var topHref = '#' + (intro.id || 'journal');

  function placeLink(place) {
    var a = document.createElement('a');
    a.href = '#' + place.section.id;
    a.textContent = place.name;
    place.links.push(a);
    return a;
  }

  // ---------- Corner button and list ----------
  var corner = document.createElement('div');
  corner.className = 'places-corner';

  var list = document.createElement('div');
  list.className = 'places-list';
  list.id = 'places-list';
  list.hidden = true;
  groups.forEach(function(group) {
    var block = document.createElement('div');
    block.className = 'places-list-group';
    if (group.title) {
      var label = document.createElement('p');
      label.textContent = group.title;
      block.appendChild(label);
    }
    group.places.forEach(function(place) {
      block.appendChild(placeLink(place));
    });
    list.appendChild(block);
  });

  var up = document.createElement('a');
  up.className = 'places-up';
  up.href = topHref;
  up.setAttribute('aria-label', 'All places');
  up.textContent = '↑';

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'places-button';
  button.setAttribute('aria-controls', list.id);
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span class="places-button-icon" aria-hidden="true">📍</span><span class="places-button-name"></span>';
  var buttonName = button.querySelector('.places-button-name');

  corner.append(list, up, button);
  document.body.appendChild(corner);

  function setOpen(open) {
    list.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    corner.classList.toggle('is-open', open);
  }
  button.addEventListener('click', function() {
    setOpen(list.hidden);
  });
  list.addEventListener('click', function(event) {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', function(event) {
    if (!list.hidden && !corner.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && !list.hidden) {
      setOpen(false);
      button.focus();
    }
  });

  // ---------- Show after the destination links, track the current place ----------
  function setVisible(visible) {
    corner.classList.toggle('is-visible', visible);
    corner.inert = !visible;
    if (!visible) setOpen(false);
  }
  setVisible(false);
  new IntersectionObserver(function(entries) {
    setVisible(!entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
  }).observe(intro);

  var current;
  function setCurrent(place) {
    if (place === current) return;
    if (current) current.links.forEach(function(a) { a.removeAttribute('aria-current'); });
    current = place;
    place.links.forEach(function(a) { a.setAttribute('aria-current', 'location'); });
    buttonName.textContent = place.name;
    button.setAttribute('aria-label', place.name + ': show all places');
  }
  setCurrent(places[0]);

  var reading = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      setCurrent(places.find(function(place) { return place.section === entry.target; }));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  places.forEach(function(place) {
    reading.observe(place.section);
  });
})();
