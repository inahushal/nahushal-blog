(function () {
  "use strict";
  var root = document.getElementById("reader-content");
  if (!root) return;

  // Labels (Dhivehi). Edit here if you want different wording.
  var L = {
    highlight: "\u0780\u07A6\u0787\u07A8\u078D\u07A6\u0787\u07A8\u0793\u07B0",
    list: "\u0780\u07A6\u0787\u07A8\u078D\u07A6\u0787\u07A8\u0793\u07B0\u078C\u07A6\u0787\u07B0",
    del: "\u078A\u07AE\u0780\u07AC\u078D\u07A7",
    page: "\u0790\u07A6\u078A\u07AA\u0780\u07A7",
    empty: "\u0780\u07A6\u0787\u07A8\u078D\u07A6\u0787\u07A8\u0793\u07B0 \u0786\u07AA\u0783\u07AC\u0788\u07A8\u078A\u07A6\u0787\u07AC\u0787\u07B0 \u0782\u07AC\u078C\u07B0"
  };

  var KEY = "hl:" + location.pathname;
  var COLORS = { yellow: "#fff1a8", pink: "#ffd0e0" };

  // ---------- styles ----------
  var css = "mark.hl{color:#111;border-radius:2px;cursor:pointer;padding:0}" +
    Object.keys(COLORS).map(function (c) {
      return "mark.hl[data-color=" + c + "]{background:" + COLORS[c] + "}";
    }).join("") +
    "mark.hl.flash{outline:3px solid #e67e22;outline-offset:2px}" +
    "#hl-bar{position:absolute;z-index:9999;display:none;gap:8px;align-items:center;padding:6px 10px;background:#222;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25)}" +
    "#hl-bar button{all:unset;cursor:pointer;width:22px;height:22px;border-radius:50%;border:2px solid #fff}" +
    "#hl-bar button.del{width:auto;height:auto;border:0;border-radius:0;color:#fff;font-size:14px;padding:0 4px}" +
    ".hl-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0;padding:8px;border:1px solid rgba(128,128,128,.4);border-radius:10px}" +
    ".hl-btn{font:inherit;color:inherit;background:transparent;border:1px solid rgba(128,128,128,.5);border-radius:8px;padding:4px 12px;cursor:pointer}" +
    ".hl-btn.on{background:rgba(128,128,128,.25)}" +
    ".hl-dot{width:22px;height:22px;border-radius:50%;border:2px solid rgba(128,128,128,.6);padding:0;cursor:pointer}" +
    ".hl-dot.on{outline:2px solid currentColor;outline-offset:2px}" +
    ".hl-panel{flex-basis:100%;max-height:40vh;overflow:auto;border-top:1px solid rgba(128,128,128,.3);padding-top:6px;display:none}" +
    ".hl-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(128,128,128,.15)}" +
    ".hl-sw{flex:none;width:12px;height:12px;border-radius:50%}" +
    ".hl-text{all:unset;flex:1;cursor:pointer;line-height:1.6}" +
    ".hl-pg{flex:none;opacity:.6;font-size:.85em}" +
    ".hl-x{all:unset;flex:none;cursor:pointer;padding:0 6px;opacity:.7}" +
    ".hl-empty{opacity:.6;padding:6px 0}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  // ---------- storage ----------
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  var items = load();

  // ---------- highlighting ----------
  function wrap(h) {
    var nodes = [], pos = 0, n;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while ((n = w.nextNode())) {
      var len = n.nodeValue.length;
      if (pos + len > h.start && pos < h.end &&
          !(n.parentNode.closest && n.parentNode.closest(".reader-divider"))) {
        nodes.push({ n: n, s: Math.max(h.start - pos, 0), e: Math.min(h.end - pos, len) });
      }
      pos += len;
    }
    nodes.forEach(function (o) {
      if (!o.n.nodeValue.slice(o.s, o.e).trim()) return;
      var mid = o.n;
      if (o.s > 0) mid = o.n.splitText(o.s);
      if (o.e - o.s < mid.nodeValue.length) mid.splitText(o.e - o.s);
      var m = document.createElement("mark");
      m.className = "hl";
      m.dataset.id = h.id;
      m.dataset.color = h.color;
      mid.parentNode.insertBefore(m, mid);
      m.appendChild(mid);
    });
  }

  function unwrap(id) {
    root.querySelectorAll('mark.hl[data-id="' + id + '"]').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }

  function removeItem(id) {
    unwrap(id);
    items = items.filter(function (h) { return h.id !== id; });
    save();
    refresh();
  }

  function restore() {
    var full = root.textContent;
    items = items.filter(function (h) {
      if (full.slice(h.start, h.end) !== h.text) {
        var i = full.indexOf(h.text);
        if (i < 0) return false;
        h.start = i; h.end = i + h.text.length;
      }
      wrap(h);
      return true;
    });
    save();
  }

  // ---------- toolbar above the book ----------
  var mode = false;
  var activeColor = "yellow";
  var idx = -1;

  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    if (tag === "button") e.type = "button";
    return e;
  }

  var tools = mk("div", "hl-tools");
  var modeBtn = mk("button", "hl-btn", "\u270E " + L.highlight);
  var dots = {};
  var listBtn = mk("button", "hl-btn", L.list + " (0)");
  var prevBtn = mk("button", "hl-btn", "\u2191");
  var nextBtn = mk("button", "hl-btn", "\u2193");
  var panel = mk("div", "hl-panel");

  tools.appendChild(modeBtn);
  Object.keys(COLORS).forEach(function (c) {
    var d = mk("button", "hl-dot");
    d.style.background = COLORS[c];
    d.setAttribute("aria-label", c);
    d.addEventListener("click", function () { activeColor = c; setMode(true); });
    dots[c] = d;
    tools.appendChild(d);
  });
  tools.appendChild(listBtn);
  tools.appendChild(panel);
  root.parentNode.insertBefore(tools, root);

  function setMode(on) {
    mode = on;
    modeBtn.classList.toggle("on", on);
    Object.keys(dots).forEach(function (c) {
      dots[c].classList.toggle("on", on && c === activeColor);
    });
  }
  modeBtn.addEventListener("click", function () { setMode(!mode); });
  listBtn.addEventListener("click", function () {
    var open = panel.style.display === "block" || !items.length;
    panel.style.display = open ? "none" : "block";
    listBtn.classList.toggle("on", !open);
  });

  function sorted() { return items.slice().sort(function (a, b) { return a.start - b.start; }); }

  function jump(id) {
    var marks = root.querySelectorAll('mark.hl[data-id="' + id + '"]');
    if (!marks.length) return;
    if (window.readerFlip) { window.readerFlip.reveal(marks[0]); } marks[0].scrollIntoView({ block: "center" });
    marks.forEach(function (m) { m.classList.add("flash"); });
    setTimeout(function () { marks.forEach(function (m) { m.classList.remove("flash"); }); }, 1600);
  }

  function step(dir) {
    var s = sorted();
    if (!s.length) return;
    if (idx >= s.length) idx = -1;
    if (idx < 0 && dir < 0) idx = 0;
    idx = (idx + dir + s.length) % s.length;
    jump(s[idx].id);
  }
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });

  function refresh() {
    listBtn.textContent = String(items.length); listBtn.setAttribute("aria-label", L.list);
    panel.textContent = ""; if (!items.length) { panel.style.display = "none"; listBtn.classList.remove("on"); try { window.dispatchEvent(new Event("resize")); } catch (e9) {} }
    if (!items.length) { return; }
    sorted().forEach(function (h) {
      var row = mk("div", "hl-row");
      var sw = mk("span", "hl-sw");
      sw.style.background = COLORS[h.color] || COLORS.yellow;
      var t = mk("button", "hl-text", h.text.length > 70 ? h.text.slice(0, 70) + "\u2026" : h.text);
      t.addEventListener("click", function () { jump(h.id); });
      var m = root.querySelector('mark.hl[data-id="' + h.id + '"]');
      var sh = m && m.closest(".reader-sheet");
      var pg = mk("span", "hl-pg", sh ? L.page + " " + sh.getAttribute("data-page") : "");
      var x = mk("button", "hl-x", "\u00D7");
      x.setAttribute("aria-label", L.del);
      x.addEventListener("click", function () { removeItem(h.id); });
      row.appendChild(sw); row.appendChild(t); row.appendChild(pg); row.appendChild(x);
      panel.appendChild(row);
    });
  }

  // ---------- popup (used when highlight mode is off) ----------
  var bar = document.createElement("div");
  bar.id = "hl-bar";
  var current = null;
  Object.keys(COLORS).forEach(function (c) {
    var b = document.createElement("button");
    b.style.background = COLORS[c];
    b.setAttribute("aria-label", c);
    b.addEventListener("mousedown", function (e) { e.preventDefault(); });
    b.addEventListener("click", function () { apply(c); });
    bar.appendChild(b);
  });
  var delBtn = document.createElement("button");
  delBtn.className = "del";
  delBtn.textContent = L.del;
  delBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
  delBtn.addEventListener("click", function () {
    if (current && current.id) removeItem(current.id);
    hide();
  });
  bar.appendChild(delBtn);
  document.body.appendChild(bar);

  function show(rect, withDelete) {
    delBtn.style.display = withDelete ? "" : "none";
    bar.style.display = "flex";
    var x = rect.left + window.scrollX + rect.width / 2 - bar.offsetWidth / 2;
    x = Math.max(8, Math.min(x, document.documentElement.clientWidth - bar.offsetWidth - 8));
    bar.style.left = x + "px";
    bar.style.top = rect.bottom + window.scrollY + 10 + "px";
  }
  function hide() { bar.style.display = "none"; current = null; }

  function apply(color) {
    if (!current) return;
    if (current.id) {
      items.forEach(function (h) { if (h.id === current.id) h.color = color; });
      root.querySelectorAll('mark.hl[data-id="' + current.id + '"]').forEach(function (m) { m.dataset.color = color; });
    } else {
      var r = current.range;
      var pre = document.createRange();
      pre.selectNodeContents(root);
      pre.setEnd(r.startContainer, r.startOffset);
      var start = pre.toString().length;
      var text = r.toString();
      var h = { id: "h" + Date.now(), start: start, end: start + text.length, text: text, color: color };
      items.push(h);
      wrap(h);
      window.getSelection().removeAllRanges();
    }
    save();
    refresh();
    hide();
  }

  function onSelect() {
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    var r = sel.getRangeAt(0);
    if (!root.contains(r.commonAncestorContainer) || !r.toString().trim()) return;
    current = { range: r.cloneRange() };
    if (mode) { apply(activeColor); } else { show(r.getBoundingClientRect(), false); }
  }

  var timer;
  document.addEventListener("selectionchange", function () {
    clearTimeout(timer);
    timer = setTimeout(onSelect, 250);
  });

  // Capture phase: runs before the bookmark click handler
  root.addEventListener("click", function (e) {
    var sel = window.getSelection();
    var m = e.target.closest ? e.target.closest("mark.hl") : null;
    if (m) {
      e.stopPropagation();
      if (sel.isCollapsed) {
        current = { id: m.dataset.id };
        show(m.getBoundingClientRect(), true);
      }
      return;
    }
    if (!sel.isCollapsed) { e.stopPropagation(); }
  }, true);

  document.addEventListener("click", function (e) {
    if (!bar.contains(e.target) && window.getSelection().isCollapsed) hide();
  });

  // FLOAT-TOOLBAR: compact, floating toolbar
  var st2 = document.createElement("style");
  st2.textContent = `
    mark.hl{background:#fff1a8}
    .hl-tools{position:sticky;top:6px;z-index:1000;gap:6px;margin:8px 0;padding:4px 8px;
      border:0;border-radius:18px;background:rgba(30,30,30,.93);color:#fff;font-size:12px;
      line-height:1.2;box-shadow:0 2px 10px rgba(0,0,0,.3);backdrop-filter:blur(6px)}
    .hl-btn{font-size:12px;padding:2px 9px;border-radius:999px;border-color:rgba(255,255,255,.35)}
    .hl-btn.on{background:rgba(255,255,255,.22)}
    .hl-dot{width:16px;height:16px;border-width:1px;border-color:rgba(255,255,255,.6)}
    .hl-dot.on{outline:2px solid #fff;outline-offset:1px}
    .hl-panel{max-height:30vh;font-size:12px;border-top:1px solid rgba(255,255,255,.2)}
    .hl-row{padding:3px 0;border-bottom-color:rgba(255,255,255,.12)}
  `;
  document.head.appendChild(st2);
  // FLOAT-BODY: put the toolbar directly in <body> so it always stays on screen
  document.body.appendChild(tools);
  if (typeof spacer !== "undefined" && spacer.parentNode) { spacer.parentNode.removeChild(spacer); }
  var st4 = document.createElement("style");
  st4.textContent = `
    .hl-tools{position:fixed !important;top:8px !important;left:50% !important;
      transform:translateX(-50%) !important;z-index:2147483000 !important;margin:0 !important}
  `;
  document.head.appendChild(st4);
  // FLOAT-SLOT: sits above the chapter title, floats when scrolled
  var titleEl = document.querySelector("#reader .post-title") || document.querySelector(".post-title") || root;
  var slot = document.createElement("div");
  slot.className = "hl-slot";
  titleEl.parentNode.insertBefore(slot, titleEl);
  var slotH = 0;
  function place() {
    if (panel.style.display !== "block") {
      slotH = tools.offsetHeight;
      slot.style.height = (slotH + 8) + "px";
    }
    var r = slot.getBoundingClientRect();
    tools.style.setProperty("top", Math.max(r.top, 8) + "px", "important");
    tools.style.setProperty("left", (r.left + r.width / 2) + "px", "important");
  }
  window.addEventListener("scroll", place, { passive: true });
  window.addEventListener("resize", place);
  listBtn.addEventListener("click", function () { setTimeout(place, 0); });
  place();
  setTimeout(place, 300);
  // ONE-LINE: keep the buttons on a single line on small screens
  var st5 = document.createElement("style");
  st5.textContent = `
    .hl-tools{gap:5px !important;padding:4px 7px !important}
    .hl-btn{white-space:nowrap;padding:2px 7px !important;font-size:11.5px !important}
    .hl-dot{flex:none}
  `;
  document.head.appendChild(st5);
  // MENU-HIDE: hide the toolbar while the chapter menu is open
  function syncMenu() {
    var openMenu = document.querySelector("details.reader-menu[open]");
    var sel = document.getElementById("reader-menu");
    var selOpen = sel && document.activeElement === sel;
    if (openMenu || selOpen) {
      tools.style.setProperty("display", "none", "important");
      hide();
    } else {
      tools.style.removeProperty("display");
    }
  }
  document.addEventListener("toggle", syncMenu, true);
  document.addEventListener("click", function () { setTimeout(syncMenu, 0); }, true);
  document.addEventListener("focusin", syncMenu);
  document.addEventListener("focusout", function () { setTimeout(syncMenu, 0); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setTimeout(syncMenu, 0); });
  syncMenu();
  // ONE-LINE-2: always a single row; the list opens as a panel under the bar
  modeBtn.textContent = "\u270E " + L.highlight;
  modeBtn.setAttribute("aria-label", L.highlight);
  var st6 = document.createElement("style");
  st6.textContent = `
    .hl-tools{flex-wrap:nowrap !important;width:max-content !important;max-width:96vw !important;
      gap:5px !important;padding:4px 8px !important}
    .hl-btn{white-space:nowrap !important;font-size:11.5px !important;padding:2px 8px !important}
    .hl-dot{flex:none !important}
    .hl-panel{position:absolute !important;top:100% !important;left:0 !important;right:0 !important;
      margin-top:6px !important;padding:6px 10px !important;border-radius:12px;
      background:rgba(30,30,30,.97) !important;box-shadow:0 4px 14px rgba(0,0,0,.35)}
  `;
  document.head.appendChild(st6);
  // BOOKMARK-BTN: bookmark ribbon in the toolbar, uses the reader's existing bookmark
  var bmBtn = mk("button", "hl-btn hl-bm");
  bmBtn.setAttribute("aria-label", "Bookmark");
  bmBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="display:block"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  tools.insertBefore(bmBtn, panel);

  function bmState() {
    var on = !!root.querySelector(".bookmarked");
    bmBtn.classList.toggle("on", on);
    bmBtn.querySelector("path").setAttribute("fill", on ? "currentColor" : "none");
  }
  bmBtn.addEventListener("click", function () {
    var topEdge = tools.getBoundingClientRect().bottom + 4;
    var existing = document.querySelector("#reader-content .bookmarked");
    if (existing) {
      var br = existing.getBoundingClientRect();
      if (br.bottom > topEdge && br.top < window.innerHeight) {
        window.getSelection().removeAllRanges();
        existing.click();
        return;
      }
    }
    var els = document.querySelectorAll("#reader-content p, #reader-content li, #reader-content blockquote");
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.height > 0 && r.bottom > topEdge + 10) {
        window.getSelection().removeAllRanges();
        if (!els[i].classList.contains("bookmarked")) { els[i].click(); }
        return;
      }
    }
  });
  new MutationObserver(bmState).observe(root, { attributes: true, attributeFilter: ["class"], subtree: true });
  bmState();
  setTimeout(bmState, 500);
  restore();
  refresh();
})();