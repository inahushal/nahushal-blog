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
  var TOP = 46;            // room for the highlight toolbar
  var BOTTOM = 60;         // room for the page bar
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
    root.insertBefore(tc, root.firstChild);
    var tst = document.createElement("style");
    tst.textContent = "#reader > .post-title{display:none !important}#reader-content .flip-title{margin-top:0}";
    document.head.appendChild(tst);
  }
  var H = 0, W = 0, step = 1, total = 1, cur = 0, busy = false, lastVH = 0;

  function layout() {
    lastVH = window.innerHeight;
    H = Math.max(240, Math.floor(lastVH - TOP - BOTTOM));
    view.style.height = H + "px";
    W = Math.floor(view.clientWidth);
    root.style.width = W + "px";
    root.style.height = H + "px";
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
    cur = Math.max(0, Math.min(total - 1, n));
    root.style.transform = "translateX(" + (cur * step) + "px)";
    pg.textContent = (cur + 1) + " / " + total;
    prevB.disabled = (cur === 0);
    nextB.disabled = (cur === total - 1);
    togglePager();
    saveAnchor();
  }

  function align() {
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

  // ----- start -----
  var savedIdx = -1;
  try { var sv = parseInt(localStorage.getItem(KEY), 10); if (sv >= 0) { savedIdx = sv; } } catch (e) {}
  var h = location.hash, startB = null;
  if (h === "#bookmark") { startB = root.querySelector(".bookmarked"); }
  else if (h === "#resume" && savedIdx >= 0 && savedIdx < blocks.length) { startB = blocks[savedIdx]; }

  layout();
  if (startB) { gotoBlock(startB); } else { show(0); }
  if (cur > 0 || ALIGN_ON_LOAD) { setTimeout(align, 60); }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(relayout); }
  window.addEventListener("load", function () { setTimeout(relayout, 150); });

  window.readerFlip = {
    reveal: function (el) {
      var p = firstPage(el);
      if (p !== null && p !== cur) { show(p); align(); }
    },
    goTo: goTo
  };
})();