(function () {
  var el = document.getElementById('article-content');
  if (!el) return;
  var MIN = 0.8, MAX = 2.5, z = 1, startDist = 0, startZ = 1;
  document.documentElement.style.touchAction = 'pan-x pan-y';
  function dist(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) { startDist = dist(e.touches); startZ = z; }
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 2 || !startDist) return;
    e.preventDefault();
    z = Math.min(MAX, Math.max(MIN, startZ * dist(e.touches) / startDist));
    el.style.zoom = z;
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    if (e.touches.length < 2) startDist = 0;
  }, { passive: true });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
    document.addEventListener(n, function (e) { e.preventDefault(); });
  });
})();