$utf8 = New-Object System.Text.UTF8Encoding($false)
Copy-Item static\js\flip.js static\js\flip.js.before-curl -Force
$p = "$PWD\static\js\flip.js"
$j = [System.IO.File]::ReadAllText($p)

$new = @'
  // FLIP-CURL: page-bending turn animation
  var CURL_N = 8;
  function paperColor() {
    var els = [document.getElementById("reader"), document.body];
    for (var i = 0; i < els.length; i++) {
      if (!els[i]) { continue; }
      var c = getComputedStyle(els[i]).backgroundColor;
      if (c && c !== "transparent" && c !== "rgba(0, 0, 0, 0)") { return c; }
    }
    return "#10343a";
  }
  function snapshot(pageIdx) {
    var c = root.cloneNode(true);
    c.querySelectorAll("[id]").forEach(function (x) { x.removeAttribute("id"); });
    c.style.position = "absolute";
    c.style.top = "0";
    c.style.margin = "0";
    c.style.transform = "translateX(" + (pageIdx * step) + "px)";
    c.style.pointerEvents = "none";
    c.style.userSelect = "none";
    return c;
  }

  function goTo(n) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === cur || busy) { return; }
    var dir = n > cur ? 1 : -1;
    if (reduce || !window.requestAnimationFrame) { show(n); align(); return; }
    busy = true;
    var stage = null, done = false;
    function finish() {
      if (done) { return; }
      done = true;
      if (stage && stage.parentNode) { stage.parentNode.removeChild(stage); }
      if (dir < 0) { show(n); }
      busy = false;
    }
    try {
      align();
      var rect = view.getBoundingClientRect();
      var w = W / CURL_N;
      var paper = paperColor();
      var leafPage = dir > 0 ? cur : n;

      stage = document.createElement("div");
      stage.setAttribute("aria-hidden", "true");
      stage.style.cssText = "position:fixed;z-index:900;pointer-events:none;perspective:1700px;perspective-origin:60% 50%;clip-path:inset(-140px 0 -140px 0);top:" + rect.top + "px;left:" + rect.left + "px;width:" + W + "px;height:" + H + "px";

      var cast = document.createElement("div");
      cast.style.cssText = "position:absolute;top:0;height:100%;width:" + (W * 0.28) + "px;background:linear-gradient(to left,rgba(0,0,0,.5),rgba(0,0,0,0));opacity:0";
      stage.appendChild(cast);

      var frames = [], shades = [], bshades = [];
      var parent = stage;
      for (var i = 0; i < CURL_N; i++) {
        var fr = document.createElement("div");
        fr.style.cssText = "position:absolute;top:0;height:" + H + "px;width:" + w + "px;transform-origin:100% 50%;transform-style:preserve-3d;" + (i === 0 ? "right:0;" : "left:" + (-w) + "px;");

        var face = document.createElement("div");
        face.style.cssText = "position:absolute;top:0;left:0;height:100%;width:" + (w + 1) + "px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:" + paper;
        var clone = snapshot(leafPage);
        clone.style.left = (-(W - (i + 1) * w)) + "px";
        face.appendChild(clone);
        var shade = document.createElement("div");
        shade.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to left,rgba(0,0,0,.5),rgba(0,0,0,.05));opacity:0";
        face.appendChild(shade);

        var back = document.createElement("div");
        back.style.cssText = "position:absolute;top:0;left:0;height:100%;width:" + (w + 1) + "px;transform:rotateY(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden;background:" + paper;
        var bl = document.createElement("div");
        bl.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,.08)";
        back.appendChild(bl);
        var bshade = document.createElement("div");
        bshade.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to right,rgba(0,0,0,.5),rgba(0,0,0,.05));opacity:0";
        back.appendChild(bshade);

        fr.appendChild(face);
        fr.appendChild(back);
        parent.appendChild(fr);
        parent = fr;
        frames.push(fr); shades.push(shade); bshades.push(bshade);
      }

      var paint = function (p) {
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var theta = e * 100;
        var delta = Math.sin(Math.PI * e) * 7;
        var edge = W;
        for (var k = 0; k < CURL_N; k++) {
          frames[k].style.transform = "rotateY(" + (k === 0 ? theta : delta) + "deg)";
          var a = (theta + k * delta) * Math.PI / 180;
          var c = Math.cos(a);
          edge -= w * c;
          shades[k].style.opacity = c > 0 ? Math.min(0.6, 0.6 * (1 - c)) : 0;
          bshades[k].style.opacity = c < 0 ? Math.min(0.4, 0.4 * (1 + c)) : 0;
        }
        edge = Math.max(0, Math.min(W, edge));
        var sw = W * 0.28;
        cast.style.left = (edge - sw) + "px";
        cast.style.opacity = String(Math.min(1, Math.sin(Math.PI * e) * 1.2) * 0.9);
      };

      document.body.appendChild(stage);
      paint(dir > 0 ? 0 : 1);
      if (dir > 0) { show(n); }

      var t0 = null, dur = 700;
      var frame = function (ts) {
        if (done) { return; }
        if (t0 === null) { t0 = ts; }
        var t = Math.min(1, (ts - t0) / dur);
        paint(dir > 0 ? t : 1 - t);
        if (t < 1) { requestAnimationFrame(frame); } else { finish(); }
      };
      requestAnimationFrame(frame);
      setTimeout(finish, dur + 500);
    } catch (err) {
      try { finish(); } catch (e2) {}
      show(n);
      align();
    }
  }

'@

if ($j -match 'FLIP-CURL') {
  "Already added"
} elseif ($j.Contains('function goTo(n) {') -and $j.Contains('  function gotoBlock(b) {')) {
  $j = $j.Replace('function goTo(n) {', 'function goToOld(n) {')
  $j = $j.Replace('  function gotoBlock(b) {', $new + "`r`n  function gotoBlock(b) {")
  [System.IO.File]::WriteAllText($p, $j, $utf8)
  "Updated"
} else {
  "Could not find the places to patch in flip.js. Nothing changed."
}