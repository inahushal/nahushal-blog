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

  function goTo(n) {
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