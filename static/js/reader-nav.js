(function () {
  "use strict";
  var HOME = /(^|\.)nahushal\.com$/.test(location.hostname) ? "https://kiyeveshi.nahushal.com/" : "/";

  var css = [
    ".hl-nav{display:inline-flex;align-items:center;justify-content:center;line-height:1}",
    ".bk-stage{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;background:rgba(12,12,12,.94);perspective:1500px;opacity:0;animation:bkFade .35s ease forwards}",
    ".bk-book{position:relative;width:min(42vw,260px);aspect-ratio:2/3;transform-style:preserve-3d;transform:translateX(-50%);animation:bkSlide 1.2s cubic-bezier(.45,.05,.25,1) .25s forwards}",
    ".bk-pages{position:absolute;inset:0;border-radius:6px 2px 2px 6px;background:#f4efe3;box-shadow:-3px 0 0 #e4dccb,-5px 0 0 #cfc6b2,0 18px 40px rgba(0,0,0,.55)}",
    ".bk-cover{position:absolute;inset:0;transform-origin:right center;transform-style:preserve-3d;transform:rotateY(168deg);animation:bkClose 1.2s cubic-bezier(.45,.05,.25,1) .25s forwards}",
    ".bk-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:6px 2px 2px 6px}",
    ".bk-front{background:#1d2b3a url(/images/book-cover.png) center/cover no-repeat;box-shadow:inset -6px 0 10px -6px rgba(0,0,0,.6)}",
    ".bk-back{transform:rotateY(180deg);background:#e9e0cc}",
    "@keyframes bkFade{to{opacity:1}}",
    "@keyframes bkSlide{from{transform:translateX(-50%)}to{transform:translateX(0)}}",
    "@keyframes bkClose{from{transform:rotateY(168deg)}to{transform:rotateY(0deg)}}",
    ".rd-menu{position:fixed;z-index:2147483100;left:50%;transform:translateX(-50%);width:min(92vw,380px);overflow-y:auto;box-sizing:border-box;margin:0;padding:.3rem;direction:rtl;background:#08262e;border:1px solid rgba(94,234,212,.35);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.45);display:none;-webkit-overflow-scrolling:touch}",
    ".rd-menu.open{display:block}",
    ".rd-menu a{display:block;padding:.7rem .9rem;color:#e6f4f1;text-decoration:none;border-radius:8px;line-height:1.6;font-size:1rem}",
    ".rd-menu a:hover,.rd-menu a.current{background:rgba(94,234,212,.15);color:#5eead4}"
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function closeBook() {
    if (document.querySelector(".bk-stage")) { return; }
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      location.href = HOME;
      return;
    }
    var s = document.createElement("div");
    s.className = "bk-stage";
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = '<div class="bk-book"><div class="bk-pages"></div><div class="bk-cover"><div class="bk-face bk-front"></div><div class="bk-face bk-back"></div></div></div>';
    document.body.appendChild(s);
    setTimeout(function () { location.href = HOME; }, 1750);
  }
  window.addEventListener("pageshow", function () {
    var s = document.querySelector(".bk-stage");
    if (s && s.parentNode) { s.parentNode.removeChild(s); }
  });

  function mkBtn(label, svg, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "hl-btn hl-nav";
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML = svg;
    b.addEventListener("click", onClick);
    return b;
  }

  var EXIT = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="display:block"><path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var DOTS = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="display:block"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';

  function buildPanel() {
    var src = document.querySelectorAll("nav.reader-bar details.reader-menu ul a");
    if (!src.length) { return null; }
    var p = document.createElement("div");
    p.className = "rd-menu";
    for (var i = 0; i < src.length; i++) {
      var a = document.createElement("a");
      a.href = src[i].getAttribute("href");
      a.textContent = src[i].textContent.trim();
      if (src[i].className.indexOf("current") > -1) { a.className = "current"; }
      p.appendChild(a);
    }
    ["touchstart", "touchmove", "touchend", "pointerdown", "pointermove", "pointerup", "wheel", "mousedown", "click"].forEach(function (ev) {
      p.addEventListener(ev, function (e) { e.stopPropagation(); });
    });
    document.body.appendChild(p);
    return p;
  }

  function build(tools) {
    if (tools.querySelector(".hl-nav")) { return; }
    var exit = mkBtn("Close book", EXIT, closeBook);
    var panel = buildPanel();
    var more = null;

    if (panel) {
      var closeMenu = function () { panel.classList.remove("open"); if (more) { more.classList.remove("on"); } };
      more = mkBtn("Chapters", DOTS, function () {
        if (panel.classList.contains("open")) { closeMenu(); return; }
        var top = tools.getBoundingClientRect().bottom + 8;
        panel.style.top = top + "px";
        panel.style.maxHeight = Math.max(160, window.innerHeight - top - 80) + "px";
        panel.classList.add("open");
        more.classList.add("on");
        var cur = panel.querySelector("a.current");
        if (cur) { panel.scrollTop = Math.max(0, cur.offsetTop - panel.clientHeight / 2 + cur.offsetHeight / 2); }
      });
      document.addEventListener("click", function (e) {
        if (panel.classList.contains("open") && !panel.contains(e.target) && !more.contains(e.target)) { closeMenu(); }
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); } });
    }

    tools.appendChild(exit);
    if (more) { tools.appendChild(more); }

    function order(flip) {
      exit.style.order = flip ? "9" : "-9";
      if (more) { more.style.order = flip ? "-9" : "9"; }
    }
    function fix() {
      if (!more) { return; }
      var a = exit.getBoundingClientRect(), b = more.getBoundingClientRect();
      if (!a.width || !b.width) { return; }
      order(a.left > b.left);
    }
    order(false);
    requestAnimationFrame(fix);
    setTimeout(fix, 300);
    setTimeout(fix, 1200);
    window.addEventListener("resize", fix);
  }

  var tries = 0;
  var iv = setInterval(function () {
    var t = document.querySelector(".hl-tools");
    if (t && t.querySelector(".hl-bm")) { clearInterval(iv); build(t); }
    else if (++tries > 80) { clearInterval(iv); }
  }, 100);
})();
/* First-visit demo v4: icon-style hands. Tap anywhere to close. */
(function () {
  "use strict";
  var KEY = "rd-demo-seen";
  if (!document.getElementById("reader-content")) { return; }
  try { if (localStorage.getItem(KEY)) { return; } } catch (e) {}

  var css = [
    ".rd-demo{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.3);touch-action:none;-webkit-user-select:none;user-select:none;opacity:0;animation:rdFade .3s ease forwards}",
    "@keyframes rdFade{to{opacity:1}}",
    ".rd-scene{position:absolute;left:0;right:0;top:50%;height:300px;margin-top:-150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;opacity:0}",
    ".rd-s1{animation:rdS1 7s infinite}",
    ".rd-s2{animation:rdS2 7s infinite}",
    "@keyframes rdS1{0%{opacity:0}5%,45%{opacity:1}50%,100%{opacity:0}}",
    "@keyframes rdS2{0%,50%{opacity:0}55%,95%{opacity:1}100%{opacity:0}}",
    ".rd-stage{position:relative;width:280px;height:140px}",
    ".rd-sw{position:absolute;left:65px;top:5px;opacity:0;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}",
    ".rd-a{animation:rdL 3.6s ease-in-out infinite}",
    ".rd-b{animation:rdR 3.6s ease-in-out infinite}",
    ".rd-b svg{transform:scaleX(-1)}",
    "@keyframes rdL{0%{transform:translateX(70px);opacity:0}8%{opacity:1}40%{transform:translateX(-70px);opacity:1}48%,100%{transform:translateX(-70px);opacity:0}}",
    "@keyframes rdR{0%,50%{transform:translateX(-70px);opacity:0}58%{opacity:1}90%{transform:translateX(70px);opacity:1}98%,100%{transform:translateX(70px);opacity:0}}",
    ".rd-hand{display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}",
    ".rd-idx,.rd-thumb{transform-box:fill-box;transform-origin:50% 100%}",
    ".rd-idx{animation:rdIdx 1.8s ease-in-out infinite}",
    ".rd-thumb{animation:rdThumb 1.8s ease-in-out infinite}",
    "@keyframes rdIdx{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-16deg)}}",
    "@keyframes rdThumb{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(26deg)}}",
    ".rd-letters{display:flex;direction:rtl;align-items:baseline;gap:16px;color:#fff;line-height:1;text-shadow:0 2px 10px rgba(0,0,0,.7);animation:rdGrow 1.8s ease-in-out infinite}",
    "@keyframes rdGrow{0%,100%{transform:scale(1.25)}50%{transform:scale(.85)}}"
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var S = 'fill="#fff" stroke="#000" stroke-width="5" stroke-linejoin="round"';
  function tip(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' + S + '/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 6) + '" fill="#e6e6e6"/>';
  }

  var HAND1 =
    '<svg viewBox="0 0 150 130" width="150" height="130">' +
    '<path d="M54 12C95 10 125 35 142 58C118 40 90 28 54 24Z" fill="#000"/>' +
    '<g ' + S + '>' +
    '<rect x="8" y="64" width="22" height="46" rx="11" transform="rotate(32 19 87)"/>' +
    '<rect x="30" y="50" width="60" height="72" rx="26"/>' +
    '<rect x="50" y="44" width="14" height="30" rx="7"/>' +
    '<rect x="64" y="42" width="14" height="30" rx="7"/>' +
    '<rect x="78" y="46" width="14" height="30" rx="7"/>' +
    '<rect x="32" y="16" width="18" height="76" rx="9"/>' +
    tip(41, 18, 13) +
    '</g></svg>';

  var HAND2 =
    '<svg class="rd-hand" viewBox="0 0 130 150" width="130" height="150"><g ' + S + '>' +
    '<rect x="36" y="82" width="62" height="62" rx="26"/>' +
    '<rect x="62" y="74" width="12" height="26" rx="6"/>' +
    '<rect x="74" y="76" width="12" height="26" rx="6"/>' +
    '<rect x="86" y="80" width="12" height="26" rx="6"/>' +
    '<g class="rd-idx"><rect x="66" y="16" width="18" height="90" rx="9"/>' + tip(75, 20, 13) + '</g>' +
    '<g class="rd-thumb"><rect x="26" y="52" width="18" height="66" rx="9"/>' + tip(35, 56, 12) + '</g>' +
    '</g></svg>';

  var d = document.createElement("div");
  d.className = "rd-demo";
  d.setAttribute("aria-hidden", "true");
  d.innerHTML =
    '<div class="rd-scene rd-s1"><div class="rd-stage">' +
    '<div class="rd-sw rd-a">' + HAND1 + '</div><div class="rd-sw rd-b">' + HAND1 + '</div></div></div>' +
    '<div class="rd-scene rd-s2"><div class="rd-letters"><span style="font-size:20px">\u0780</span><span style="font-size:30px">\u0781</span><span style="font-size:42px">\u0782</span></div>' + HAND2 + '</div>';

  function close() {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    if (d.parentNode) { d.parentNode.removeChild(d); }
  }
  ["touchstart", "touchmove", "touchend", "mousedown", "wheel"].forEach(function (ev) {
    d.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
  });
  d.addEventListener("pointerup", function (e) { e.stopPropagation(); close(); });
  d.addEventListener("click", function (e) { e.stopPropagation(); close(); });

  setTimeout(function () { document.body.appendChild(d); }, 700);
})();