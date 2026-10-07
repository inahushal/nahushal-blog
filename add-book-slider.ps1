# Turns the Books page into a slider and adds the second book.
# Run AS A FILE from D:\nahushal-blog:   .\add-book-slider.ps1

$ErrorActionPreference = "Stop"
if (-not $PSScriptRoot) { Write-Error "Run this as a file, not by pasting it into PowerShell." }

$utf8    = New-Object System.Text.UTF8Encoding($false)
$layout  = Join-Path $PSScriptRoot "layouts\books\list.html"
$snippet = Join-Path $PSScriptRoot "book2-slide.html"
$cover   = Join-Path $PSScriptRoot "static\images\book-criminal-justice.jpg"

if (-not (Test-Path $layout))  { Write-Error "Not found: $layout" }
if (-not (Test-Path $snippet)) { Write-Error "Not found: $snippet (extract the zip into D:\nahushal-blog first)" }
if (-not (Test-Path $cover))   { Write-Error "Cover image missing: static\images\book-criminal-justice.jpg. Copy the cover there first." }

$html = [System.IO.File]::ReadAllText($layout, $utf8)
if ($html -match 'book-slider') { Write-Host "Slider already added. Nothing changed."; return }

$found = [regex]::Matches($html, '(?s)<article[^>]*>.*?</article>')
if ($found.Count -ne 1) { Write-Error "Expected exactly one <article> block in layouts\books\list.html but found $($found.Count). Nothing changed." }
$first = $found[0].Value
$open  = [regex]::Match($first, '^<article[^>]*>').Value

$second = [System.IO.File]::ReadAllText($snippet, $utf8).Trim().Replace('@@ARTICLE_OPEN@@', $open)

$css = @'
<style>
  .book-slider { position: relative; }
  .book-track { display: flex; align-items: flex-start; gap: 1.5rem; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .book-track::-webkit-scrollbar { display: none; }
  .book-slide { flex: 0 0 100%; min-width: 0; scroll-snap-align: start; }
  .book-controls { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1rem; }
  .book-arrow { width: 2.6rem; height: 2.6rem; border-radius: 50%; border: 1px solid var(--turquoise); background: transparent; color: var(--turquoise); font-size: 1.4rem; line-height: 1; cursor: pointer; }
  .book-arrow:hover, .book-arrow:focus { background: var(--turquoise); color: var(--lagoon-deep); }
  .book-dots { display: flex; gap: .5rem; }
  .book-dot { width: .7rem; height: .7rem; padding: 0; border: 0; border-radius: 50%; background: rgba(87, 226, 196, .3); cursor: pointer; }
  .book-dot.is-active { background: var(--turquoise-soft); }
</style>
'@

$controls = @'
<div class="book-controls">
  <button type="button" class="book-arrow" id="book-prev" aria-label="Previous book">&rsaquo;</button>
  <div class="book-dots">
    <button type="button" class="book-dot is-active" aria-label="Book 1"></button>
    <button type="button" class="book-dot" aria-label="Book 2"></button>
  </div>
  <button type="button" class="book-arrow" id="book-next" aria-label="Next book">&lsaquo;</button>
</div>
'@

$js = @'
<script>
(function () {
  var track = document.getElementById("book-track");
  if (!track) { return; }
  var slides = track.querySelectorAll(".book-slide");
  var dots = document.querySelectorAll(".book-dot");
  var current = 0;

  function go(i) {
    if (i < 0 || i >= slides.length) { return; }
    slides[i].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }
  function mark(i) {
    current = i;
    dots.forEach(function (d, n) { d.classList.toggle("is-active", n === i); });
  }

  document.getElementById("book-prev").addEventListener("click", function () { go(current - 1); });
  document.getElementById("book-next").addEventListener("click", function () { go(current + 1); });
  dots.forEach(function (d, n) { d.addEventListener("click", function () { go(n); }); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { mark(Array.prototype.indexOf.call(slides, e.target)); }
      });
    }, { root: track, threshold: 0.6 });
    slides.forEach(function (s) { io.observe(s); });
  }
})();
</script>
'@

$nl = if ($html.Contains("`r`n")) { "`r`n" } else { "`n" }
$new = $css + "`n" +
  '<div class="book-slider">' + "`n" +
  '<div class="book-track" id="book-track">' + "`n" +
  '<div class="book-slide">' + "`n" + $first + "`n" + '</div>' + "`n" +
  '<div class="book-slide">' + "`n" + $second + "`n" + '</div>' + "`n" +
  '</div>' + "`n" + $controls + "`n" + '</div>' + "`n" + $js
$new = $new -replace "`r?`n", $nl

Copy-Item $layout "$layout.before-book-slider" -Force
[System.IO.File]::WriteAllText($layout, $html.Replace($first, $new), $utf8)
Remove-Item $snippet -Force

Write-Host "Done. Books page is now a slider with 2 books."
Write-Host "Backup saved as: $layout.before-book-slider"
