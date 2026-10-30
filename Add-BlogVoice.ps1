<#
.SYNOPSIS
    Generates a spoken audio version of each blog post and (optionally) adds an <audio> player to the post.

.DESCRIPTION
    Reads .md / .markdown / .html / .htm / .txt posts, strips markup and front matter,
    reads the text aloud with the built-in Windows voices (System.Speech) and saves one
    audio file per post. Posts that already have an up-to-date audio file are skipped.

.EXAMPLES
    # See which voices are installed
    .\Add-BlogVoice.ps1 -ListVoices

    # Make audio for every post
    .\Add-BlogVoice.ps1 -PostsPath .\content\posts -OutputPath .\static\audio

    # Pick a voice, slower speech, MP3 output (needs ffmpeg in PATH), and add the player to each post
    .\Add-BlogVoice.ps1 -PostsPath .\content\posts -OutputPath .\static\audio `
        -Voice "Microsoft Hedda Desktop" -Rate -1 -Mp3 -InjectPlayer -AudioUrlPrefix "/audio/"

    # Preview what would change in the posts
    .\Add-BlogVoice.ps1 -PostsPath .\content\posts -OutputPath .\static\audio -InjectPlayer -WhatIf
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$PostsPath,
    [string]$OutputPath = ".\audio",
    [string]$Voice,
    [ValidateRange(-10, 10)][int]$Rate = 0,
    [ValidateRange(0, 100)][int]$Volume = 100,
    [switch]$Mp3,
    [switch]$InjectPlayer,
    [string]$AudioUrlPrefix = "/audio/",
    [switch]$Force,
    [switch]$ListVoices
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

if ($ListVoices) {
    $synth.GetInstalledVoices() | ForEach-Object {
        $v = $_.VoiceInfo
        "{0}  [{1}, {2}]" -f $v.Name, $v.Culture.Name, $v.Gender
    }
    $synth.Dispose()
    return
}

if (-not $PostsPath) { throw "Please provide -PostsPath (or use -ListVoices)." }
if (-not (Test-Path $PostsPath)) { throw "Posts folder not found: $PostsPath" }
if (-not (Test-Path $OutputPath)) { New-Item -ItemType Directory -Path $OutputPath | Out-Null }

if ($Voice) { $synth.SelectVoice($Voice) }
$synth.Rate   = $Rate
$synth.Volume = $Volume

$ffmpeg = $null
if ($Mp3) {
    $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if (-not $ffmpeg) {
        Write-Warning "ffmpeg not found in PATH. Falling back to WAV files."
        $Mp3 = $false
    }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$marker    = "<!-- post-audio -->"

function ConvertTo-PlainText([string]$Raw) {
    $t = $Raw
    $t = $t -replace '(?s)\A\uFEFF?(---|\+\+\+)\r?\n.*?\r?\n\1\r?\n', ''       # YAML or TOML front matter
    $t = $t -replace '(?s)\{\{[<%].*?[>%]\}\}', ' '                      # Hugo shortcodes
    $t = $t -replace '(?s)```.*?```', ' '                                  # fenced code blocks
    $t = $t -replace '(?s)<!--.*?-->', ' '                                 # HTML comments
    $t = $t -replace '(?is)<(script|style|pre|code)\b.*?</\1>', ' '        # non-readable HTML blocks
    $t = $t -replace '<[^>]+>', ' '                                        # remaining HTML tags
    $t = [System.Net.WebUtility]::HtmlDecode($t)
    $t = $t -replace '!\[[^\]]*\]\([^)]*\)', ' '                           # markdown images
    $t = $t -replace '\[([^\]]+)\]\([^)]*\)', '$1'                         # markdown links -> link text
    $t = $t -replace '(?m)^\s{0,3}#{1,6}\s*', ''                           # markdown headings
    $t = $t -replace '(?m)^\s*[-+*]\s+', ''                                # bullets
    $t = $t -replace '[*_`>~|]+', ''                                       # leftover markdown symbols
    $t = $t -replace 'https?://\S+', ' '                                   # bare URLs
    $t = $t -replace '\s+', ' '
    return $t.Trim()
}

function Add-AudioPlayer([string]$Raw, [string]$Ext, [string]$Url) {
    $tag = "$marker<audio controls preload=`"none`" src=`"$Url`"></audio><!-- /post-audio -->"
    if ($Ext -in '.html', '.htm') {
        if ($Raw -match '(?i)</h1>') {
            return [regex]::Replace($Raw, '(?i)</h1>', "</h1>`n$tag", 1)
        }
        if ($Raw -match '(?i)<body[^>]*>') {
            return [regex]::Replace($Raw, '(?i)(<body[^>]*>)', "`$1`n$tag", 1)
        }
        return "$tag`n$Raw"
    }
    # Markdown / text: place after front matter if present, otherwise at the top
    $fm = [regex]::Match($Raw, '(?s)\A\uFEFF?(---|\+\+\+)\r?\n.*?\r?\n\1\r?\n')
    if ($fm.Success) {
        return $fm.Value + "`n$tag`n`n" + $Raw.Substring($fm.Length)
    }
    return "$tag`n`n$Raw"
}

$posts = Get-ChildItem -Path $PostsPath -Recurse -File |
         Where-Object { $_.Extension -in '.md', '.markdown', '.html', '.htm', '.txt' -and $_.BaseName -ne '_index' }

if (-not $posts) { Write-Warning "No posts found in $PostsPath"; $synth.Dispose(); return }

$done = 0; $skipped = 0; $failed = 0

foreach ($post in $posts) {
    $audioExt  = if ($Mp3) { ".mp3" } else { ".wav" }
    # Hugo page bundles: content\posts\my-post\index.md -> use the folder name
    $name      = if ($post.BaseName -eq 'index') { $post.Directory.Name } else { $post.BaseName }
    $audioFile = Join-Path $OutputPath ($name + $audioExt)

    try {
        $raw = Get-Content -LiteralPath $post.FullName -Raw -Encoding UTF8

        $upToDate = (Test-Path $audioFile) -and ((Get-Item $audioFile).LastWriteTime -gt $post.LastWriteTime)
        if ($upToDate -and -not $Force) {
            Write-Host "Skipping (audio up to date): $($post.Name)"
            $skipped++
        }
        else {
            $text = ConvertTo-PlainText $raw
            if ([string]::IsNullOrWhiteSpace($text)) {
                Write-Warning "No readable text in $($post.Name), skipping."
                $skipped++
                continue
            }

            Write-Host "Generating audio: $($post.Name)"
            $wav = Join-Path $OutputPath ($name + ".wav")
            $synth.SetOutputToWaveFile($wav)
            $synth.Speak($text)
            $synth.SetOutputToNull()

            if ($Mp3) {
                & $ffmpeg.Source -y -loglevel error -i $wav -codec:a libmp3lame -q:a 4 $audioFile
                if ($LASTEXITCODE -eq 0) { Remove-Item $wav -Force }
                else { throw "ffmpeg failed for $($post.Name)" }
            }
            $done++
        }

        if ($InjectPlayer -and ($raw -notlike "*$marker*")) {
            $url = ($AudioUrlPrefix.TrimEnd('/') + "/" + (Split-Path $audioFile -Leaf))
            if ($PSCmdlet.ShouldProcess($post.FullName, "Add audio player ($url)")) {
                $new = Add-AudioPlayer -Raw $raw -Ext $post.Extension.ToLower() -Url $url
                [System.IO.File]::WriteAllText($post.FullName, $new, $utf8NoBom)
            }
        }
    }
    catch {
        Write-Warning "Failed on $($post.Name): $($_.Exception.Message)"
        $failed++
        try { $synth.SetOutputToNull() } catch {}
    }
}

$synth.Dispose()
Write-Host ""
Write-Host "Done. Generated: $done  Skipped: $skipped  Failed: $failed"
Write-Host "Audio folder: $((Resolve-Path $OutputPath).Path)"
