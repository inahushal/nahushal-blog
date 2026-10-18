$utf8 = New-Object System.Text.UTF8Encoding($false)
Copy-Item static\js\flip.js static\js\flip.js.before-zoom -Force
$p = "$PWD\static\js\flip.js"
$j = [System.IO.File]::ReadAllText($p)
$marker = '  // ----- start -----'

$new = @'
  // FLIP-ZOOM: font-size zoom by real reflow (not magnification)
  var Z_KEY = "flip-scale", E_KEY = "flip-eink";
  var Z_MIN = 0.8, Z_MAX = 2.0, Z_STEP = 0.1;
  var scale = 1, eink = false, pendScale = null, pendOff = null, zt = null, tc = 0;
  try {
    var zs = parseFloat(localStorage.getItem(Z_KEY));
    if (zs >= Z_MIN && zs <= Z_MAX) { scale = zs; }
    eink = localStorage.getItem(E_KEY) === "1";
  } catch (e) {}
  var baseReduce = reduce;
  reduce = baseReduce || eink;

  var cs0 = getComputedStyle(root);
  var basePx = parseFloat(cs0.fontSize) || 18;
  var lh0 = parseFloat(cs0.lineHeight);
  var firstP = root.querySelector("p");
  var pm0 = firstP ? parseFloat(getComputedStyle(firstP).marginBottom) : NaN;
  var zrules = "#reader-content{text-rendering:optimizeLegibility;font-kerning:normal}";
  if (isFinite(lh0) && lh0 > 0) {
    zrules += "#reader-content,#reader-content p,#reader-content li,#reader-content blockquote{line-height:" + (lh0 / basePx).toFixed(3) + " !important}";
  }
  if (isFinite(pm0) && pm0 > 0) {
    zrules += "#reader-content p{margin-bottom:" + (pm0 / basePx).toFixed(3) + "em !important}";
  }
  var zst = document.createElement("style");
  zst.textContent = zrules;
  document.head.appendChild(zst);

  var est = document.createElement("style");
  document.head.appendChild(est);
  function einkCss() {
    est.textContent = eink ? "*,*::before,*::after{transition:none !important;animation:none !important}#flip-nav,.hl-tools{box-shadow:none !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important}" : "";
  }
  einkCss();

  function applyScale() { root.style.fontSize = (basePx * scale) + "px"; }
  applyScale();

  function textNodes() {
    var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) { if (n.nodeValue.length) { out.push(n); } }
    return out;
  }
  var zr = document.createRange();
  function charPage(node, off) {
    var len = node.nodeValue.length;
    if (off >= len) { off = len - 1; }
    if (off < 0) { return null; }
    zr.setStart(node, off);
    zr.setEnd(node, off + 1);
    var rs = zr.getClientRects();
    for (var i = 0; i < rs.length; i++) {
      if (rs[i].width > 0 && rs[i].height > 0) { return pageOfRect(rs[i]); }
    }
    return null;
  }
  // character offset (in the whole chapter text) of the first character on the current page
  function currentOffset() {
    var nodes = textNodes(), acc = 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], len = n.nodeValue.length;
      var lp = null, k = len - 1;
      while (k >= 0 && lp === null) { lp = charPage(n, k); k--; }
      if (lp !== null && lp >= cur) {
        var lo = 0, hi = len - 1;
        while (lo < hi) {
          var mid = (lo + hi) >> 1, mp = charPage(n, mid);
          if (mp === null) { lo = mid + 1; } else if (mp >= cur) { hi = mid; } else { lo = mid + 1; }
        }
        return acc + lo;
      }
      acc += len;
    }
    return null;
  }
  // which page now holds that character
  function pageOfOffset(off) {
    var nodes = textNodes(), acc = 0;
    for (var i = 0; i < nodes.length; i++) {
      var len = nodes[i].nodeValue.length;
      if (off < acc + len) {
        var o = off - acc, pp = null;
        for (var t = 0; t < 12 && pp === null && o + t < len; t++) { pp = charPage(nodes[i], o + t); }
        return pp;
      }
      acc += len;
    }
    return null;
  }
  function totalChars() {
    var t = 0;
    textNodes().forEach(function (n) { t += n.nodeValue.length; });
    return t || 1;
  }

  // progress + remembered position after every page change
  var _show = show;
  show = function (n) { _show(n); afterShow(); };
  function afterShow() {
    var off = currentOffset();
    if (off === null) { return; }
    if (!tc) { tc = totalChars(); }
    var pct = (cur >= total - 1) ? 100 : Math.round(off / tc * 100);
    pg.textContent = (cur + 1) + " / " + total + " \u00B7 " + pct + "%";
    try { localStorage.setItem("flip-offset:" + location.pathname, String(off)); } catch (e) {}
  }

  // window resize / rotation: keep the same words on screen
  relayout = function () {
    if (pendScale !== null) { return; }
    var off = currentOffset();
    layout();
    var np = (off === null) ? null : pageOfOffset(off);
    show(np === null ? Math.min(cur, total - 1) : np);
  };

  function commitZoom() {
    zt = null;
    if (pendScale === null) { return; }
    var off = pendOff;
    scale = pendScale; pendScale = null; pendOff = null;
    try { localStorage.setItem(Z_KEY, String(scale)); } catch (e) {}
    applyScale();
    layout();
    var np = (off === null) ? null : pageOfOffset(off);
    show(np === null ? 0 : np);
  }
  function zoom(d) {
    if (busy) { return; }
    var from = (pendScale === null) ? scale : pendScale;
    var s = Math.round((from + d) * 10) / 10;
    s = Math.max(Z_MIN, Math.min(Z_MAX, s));
    if (s === from) { return; }
    if (pendOff === null) { pendOff = currentOffset(); }
    pendScale = s;
    zl.textContent = Math.round(s * 100) + "%";
    clearTimeout(zt);
    zt = setTimeout(commitZoom, eink ? 600 : 220);
  }

  // ----- controls: Aa button + small panel -----
  function zbtn(t, fn) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = t;
    b.style.cssText = "font:inherit;color:inherit;background:transparent;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:3px 12px;cursor:pointer;white-space:nowrap";
    b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
    return b;
  }
  var pop = document.createElement("div");
  pop.style.cssText = "position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);display:none;direction:ltr;gap:6px;align-items:center;padding:5px 8px;border-radius:16px;background:rgba(30,30,30,.97);color:#fff;white-space:nowrap";
  var zl = zbtn(Math.round(scale * 100) + "%", function () {
    zoom(1 - (pendScale === null ? scale : pendScale));
  });
  var eB = zbtn("E-ink", function () {
    eink = !eink;
    reduce = baseReduce || eink;
    try { localStorage.setItem(E_KEY, eink ? "1" : "0"); } catch (e) {}
    einkCss();
    eB.style.background = eink ? "rgba(255,255,255,.28)" : "transparent";
  });
  eB.style.background = eink ? "rgba(255,255,255,.28)" : "transparent";
  pop.appendChild(zbtn("A\u2212", function () { zoom(-Z_STEP); }));
  pop.appendChild(zl);
  pop.appendChild(zbtn("A+", function () { zoom(Z_STEP); }));
  pop.appendChild(eB);
  var aaB = zbtn("Aa", function () { pop.style.display = (pop.style.display === "flex") ? "none" : "flex"; });
  nav.appendChild(aaB);
  nav.appendChild(pop);

  document.addEventListener("click", function (e) {
    if (!nav.contains(e.target)) { pop.style.display = "none"; }
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target && e.target.tagName;
    if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") { return; }
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }
    if (e.key === "+" || e.key === "=") { zoom(Z_STEP); }
    else if (e.key === "-" || e.key === "_") { zoom(-Z_STEP); }
  });

'@

if ($j -match 'FLIP-ZOOM') {
  "Already added"
} elseif ($j.Contains($marker)) {
  $j = $j.Replace($marker, $new + "`r`n" + $marker)
  [System.IO.File]::WriteAllText($p, $j, $utf8)
  "Updated"
} else {
  "Could not find the place to patch in flip.js. Nothing changed."
}