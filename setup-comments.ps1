$p = "D:\nahushal-blog\layouts\single.html"
$c = [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8)
$anchor = '{{ partial "more-articles.html" . }}'
if ($c.Contains('comments.html')) {
    "single.html: already added"
} elseif (-not $c.Contains($anchor)) {
    "single.html: anchor line not found"
} else {
    $c = $c.Replace($anchor, '{{ partial "comments.html" . }}' + "`r`n  " + $anchor)
    [IO.File]::WriteAllText($p, $c, (New-Object Text.UTF8Encoding $false))
    "single.html: done"
}

$css = "D:\nahushal-blog\assets\css\style.css"
if ((Get-Content $css -Raw) -match '\.comment-list') {
    "style.css: comment styling already present"
} else {
    $rules = @'

/* Comments */
.comments { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--gold, #c9a227); }
.comment-list { list-style: none; margin: 0 0 2rem; padding: 0; }
.comment { padding: 0.9rem 1.1rem; margin-bottom: 0.8rem; border: 1px solid rgba(128,128,128,.35); border-radius: 10px; background: rgba(128,128,128,.08); }
.comment-head { display: flex; gap: .8rem; align-items: baseline; margin-bottom: .4rem; }
.comment-name { color: var(--gold, #c9a227); }
.comment-date { font-size: .85rem; opacity: .7; }
.comment-text { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
.comment-empty, .comment-note { opacity: .75; }
.comment-form label { display: block; margin: .8rem 0 .3rem; }
.comment-form input[type=text], .comment-form textarea { width: 100%; box-sizing: border-box; padding: .7rem .9rem; font: inherit; color: inherit; background: rgba(128,128,128,.12); border: 1px solid rgba(128,128,128,.5); border-radius: 8px; }
.comment-form textarea { min-height: 8rem; resize: vertical; }
.comment-form input:focus, .comment-form textarea:focus { outline: 2px solid var(--gold, #c9a227); outline-offset: 1px; }
.comment-form button { margin-top: 1rem; padding: .7rem 1.6rem; font: inherit; font-weight: bold; color: #1a1a1a; background: var(--gold, #c9a227); border: 0; border-radius: 8px; cursor: pointer; }
.comment-form button:disabled { opacity: .6; cursor: wait; }
#comment-status.ok { color: #4caf50; }
#comment-status.err { color: #e57373; }
'@
    Add-Content -Path $css -Encoding UTF8 -Value $rules
    "style.css: added"
}