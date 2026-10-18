$utf8 = New-Object System.Text.UTF8Encoding($false)
Copy-Item static\js\flip.js static\js\flip.js.before-focus -Force
$p = "$PWD\static\js\flip.js"
$j = [System.IO.File]::ReadAllText($p)

$a1 = 'H = Math.max(240, Math.floor(lastVH - TOP - BOTTOM));'
$b1 = 'H = Math.max(240, Math.floor(window.__flipFocus ? (lastVH - Math.max(0, view.getBoundingClientRect().top) - 82) : (lastVH - TOP - BOTTOM)));'
$a2 = '  function align() {'
$b2 = "  function align() {`r`n    if (window.__flipFocus) { try { window.scrollTo(0, 0); } catch (e) {} return; }"
$a3 = '  // ----- start -----'

$new = @'
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

'@

if ($j -match 'FLIP-FOCUS') {
  "Already added"
} elseif ($j.Contains($a1) -and $j.Contains($a2) -and $j.Contains($a3)) {
  $j = $j.Replace($a1, $b1).Replace($a2, $b2).Replace($a3, $new + "`r`n" + $a3)
  [System.IO.File]::WriteAllText($p, $j, $utf8)
  "Updated"
} else {
  "Could not find the places to patch in flip.js. Nothing changed."
  "layout line found: " + $j.Contains($a1)
  "align found: " + $j.Contains($a2)
  "start marker found: " + $j.Contains($a3)
}