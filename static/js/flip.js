/* FLIP-PAGES */
(function () {
  "use strict";
  var root = document.getElementById("reader-content");
  if (!root) { return; }
  var sheets = Array.prototype.slice.call(root.querySelectorAll(".reader-sheet"));
  if (sheets.length < 2) { return; }

  var L = {
    next: "\u0786\u07AA\u0783\u07A8\u0787\u07A6\u0781\u07B0",
    prev: "\u078A\u07A6\u0780\u07A6\u078C\u07A6\u0781\u07B0"
  };
  var KEY = "flip-page:" + location.pathname;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cur = 0, busy = false;

  var st = document.createElement("style");
  st.textContent =
    ".reader-sheet{display:none}" +
    ".reader-sheet.flip-on{display:block;transform-origin:right center}" +
    ".reader-divider{display:none !important}" +
    "#reader-content{margin-bottom:64px}" +
    "#flip-nav{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:1000;display:flex;direction:rtl;gap:6px;align-items:center;padding:4px 8px;border-radius:18px;background:rgba(30,30,30,.93);color:#fff;font-size:12px;line-height:1.2;box-shadow:0 2px 10px rgba(0,0,0,.3)}" +
    "#flip-nav button{font:inherit;color:inherit;background:transparent;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:3px 12px;cursor:pointer;white-space:nowrap}" +
    "#flip-nav button:disabled{opacity:.35;cursor:default}" +
    "#flip-nav .pg{direction:ltr;min-width:48px;text-align:center}";
  document.head.appendChild(st);

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

  function togglePager() {
    document.querySelectorAll(".reader-pager").forEach(function (el) {
      if (root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
        el.style.display = (cur === sheets.length - 1) ? "" : "none";
      }
    });
  }

  function show(n) {
    sheets.forEach(function (s, i) { s.classList.toggle("flip-on", i === n); });
    cur = n;
    pg.textContent = (n + 1) + " / " + sheets.length;
    prevB.disabled = (n === 0);
    nextB.disabled = (n === sheets.length - 1);
    try { localStorage.setItem(KEY, String(n)); } catch (e) {}
    togglePager();
  }

  function toTop() {
    var y = (cur === 0) ? 0 : Math.max(0, root.getBoundingClientRect().top + window.pageYOffset - 60);
    try { window.scrollTo({ top: y, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
  }

  function goTo(n) {
    n = Math.max(0, Math.min(sheets.length - 1, n));
    if (n === cur || busy) { return; }
    var dir = n > cur ? 1 : -1;
    var from = sheets[cur], to = sheets[n];
    if (reduce || !from.animate) { show(n); toTop(); return; }
    busy = true;
    setTimeout(function () { busy = false; }, 800);
    var P = "perspective(1400px) rotateY(";
    var out = from.animate(
      [{ transform: P + "0deg)", opacity: 1 },
       { transform: P + (dir > 0 ? 75 : -30) + "deg)", opacity: 0 }],
      { duration: 220, easing: "ease-in", fill: "forwards" });
    out.onfinish = function () {
      show(n);
      out.cancel();
      toTop();
      var inn = to.animate(
        [{ transform: P + (dir > 0 ? -30 : 75) + "deg)", opacity: 0 },
         { transform: P + "0deg)", opacity: 1 }],
        { duration: 240, easing: "ease-out" });
      inn.onfinish = function () { busy = false; };
    };
  }

  function reveal(el) {
    var s = (el && el.closest) ? el.closest(".reader-sheet") : null;
    var i = sheets.indexOf(s);
    if (i >= 0 && i !== cur) { show(i); }
  }

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
    reveal(target);
    target.scrollIntoView({ block: "center" });
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

  var h = location.hash, start = 0, bm = null;
  if (h === "#bookmark") {
    bm = root.querySelector(".bookmarked");
    var bs = bm ? bm.closest(".reader-sheet") : null;
    if (bs) { start = sheets.indexOf(bs); }
  } else if (h === "#resume") {
    try {
      var sv = parseInt(localStorage.getItem(KEY), 10);
      if (sv >= 0 && sv < sheets.length) { start = sv; }
    } catch (e) {}
  }
  show(start);
  if (start > 0) {
    setTimeout(function () {
      if (bm) { bm.scrollIntoView({ block: "center" }); } else { toTop(); }
    }, 60);
  }

  window.readerFlip = { reveal: reveal, goTo: goTo };
})();