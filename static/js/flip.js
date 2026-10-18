/* FLIP-FIT: pages sized to the screen, no scrolling inside a page */
(function () {
  "use strict";
  var root = document.getElementById("reader-content");
  if (!root) { return; }

  var L = {
    next: "\u0786\u07AA\u0783\u07A8\u0787\u07A6\u0781\u07B0",
    prev: "\u078A\u07A6\u0780\u07A6\u078C\u07A6\u0781\u07B0"
  };
  var KEY = "flip-anchor:" + location.pathname;
  var TOP = 36;            // room for the highlight toolbar
  var BOTTOM = 60;
  var SAFE = 14;           // text columns are this much shorter than the clip box         // room for the page bar
  var GAP = 28;
  var ALIGN_ON_LOAD = false;
  var BLOCKS = "p, li, blockquote, h2, h3, h4";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // page dividers are no longer needed
  root.querySelectorAll(".reader-divider").forEach(function (d) { d.parentNode.removeChild(d); });

  var view = document.createElement("div");
  view.id = "flip-view";
  root.parentNode.insertBefore(view, root);
  view.appendChild(root);
  // FLIP-PAGENO: page number below the text of every page
  var pageNo = document.createElement("div");
  pageNo.id = "flip-pageno";
  pageNo.style.cssText = "text-align:center;direction:rtl;font-size:13px;opacity:.75;margin:6px 0 0;line-height:1.2";
  view.parentNode.insertBefore(pageNo, view.nextSibling);

  var st = document.createElement("style");
  st.textContent = [
    ".reader-sheet{display:contents}",
    "#flip-view{overflow:hidden;direction:rtl;transform-origin:right center}",
    "#reader-content{margin:0 !important;padding:0 !important;max-width:none !important;overflow:visible !important;column-fill:auto}",
    "#reader-content h2,#reader-content h3,#reader-content h4{break-after:avoid;break-inside:avoid}",
    "#reader-content p,#reader-content li{orphans:2;widows:2}",
    "#reader-content table{break-inside:avoid}",
    "#flip-nav{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:1000;display:flex;direction:rtl;gap:6px;align-items:center;padding:4px 8px;border-radius:18px;background:rgba(30,30,30,.93);color:#fff;font-size:12px;line-height:1.2;box-shadow:0 2px 10px rgba(0,0,0,.3)}",
    "#flip-nav button{font:inherit;color:inherit;background:transparent;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:3px 12px;cursor:pointer;white-space:nowrap}",
    "#flip-nav button:disabled{opacity:.35;cursor:default}",
    "#flip-nav .pg{direction:ltr;min-width:48px;text-align:center}"
  ].join("");
  document.head.appendChild(st);
  var imgSt = document.createElement("style");
  document.head.appendChild(imgSt);

  var nav = document.createElement("div");
  nav.id = "flip-nav";
  var prevB = document.createElement("button");
  prevB.type = "button";
  prevB.textContent = "\u2192 " + L.prev;
  var pg = document.createElement("span");
  pg.className = "pg";
  var nextB = document.createElement("button");
  nextB.type = "button";
  nextB.textContent = L.next + " \u2190";
  nav.appendChild(prevB);
  nav.appendChild(pg);
  nav.appendChild(nextB);
  document.body.appendChild(nav);

  var blocks = Array.prototype.slice.call(root.querySelectorAll(BLOCKS));
  // FLIP-TITLE: the chapter title lives inside the text, so only page 1 shows it
  var origTitle = document.querySelector("#reader > .post-title");
  if (origTitle && !root.querySelector(".flip-title")) {
    var tc = origTitle.cloneNode(true);
    tc.classList.add("flip-title");
    tc.removeAttribute("id");
    root.insertBefore(tc, root.firstChild); var rh = document.createElement("div"); rh.id = "rd-runhead"; rh.textContent = origTitle.textContent.trim(); root.parentNode.insertBefore(rh, root);
    var tst = document.createElement("style");
    tst.textContent = "#reader > .post-title{display:none !important}#reader-content .flip-title{margin-top:0}";
    document.head.appendChild(tst);
  }
  var H = 0, W = 0, step = 1, total = 1, cur = 0, busy = false, lastVH = 0;

  function layout() {
    lastVH = window.innerHeight;
    H = Math.max(240, Math.floor(window.__flipFocus ? (lastVH - Math.max(0, view.getBoundingClientRect().top) - 82) : (lastVH - TOP - BOTTOM)));
    view.style.height = H + "px";
    W = Math.floor(view.clientWidth);
    root.style.width = W + "px";
    root.style.height = (H - SAFE) + "px";
    root.style.columnWidth = W + "px";
    root.style.columnGap = GAP + "px";
    imgSt.textContent = "#reader-content img{max-height:" + (H - 10) + "px;width:auto;max-width:100%}";
    step = W + GAP;
    var rr = root.getBoundingClientRect().right;
    var range = document.createRange();
    range.selectNodeContents(root);
    var rects = range.getClientRects();
    var maxD = 0;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (r.width > 0 && r.height > 0) {
        var d = rr - r.left;
        if (d > maxD) { maxD = d; }
      }
    }
    total = Math.max(1, Math.floor(maxD / step) + 1);
  }

  function pageOfRect(r) {
    var rr = root.getBoundingClientRect().right;
    var cx = (r.left + r.right) / 2;
    return Math.max(0, Math.floor((rr - cx) / step));
  }
  function usable(el) {
    var rs = el.getClientRects(), out = [];
    for (var i = 0; i < rs.length; i++) { if (rs[i].width > 0 && rs[i].height > 0) { out.push(rs[i]); } }
    return out;
  }
  function firstPage(el) { var u = usable(el); return u.length ? pageOfRect(u[0]) : null; }
  function lastPage(el) { var u = usable(el); return u.length ? pageOfRect(u[u.length - 1]) : null; }

  function anchorBlock() {
    for (var i = 0; i < blocks.length; i++) {
      var lp = lastPage(blocks[i]);
      if (lp !== null && lp >= cur) { return blocks[i]; }
    }
    return blocks.length ? blocks[blocks.length - 1] : null;
  }
  function saveAnchor() {
    var b = anchorBlock();
    if (!b) { return; }
    try { localStorage.setItem(KEY, String(blocks.indexOf(b))); } catch (e) {}
  }

  function togglePager() {
    document.querySelectorAll(".reader-pager").forEach(function (el) {
      if (root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
        el.style.display = (cur === total - 1) ? "" : "none";
      }
    });
  }

  function show(n) {
    cur = Math.max(0, Math.min(total - 1, n)); var _rh = document.getElementById("rd-runhead"); if (_rh) { _rh.style.visibility = cur > 0 ? "visible" : "hidden"; }
    root.style.transform = "translateX(" + (cur * step) + "px)";
    pg.textContent = (cur + 1) + " / " + total; pageNo.textContent = "\u0790\u07A6\u078A\u07AA\u0780\u07A7 " + (cur + 1);
    prevB.disabled = (cur === 0 && !chapterHref(-1));
    nextB.disabled = (cur === total - 1 && !chapterHref(1));
    togglePager();
    saveAnchor();
  }

  function align() {
    if (window.__flipFocus) { try { window.scrollTo(0, 0); } catch (e) {} return; }
    var y = Math.max(0, view.getBoundingClientRect().top + window.pageYOffset - TOP);
    try { window.scrollTo({ top: y, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
  }

  function goToOld(n) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === cur || busy) { return; }
    var dir = n > cur ? 1 : -1;
    if (reduce || !view.animate) { show(n); align(); return; }
    busy = true;
    setTimeout(function () { busy = false; }, 900);
    var P = "perspective(1400px) rotateY(";
    var out = view.animate(
      [{ transform: P + "0deg)", opacity: 1 },
       { transform: P + (dir > 0 ? 75 : -30) + "deg)", opacity: 0 }],
      { duration: 200, easing: "ease-in", fill: "forwards" });
    out.onfinish = function () {
      out.cancel();
      show(n);
      align();
      var inn = view.animate(
        [{ transform: P + (dir > 0 ? -30 : 75) + "deg)", opacity: 0 },
         { transform: P + "0deg)", opacity: 1 }],
        { duration: 230, easing: "ease-out" });
      inn.onfinish = function () { busy = false; };
    };
  }

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

  function chapterHref(dir) {
    var as = document.querySelectorAll("nav.reader-bar details.reader-menu ul a");
    for (var i = 0; i < as.length; i++) {
      if (as[i].className.indexOf("current") > -1) {
        var o = as[i + dir];
        return o ? o.getAttribute("href") : null;
      }
    }
    return null;
  }
  function gotoChapter(dir) {
    var href = chapterHref(dir);
    if (!href) { return; }
    try {
      var u = new URL(href, location.href);
      u.hash = dir < 0 ? "#last" : "";
      var navDone = false;
      var go = function () { if (navDone) { return; } navDone = true; location.href = u.href; };
      if (reduce || !view.animate) { go(); return; }
      busy = true;
      try { sessionStorage.setItem("flip-enter", String(dir)); } catch (e2) {}
      var PP = "perspective(1400px) rotateY(";
      var outA = view.animate(
        [{ transform: PP + "0deg)", opacity: 1 },
         { transform: PP + (dir > 0 ? 75 : -30) + "deg)", opacity: 0 }],
        { duration: 220, easing: "ease-in", fill: "forwards" });
      outA.onfinish = go;
      setTimeout(go, 900);
    } catch (e) {}
  }
  function goTo(n) {
    if (!busy && n < 0) { gotoChapter(-1); return; }
    if (!busy && n > total - 1) { gotoChapter(1); return; }
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

  function gotoBlock(b) {
    var p = firstPage(b);
    show(p === null ? 0 : p);
  }

  function relayout() {
    var b = anchorBlock();
    layout();
    if (b) { gotoBlock(b); } else { show(0); }
  }

  // keep the clipped area from ever scrolling by itself
  view.addEventListener("scroll", function () { view.scrollLeft = 0; view.scrollTop = 0; });

  prevB.addEventListener("click", function () { goTo(cur - 1); });
  nextB.addEventListener("click", function () { goTo(cur + 1); });

  document.addEventListener("keydown", function (e) {
    var t = e.target && e.target.tagName;
    if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") { return; }
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }
    if (e.key === "ArrowLeft") { goTo(cur + 1); }
    else if (e.key === "ArrowRight") { goTo(cur - 1); }
  });

  var sx = 0, sy = 0, tracking = false;
  root.addEventListener("touchstart", function (e) {
    tracking = e.touches.length === 1;
    if (tracking) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
  }, { passive: true });
  root.addEventListener("touchend", function (e) {
    if (!tracking) { return; }
    tracking = false;
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed) { return; }
    var t = e.changedTouches[0];
    var dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      goTo(dx > 0 ? cur + 1 : cur - 1);
    }
  }, { passive: true });

  root.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href^='#']") : null;
    if (!a) { return; }
    var id = a.getAttribute("href").slice(1);
    try { id = decodeURIComponent(id); } catch (err) {}
    var target = id ? document.getElementById(id) : null;
    if (!target) { return; }
    var p = firstPage(target);
    if (p !== null && p !== cur) { show(p); align(); }
  }, true);

  function syncMenu() {
    var open = document.querySelector("details.reader-menu[open]");
    var sel = document.getElementById("reader-menu");
    var selOpen = sel && document.activeElement === sel;
    nav.style.display = (open || selOpen) ? "none" : "";
  }
  document.addEventListener("toggle", syncMenu, true);
  document.addEventListener("click", function () { setTimeout(syncMenu, 0); }, true);
  document.addEventListener("focusin", syncMenu);
  document.addEventListener("focusout", function () { setTimeout(syncMenu, 0); });

  var rt;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = Math.floor(view.clientWidth);
      if (w !== W || Math.abs(window.innerHeight - lastVH) > 120) { relayout(); }
    }, 250);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

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
  pop.appendChild((function () { var b = zbtn("\u2212", function () { zoom(-Z_STEP); }); b.style.fontSize = "16px"; b.style.padding = "1px 14px"; return b; })());
  pop.appendChild(zl);
  pop.appendChild((function () { var b = zbtn("+", function () { zoom(Z_STEP); }); b.style.fontSize = "16px"; b.style.padding = "1px 14px"; return b; })());
  eink = false; reduce = baseReduce; try { localStorage.removeItem(E_KEY); } catch (e) {} einkCss();
  var aaB = zbtn("Aa", function () { pop.style.display = (pop.style.display === "flex") ? "none" : "flex"; });
    // FLIP-AA: three Thaana letters, each smaller than the last
  aaB.textContent = "";
  aaB.setAttribute("aria-label", "Text size");
  aaB.style.cssText += ";display:inline-flex;align-items:center;gap:1px;direction:rtl;padding:2px 12px;line-height:1";
  [["\u0780", 22], ["\u0781", 17], ["\u0782", 12]].forEach(function (a) { var s = document.createElement("span"); s.textContent = a[0]; s.style.fontSize = a[1] + "px"; aaB.appendChild(s); });
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

  // FLIP-HIDEPILL: no floating size pill; the size and revert button live in the panel
  var revB = zbtn("\u21BA 100%", function () { setScaleNow(1, currentOffset()); });
  pop.appendChild(revB);
  function updatePill() {
    var s = pinching ? pTarget : scale;
    zl.textContent = Math.round(s * 100) + "%";
    revB.style.display = (Math.abs(s - 1) > 0.001) ? "" : "none";
    pill.style.display = "none";
  }
  var pgFix = document.createElement("style");
  pgFix.textContent = "#flip-nav .pg{white-space:nowrap}";
  document.head.appendChild(pgFix);

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

  // FLIP-FOCUS: reading mode. Hide everything outside the reader box, no page scrolling
  var FOCUS_MODE = true;   // set to false to bring the header and footer back
  window.__flipFocus = FOCUS_MODE;
  if (FOCUS_MODE) {
    (function () {
      var reader = document.getElementById("reader");
      if (!reader) { window.__flipFocus = false; return; }
      var skip = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, TEMPLATE: 1, NOSCRIPT: 1 };
      var n = reader;
      while (n && n !== document.body) {
        var par = n.parentElement;
        if (!par) { break; }
        Array.prototype.forEach.call(par.children, function (c) {
          if (c === n || skip[c.tagName] || c === nav) { return; }
          if (typeof pill !== "undefined" && c === pill) { return; }
          c.setAttribute("data-focus-hide", "1");
        });
        n = par;
      }
      var fst = document.createElement("style");
      fst.textContent = "[data-focus-hide]{display:none !important}html,body{overflow:hidden !important;overscroll-behavior:none}.reader-pager{position:fixed !important;bottom:50px;left:50%;transform:translateX(-50%);z-index:1000;margin:0 !important;padding:2px 8px !important;max-height:32px;overflow:hidden;background:rgba(30,30,30,.95);border-radius:16px;font-size:12px;line-height:1.3}";
      document.head.appendChild(fst);
      window.scrollTo(0, 0);

      // the chapters menu may open inside the page: allow scrolling only while it is open
      function menuScroll() {
        var open = document.querySelector("details.reader-menu[open]");
        if (open) {
          document.documentElement.style.setProperty("overflow", "auto", "important");
          document.body.style.setProperty("overflow", "auto", "important");
        } else {
          document.documentElement.style.removeProperty("overflow");
          document.body.style.removeProperty("overflow");
          window.scrollTo(0, 0);
          setTimeout(function () { relayout(); }, 100);
        }
      }
      document.addEventListener("toggle", menuScroll, true);
      document.addEventListener("click", function () { setTimeout(menuScroll, 0); }, true);

      // on the last page the chapter links replace the page number
      var _showF = show;
      show = function (n2) {
        _showF(n2);
        if (typeof pageNo !== "undefined") {
          pageNo.style.visibility = (cur === total - 1 && document.querySelector(".reader-pager")) ? "hidden" : "";
        }
      };
      setTimeout(function () { relayout(); }, 700);
    })();
  }

  // ----- start -----
  var savedIdx = -1;
  try { var sv = parseInt(localStorage.getItem(KEY), 10); if (sv >= 0) { savedIdx = sv; } } catch (e) {}
  var h = location.hash, startB = null, enterDir = 0;
  try { enterDir = parseInt(sessionStorage.getItem("flip-enter"), 10) || 0; sessionStorage.removeItem("flip-enter"); } catch (e) {}
  if (enterDir && !reduce && view.animate) { view.style.opacity = "0"; } else { enterDir = 0; }
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) {
      try { view.getAnimations().forEach(function (an) { an.cancel(); }); } catch (e3) {}
      view.style.opacity = "";
      busy = false;
    }
  });
  var wantLast = (h === "#last") || enterDir < 0, lastT0 = Date.now();
  function keepLast() { if (wantLast && !startB && Date.now() - lastT0 < 2000 && cur !== total - 1) { show(total - 1); } }
  if (h === "#bookmark") { startB = root.querySelector(".bookmarked"); }
  else if (h === "#resume" && savedIdx >= 0 && savedIdx < blocks.length) { startB = blocks[savedIdx]; }

  layout();
  if (startB) { gotoBlock(startB); } else if (wantLast) { show(total - 1); } else { show(0); }
  if (cur > 0 || ALIGN_ON_LOAD) { setTimeout(align, 60); }
  var revealed = false;
  function reveal() {
    if (revealed) { return; }
    revealed = true;
    document.documentElement.classList.remove("flip-pending");
    playEnter();
  }
  function playEnter() { if (!enterDir) { return; }
    busy = true;
    var P2 = "perspective(1400px) rotateY(";
    var inA = view.animate(
      [{ transform: P2 + (enterDir > 0 ? -30 : 75) + "deg)", opacity: 0 },
       { transform: P2 + "0deg)", opacity: 1 }],
      { duration: 260, easing: "ease-out" });
    view.style.opacity = "";
    inA.onfinish = function () { busy = false; };
    setTimeout(function () { busy = false; }, 900);
  }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { relayout(); keepLast(); reveal(); }); }
  window.addEventListener("load", function () { setTimeout(function () { relayout(); keepLast(); }, 150); setTimeout(keepLast, 900); setTimeout(reveal, 200); });

  window.readerFlip = {
    reveal: function (el) {
      var p = firstPage(el);
      if (p !== null && p !== cur) { show(p); align(); }
    },
    goTo: goTo
  };
})();