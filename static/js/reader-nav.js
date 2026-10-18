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
    "@keyframes bkClose{from{transform:rotateY(168deg)}to{transform:rotateY(0deg)}}"
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

  var EXIT = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="display:block"><path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function build(tools) {
    if (tools.querySelector(".hl-nav")) { return; }
    var exit = document.createElement("button");
    exit.type = "button";
    exit.className = "hl-btn hl-nav";
    exit.setAttribute("aria-label", "Close book");
    exit.title = "Close book";
    exit.innerHTML = EXIT;
    exit.addEventListener("click", closeBook);
    tools.appendChild(exit);

    function fix() {
      var bm = tools.querySelector(".hl-bm");
      var a = exit.getBoundingClientRect();
      if (!bm || !a.width) { return; }
      exit.style.order = a.left < bm.getBoundingClientRect().left ? "-9" : "9";
    }
    exit.style.order = "9";
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