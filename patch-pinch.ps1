$utf8 = New-Object System.Text.UTF8Encoding($false)
Copy-Item static\js\flip.js static\js\flip.js.before-pinch -Force
$p = "$PWD\static\js\flip.js"
$j = [System.IO.File]::ReadAllText($p)
$marker = '  // ----- start -----'

$new = @'
  // FLIP-PINCH: two-finger pinch zoom (reflow) + size pill with revert button
  var pst = document.createElement("style");
  pst.textContent = "#flip-view{touch-action:pan-y}";
  document.head.appendChild(pst);

  var pinching = false, pd0 = 1, ps0 = 1, pTarget = 1, pOff = null, pLast = 0;

  var pill = document.createElement("div");
  pill.style.cssText = "position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:1001;display:none;align-items:center;gap:8px;direction:ltr;padding:4px 6px 4px 12px;border-radius:18px;background:rgba(30,30,30,.95);color:#fff;font-size:13px;line-height:1.2";
  var pCur = document.createElement("span");
  var pOrig = document.createElement("button");
  pOrig.type = "button";
  pOrig.textContent = "\u21BA 100%";
  pOrig.style.cssText = "font:inherit;color:inherit;background:transparent;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:3px 10px;cursor:pointer;white-space:nowrap";
  pill.appendChild(pCur);
  pill.appendChild(pOrig);
  document.body.appendChild(pill);

  function updatePill() {
    var s = pinching ? pTarget : scale;
    var changed = Math.abs(s - 1) > 0.001;
    pCur.textContent = Math.round(s * 100) + "%";
    pOrig.style.display = changed ? "" : "none";
    pill.style.display = (pinching || changed) ? "flex" : "none";
  }

  function setScaleNow(s, off) {
    clearTimeout(zt); zt = null; pendScale = null; pendOff = null;
    scale = s;
    try { localStorage.setItem(Z_KEY, String(scale)); } catch (e) {}
    applyScale();
    layout();
    var np = (off === null || off === undefined) ? null : pageOfOffset(off);
    show(np === null ? 0 : np);
    zl.textContent = Math.round(scale * 100) + "%";
    updatePill();
  }

  // keep the pill in step with the A+ / A- buttons too
  var _cz = commitZoom;
  commitZoom = function () { _cz(); updatePill(); };

  pOrig.addEventListener("click", function (e) {
    e.stopPropagation();
    setScaleNow(1, currentOffset());
  });

  function dist(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  }
  view.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 2 || busy) { return; }
    if (zt) { clearTimeout(zt); commitZoom(); }
    pinching = true;
    pd0 = dist(e.touches);
    ps0 = scale;
    pTarget = scale;
    pOff = currentOffset();
    pLast = 0;
    updatePill();
  }, { passive: true });
  view.addEventListener("touchmove", function (e) {
    if (!pinching || e.touches.length !== 2) { return; }
    e.preventDefault();
    var s = Math.round(ps0 * (dist(e.touches) / pd0) * 20) / 20;
    s = Math.max(Z_MIN, Math.min(Z_MAX, s));
    if (s === pTarget) { return; }
    pTarget = s;
    updatePill();
    var now = Date.now();
    if (!eink && s !== scale && now - pLast > 180) {
      pLast = now;
      setScaleNow(s, pOff);
    }
  }, { passive: false });
  function endPinch() {
    if (!pinching) { return; }
    pinching = false;
    if (pTarget !== scale) { setScaleNow(pTarget, pOff); }
    pOff = null;
    updatePill();
  }
  view.addEventListener("touchend", function (e) { if (e.touches.length < 2) { endPinch(); } }, { passive: true });
  view.addEventListener("touchcancel", endPinch, { passive: true });

  // hide the pill while the chapters menu hides the page bar
  new MutationObserver(function () {
    pill.style.visibility = (nav.style.display === "none") ? "hidden" : "visible";
  }).observe(nav, { attributes: true, attributeFilter: ["style"] });

  updatePill();

'@

if ($j -match 'FLIP-PINCH') {
  "Already added"
} elseif (($j -match 'FLIP-ZOOM') -and $j.Contains($marker)) {
  [System.IO.File]::WriteAllText($p, $j.Replace($marker, $new + "`r`n" + $marker), $utf8)
  "Updated"
} else {
  "Could not find the place to patch in flip.js (zoom code missing?). Nothing changed."
}