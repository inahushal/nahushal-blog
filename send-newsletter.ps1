<#
Sends one article announcement to your Resend segment as a Broadcast.

Usage:
  .\send-newsletter.ps1 -Title "Article title" -Url "https://nahushal.com/post" -Excerpt "Two sentences about it." [-DryRun] [-Force]

Required environment variables (set in the same PowerShell window):
  $env:RESEND_API_KEY      = "re_..."   (Full access key)
  $env:RESEND_SEGMENT_ID   = "..."      (ID of the Nahushal Blog segment)
Optional:
  $env:NEWSLETTER_FROM     = "Nahushal <newsletter@nahushal.com>"
  $env:NEWSLETTER_REPLY_TO = "your-personal@email.com"
#>

param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$Url,
  [Parameter(Mandatory = $true)][string]$Excerpt,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$apiKey    = $env:RESEND_API_KEY
$segmentId = $env:RESEND_SEGMENT_ID
$from      = if ($env:NEWSLETTER_FROM) { $env:NEWSLETTER_FROM } else { "Nahushal <newsletter@nahushal.com>" }
$replyTo   = $env:NEWSLETTER_REPLY_TO

if (-not $DryRun -and (-not $apiKey -or -not $segmentId)) {
  Write-Error "Set RESEND_API_KEY and RESEND_SEGMENT_ID first."
}

# Guard against emailing the same article twice
$logPath = Join-Path $PSScriptRoot ".newsletter-sent.json"
$sent = @()
if (Test-Path $logPath) {
  $sent = @(Get-Content $logPath -Raw -Encoding UTF8 | ConvertFrom-Json)
}
if (-not $Force -and ($sent | Where-Object { $_.url -eq $Url })) {
  Write-Error "Already sent: $Url  (use -Force to send it again)"
}

$safeTitle   = [System.Net.WebUtility]::HtmlEncode($Title)
$safeExcerpt = [System.Net.WebUtility]::HtmlEncode($Excerpt)
$safeUrl     = [System.Net.WebUtility]::HtmlEncode($Url)

$html = @"
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;color:#111;">
  <p>Salam,</p>
  <p>I just published a new article on the blog:</p>
  <p><strong>$safeTitle</strong></p>
  <p>$safeExcerpt</p>
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

$subject = "New Article on Nahushal's Blog: $Title"

if ($DryRun) {
  Write-Host "From:    $from"
  Write-Host "Subject: $subject"
  Write-Host ""
  Write-Host $html
  return
}

function Invoke-Resend($path, $body) {
  $json  = $body | ConvertTo-Json -Depth 5
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)   # keeps the arrow and quotes intact
  try {
    Invoke-RestMethod -Method Post -Uri "https://api.resend.com$path" `
      -Headers @{ Authorization = "Bearer $apiKey" } `
      -ContentType "application/json; charset=utf-8" -Body $bytes
  } catch {
    $detail = $_.ErrorDetails.Message
    Write-Error "Resend error: $detail"
  }
}

# 1. Create the broadcast
$payload = @{
  segment_id = $segmentId
  from       = $from
  subject    = $subject
  html       = $html
  name       = "Article: $Title"
}
if ($replyTo) { $payload.reply_to = $replyTo }

$created = Invoke-Resend "/broadcasts" $payload
Write-Host "Broadcast created: $($created.id)"

# 2. Send it now
Invoke-Resend "/broadcasts/$($created.id)/send" @{} | Out-Null
Write-Host "Broadcast sent."

# 3. Remember it so it isn't sent twice
$sent += [pscustomobject]@{
  url         = $Url
  title       = $Title
  broadcastId = $created.id
  sentAt      = (Get-Date).ToString("o")
}
$sent | ConvertTo-Json -Depth 3 | Set-Content $logPath -Encoding UTF8
