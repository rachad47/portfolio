/* Hover soundtracks use the original project audio files. */
(function() {
  var tracks = document.querySelectorAll('audio[data-project-audio]');
  function stopAll() {
    tracks.forEach(function(audio) {
      audio.pause();
      audio.currentTime = 0;
    });

  }
  document.querySelectorAll('.ce-project[data-hover-audio]').forEach(function(card) {
    var audio = document.getElementById(card.getAttribute('data-hover-audio'));
    if (!audio) return;
    function play() {
      stopAll();
      var playback = audio.play();
      if (playback && playback.catch) playback.catch(function() { /* Browser may require a first click before hover audio. */ });

    }
    card.addEventListener('mouseenter', play);
    card.addEventListener('mouseleave', stopAll);
    card.addEventListener('focus', play);
    card.addEventListener('blur', stopAll);
    card.addEventListener('click', stopAll);

  });
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) stopAll();
  });
  window.addEventListener('pagehide', stopAll);

})();
