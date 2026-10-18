(function () {
  "use strict";
  var HOME = /(^|\.)nahushal\.com$/.test(location.hostname) ? "https://kiyeveshi.nahushal.com/" : "/";
  var TOC = location.pathname.replace(/\/[^\/]+\/?$/, "/");

  var css = [
    ".hl-nav{display:inline-flex;align-items:center;justify-content:center;line-height:1}",
    ".bk-stage{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;background:rgba(12,12,12,.94);perspective:1500px;opacity:0;animation:bkFade .35s ease forwards}",
    ".bk-book{position:relative;width:min(42vw,260px);aspect-ratio:2/3;transform-style:preserve-3d;transform:translateX(50%);animation:bkSlide 1.2s cubic-bezier(.45,.05,.25,1) .25s forwards}",
    ".bk-pages{position:absolute;inset:0;border-radius:2px 6px 6px 2px;background:#f4efe3;box-shadow:3px 0 0 #e4dccb,5px 0 0 #cfc6b2,0 18px 40px rgba(0,0,0,.55)}",
    ".bk-cover{position:absolute;inset:0;transform-origin:left center;transform-style:preserve-3d;transform:rotateY(-168deg);animation:bkClose 1.2s cubic-bezier(.45,.05,.25,1) .25s forwards}",
    ".bk-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:2px 6px 6px 2px}",
    ".bk-front{background:#1d2b3a url(/images/book-cover.png) center/cover no-repeat;box-shadow:inset 6px 0 10px -6px rgba(0,0,0,.6)}",
    ".bk-back{transform:rotateY(180deg);background:#e9e0cc}",
    "@keyframes bkFade{to{opacity:1}}",
    "@keyframes bkSlide{from{transform:translateX(50%)}to{transform:translateX(0)}}",
    "@keyframes bkClose{from{transform:rotateY(-168deg)}to{transform:rotateY(0deg)}}"
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

  var ARROW = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="display:block"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var BOOK = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="display:block"><path d="M6 3h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V3zM6 17a2 2 0 0 1 2-2h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

  function build(tools) {
    if (tools.querySelector(".hl-nav")) { return; }
    var back = mkBtn("Back to contents", ARROW, function () { location.href = TOC; });
    var exit = mkBtn("Close book", BOOK, closeBook);
    var rtl = getComputedStyle(tools).direction === "rtl";
    if (rtl) {
      tools.appendChild(back);
      tools.insertBefore(exit, tools.firstChild);
    } else {
      tools.insertBefore(back, tools.firstChild);
      tools.appendChild(exit);
    }
  }

  var tries = 0;
  var iv = setInterval(function () {
    var t = document.querySelector(".hl-tools");
    if (t && t.querySelector(".hl-bm")) { clearInterval(iv); build(t); }
    else if (++tries > 80) { clearInterval(iv); }
  }, 100);
})();