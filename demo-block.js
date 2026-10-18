/* First-visit demo v8: swipe and zoom icons in the same line style. Tap anywhere to close. */
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
    ".rd-sw{position:absolute;left:80px;top:0;opacity:0}",
    ".rd-a{animation:rdL 3.6s ease-in-out infinite}",
    ".rd-b{animation:rdR 3.6s ease-in-out infinite}",
    ".rd-b svg{transform:scaleX(-1)}",
    "@keyframes rdL{0%{transform:translateX(70px);opacity:0}8%{opacity:1}40%{transform:translateX(-70px);opacity:1}48%,100%{transform:translateX(-70px);opacity:0}}",
    "@keyframes rdR{0%,50%{transform:translateX(-70px);opacity:0}58%{opacity:1}90%{transform:translateX(70px);opacity:1}98%,100%{transform:translateX(70px);opacity:0}}",
    ".rd-ico{display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))}",
    ".rd-letters{display:flex;direction:rtl;align-items:baseline;gap:16px;color:#fff;line-height:1;text-shadow:0 2px 10px rgba(0,0,0,.7);animation:rdGrow 1.8s ease-in-out infinite}",
    "@keyframes rdGrow{0%,100%{transform:scale(1.25)}50%{transform:scale(.85)}}"
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var HAND =
    '<path d="M425 432V205A35 45 0 0 1 495 205V405"/>' +
    '<path d="M495 405V340Q495 295 540 295Q580 295 580 335V405"/>' +
    '<path d="M580 345Q580 315 615 315Q650 315 650 350V405"/>' +
    '<path d="M650 370Q650 345 690 345Q722 350 722 385V540C722 640 650 715 555 715C500 715 460 690 430 660L228 458Q205 432 238 418Q282 402 322 437L350 462Q385 490 415 462Q425 450 425 432"/>';

  var G = '<g fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">';
  var VB = 'viewBox="190 140 560 600" width="140" height="150"';

  var SWIPE =
    '<svg class="rd-ico" ' + VB + '>' + G + HAND +
    '<path d="M222 290H388"/><path d="M262 250L222 290L262 330"/><path d="M348 250L388 290L348 330"/>' +
    '</g></svg>';

  var ZOOM =
    '<svg class="rd-ico" ' + VB + '>' + G + HAND +
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