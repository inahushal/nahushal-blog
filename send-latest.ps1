<#
Sends your latest Hugo post to the Resend segment as a Broadcast.

Run from D:\nahushal-blog:
  powershell -ExecutionPolicy Bypass -File .\send-latest.ps1 -DryRun     # preview only
  powershell -ExecutionPolicy Bypass -File .\send-latest.ps1             # really send

Optional:
  -Url "https://nahushal.com/posts/x/"   override the detected link
  -Subject "text"                        override the subject (default: the post title)
  -Force                                 send even if this link was already sent

Needs: $env:RESEND_API_KEY and $env:RESEND_SEGMENT_ID
Optional: $env:NEWSLETTER_FROM, $env:NEWSLETTER_REPLY_TO
#>

param(
  [string]$Url,
  [string]$Subject,
  [string]$BaseUrl,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8   # so Thaana shows correctly in the console

$root      = $PSScriptRoot
$apiKey    = $env:RESEND_API_KEY
$segmentId = $env:RESEND_SEGMENT_ID
$from      = if ($env:NEWSLETTER_FROM) { $env:NEWSLETTER_FROM } else { "Nahushal <newsletter@nahushal.com>" }
$replyTo   = $env:NEWSLETTER_REPLY_TO

if (-not $DryRun -and (-not $apiKey -or -not $segmentId)) {
  Write-Error "Set RESEND_API_KEY and RESEND_SEGMENT_ID first."
}

# ---------- find the latest published post ----------
$contentDir = Join-Path $root "content"
$posts = foreach ($f in Get-ChildItem $contentDir -Recurse -Filter *.md | Where-Object { $_.Name -notlike "_index*" }) {
  $raw = Get-Content $f.FullName -Raw -Encoding UTF8
  if ($raw -notmatch '(?s)^\uFEFF?---\s*\r?\n(.*?)\r?\n---\s*\r?\n?(.*)$') { continue }
  $fm   = $Matches[1]
  $body = $Matches[2]

  function Get-Field($name) {
    if ($fm -match "(?m)^$name\s*:\s*(.*?)\s*$") {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
    return ""
  }

  if ((Get-Field "draft") -eq "true") { continue }

  $date = $f.LastWriteTime
  $d = Get-Field "date"
  if ($d) { try { $date = [datetimeoffset]::Parse($d).UtcDateTime } catch {} }

  [pscustomobject]@{
    File        = $f
    Title       = Get-Field "title"
    Description = Get-Field "description"
    Slug        = Get-Field "slug"
    Date        = $date
    Body        = $body
  }
}

$post = $posts | Sort-Object Date -Descending | Select-Object -First 1
if (-not $post) { Write-Error "No published posts found in $contentDir" }
if (-not $post.Title) { Write-Error "Latest post has no title: $($post.File.FullName)" }

# ---------- build the link ----------
if (-not $Url) {
  if (-not $BaseUrl) {
    $toml = Join-Path $root "hugo.toml"
    $BaseUrl = "https://nahushal.com/"
    if (Test-Path $toml) {
      $t = Get-Content $toml -Raw -Encoding UTF8
      if ($t -match '(?m)^\s*baseURL\s*=\s*["'']([^"'']+)["'']') { $BaseUrl = $Matches[1] }
    }
  }
  $rel = $post.File.FullName.Substring($contentDir.Length).TrimStart('\','/') -replace '\\','/' -replace '\.md$',''
  if ($post.Slug) { $rel = (($rel -split '/')[0..(($rel -split '/').Count - 2)] + $post.Slug) -join '/' }
  $Url = ($BaseUrl.TrimEnd('/')) + "/" + $rel + "/"
}

# ---------- build the summary ----------
$excerpt = $post.Description
if (-not $excerpt) {
  $blocks = $post.Body -split '\r?\n\s*\r?\n'
  foreach ($b in $blocks) {
    $b = $b.Trim()
    if (-not $b -or $b.StartsWith("![") -or $b.StartsWith("#")) { continue }
    $b = $b -replace '!\[[^\]]*\]\([^)]*\)', '' -replace '\[([^\]]*)\]\([^)]*\)', '$1' -replace '[*_`>]', ''
    $b = ($b -replace '\s+', ' ').Trim()
    if ($b) { $excerpt = $b; break }
  }
}
if ($excerpt.Length -gt 250) {
  $cut = $excerpt.Substring(0, 250)
  $sp  = $cut.LastIndexOf(' ')
  if ($sp -gt 100) { $cut = $cut.Substring(0, $sp) }
  $excerpt = $cut + [char]0x2026
}

if (-not $Subject) { $Subject = $post.Title }

# ---------- don't email the same post twice ----------
$logPath = Join-Path $root ".newsletter-sent.json"
$sent = @()
if (Test-Path $logPath) { $sent = @(Get-Content $logPath -Raw -Encoding UTF8 | ConvertFrom-Json) }
if (-not $Force -and ($sent | Where-Object { $_.url -eq $Url })) {
  Write-Error "Already sent: $Url  (use -Force to send it again)"
}

$safeTitle   = [System.Net.WebUtility]::HtmlEncode($post.Title)
$safeExcerpt = [System.Net.WebUtility]::HtmlEncode($excerpt)
$safeUrl     = [System.Net.WebUtility]::HtmlEncode($Url)

$html = @"
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;color:#111;">
  <p>Salam,</p>
  <p>I just published a new article on the blog:</p>
  <h2 dir="auto" style="margin:16px 0 8px;">$safeTitle</h2>
  <p dir="auto">$safeExcerpt</p>
  <p><a href="$safeUrl">Read the article &rarr;</a></p>
  <p>Thanks for subscribing, it means a lot that you're here.</p>
  <p>Nahushal</p>
  <hr style="border:none;border-top:1px solid #ddd;margin:32px 0 16px;">
  <p style="font-size:12px;color:#666;">
    You're receiving this because you subscribed at nahushal.com.<br>
    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#666;">Unsubscribe</a>
  </p>
</div>
"@

if ($DryRun) {
  Write-Host "Post file: $($post.File.FullName)"
  Write-Host "From:      $from"
  Write-Host "Subject:   $Subject"
  Write-Host "Link:      $Url"
  Write-Host "Summary:   $excerpt"
  Write-Host ""
  Write-Host "Nothing was sent (dry run)."
  return
}

function Invoke-Resend($path, $body) {
  $json  = $body | ConvertTo-Json -Depth 5
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  try {
    Invoke-RestMethod -Method Post -Uri "https://api.resend.com$path" `
      -Headers @{ Authorization = "Bearer $apiKey" } `
      -ContentType "application/json; charset=utf-8" -Body $bytes
  } catch {
    Write-Error "Resend error: $($_.ErrorDetails.Message)"
  }
}

$bName = "Article: $($post.Title)"; if ($bName.Length -gt 70) { $bName = $bName.Substring(0, 67) + "..." }
$payload = @{
  segment_id = $segmentId
  from       = $from
  subject    = $Subject
  html       = $html
  name       = $bName
}
if ($replyTo) { $payload.reply_to = $replyTo }

$created = Invoke-Resend "/broadcasts" $payload
Write-Host "Broadcast created: $($created.id)"
Invoke-Resend "/broadcasts/$($created.id)/send" @{} | Out-Null
Write-Host "Broadcast sent: $Url"

$sent += [pscustomobject]@{
  url         = $Url
  title       = $post.Title
  broadcastId = $created.id
  sentAt      = (Get-Date).ToString("o")
}
$sent | ConvertTo-Json -Depth 3 | Set-Content $logPath -Encoding UTF8
