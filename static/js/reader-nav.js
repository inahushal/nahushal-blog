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
/* First-visit demo v7: traced icons. Tap anywhere to close. */
(function () {
  "use strict";
  var KEY = "rd-demo-seen";
  if (!document.getElementById("reader-content")) { return; }
  try { if (localStorage.getItem(KEY)) { return; } } catch (e) {}

  var css = [
    ".rd-demo{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.3);touch-action:none;-webkit-user-select:none;user-select:none;opacity:0;animation:rdFade .3s ease forwards}",
    "@keyframes rdFade{to{opacity:1}}",
    ".rd-scene{position:absolute;left:0;right:0;top:50%;height:300px;margin-top:-150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;opacity:0}",
    ".rd-s1{animation:rdS1 7s infinite}",
    ".rd-s2{animation:rdS2 7s infinite}",
    "@keyframes rdS1{0%{opacity:0}5%,45%{opacity:1}50%,100%{opacity:0}}",
    "@keyframes rdS2{0%,50%{opacity:0}55%,95%{opacity:1}100%{opacity:0}}",
    ".rd-stage{position:relative;width:300px;height:150px}",
    ".rd-sw{position:absolute;left:75px;top:2px;opacity:0;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}",
    ".rd-a{animation:rdL 3.6s ease-in-out infinite}",
    ".rd-b{animation:rdR 3.6s ease-in-out infinite}",
    ".rd-b svg{transform:scaleX(-1)}",
    "@keyframes rdL{0%{transform:translateX(70px);opacity:0}8%{opacity:1}40%{transform:translateX(-70px);opacity:1}48%,100%{transform:translateX(-70px);opacity:0}}",
    "@keyframes rdR{0%,50%{transform:translateX(-70px);opacity:0}58%{opacity:1}90%{transform:translateX(70px);opacity:1}98%,100%{transform:translateX(70px);opacity:0}}",
    ".rd-zoom{display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))}",
    ".rd-letters{display:flex;direction:rtl;align-items:baseline;gap:16px;color:#fff;line-height:1;text-shadow:0 2px 10px rgba(0,0,0,.7);animation:rdGrow 1.8s ease-in-out infinite}",
    "@keyframes rdGrow{0%,100%{transform:scale(1.25)}50%{transform:scale(.85)}}"
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var SWIPE =
    '<svg viewBox="120 90 460 450" width="150" height="147">' +
    '<path d="M560 275C470 215 380 175 270 162L270 128C380 128 480 190 560 275Z" fill="#000"/>' +
    '<g fill="#fff" stroke="#000" stroke-width="22" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M212 340L172 296Q146 296 142 326Q146 348 196 420Q245 515 320 515Q412 508 412 400V318Q408 286 380 286Q362 268 336 268Q312 248 288 248Q262 250 262 272V170H212Z"/>' +
    '<rect x="210" y="130" width="55" height="215" rx="27"/>' +
    '<circle cx="232" cy="150" r="44"/>' +
    '</g><circle cx="232" cy="150" r="24" fill="#e8e8e8"/></svg>';

  var ZOOM =
    '<svg class="rd-zoom" viewBox="190 140 560 600" width="140" height="150">' +
    '<g fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M425 432V205A35 45 0 0 1 495 205V405"/>' +
    '<path d="M495 405V340Q495 295 540 295Q580 295 580 335V405"/>' +
    '<path d="M580 345Q580 315 615 315Q650 315 650 350V405"/>' +
    '<path d="M650 370Q650 345 690 345Q722 350 722 385V540C722 640 650 715 555 715C500 715 460 690 430 660L228 458Q205 432 238 418Q282 402 322 437L350 462Q385 490 415 462Q425 450 425 432"/>' +
    '<path d="M222 350L355 217"/><path d="M280 212H360V292"/><path d="M212 280V358H292"/>' +
    '</g></svg>';

  var d = document.createElement("div");
  d.className = "rd-demo";
  d.setAttribute("aria-hidden", "true");
  d.innerHTML =
    '<div class="rd-scene rd-s1"><div class="rd-stage">' +
    '<div class="rd-sw rd-a">' + SWIPE + '</div><div class="rd-sw rd-b">' + SWIPE + '</div></div></div>' +
    '<div class="rd-scene rd-s2"><div class="rd-letters"><span style="font-size:20px">\u0780</span><span style="font-size:30px">\u0781</span><span style="font-size:42px">\u0782</span></div>' + ZOOM + '</div>';

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