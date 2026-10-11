Add-Type -AssemblyName System.Drawing
Set-Location D:\nahushal-blog
$srcDir = "static\images"
$outDir = Join-Path $srcDir "share"
New-Item -ItemType Directory -Force $outDir | Out-Null
$outFull = (Resolve-Path $outDir).Path
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$tw = 1200; $th = 630

Get-ChildItem $srcDir -File | Where-Object { $_.Extension -match '^\.(jpe?g|png)$' } | ForEach-Object {
    $out = Join-Path $outFull ($_.BaseName + ".jpg")
    try {
        $img = [System.Drawing.Image]::FromFile($_.FullName)
        $ratio = $img.Width / $img.Height
        $bmp = New-Object System.Drawing.Bitmap $tw, $th
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = 'HighQualityBicubic'

        if ($ratio -ge 1.5) {
            $mode = "crop"
            $scale = [Math]::Max($tw / $img.Width, $th / $img.Height)
            $g.Clear([System.Drawing.Color]::White)
        } else {
            $mode = "pad"
            $scale = [Math]::Min($tw / $img.Width, $th / $img.Height)
            $probe = New-Object System.Drawing.Bitmap $img
            $c = $probe.GetPixel(2, 2)
            $probe.Dispose()
            if ($c.A -lt 255) { $c = [System.Drawing.Color]::White }
            $g.Clear($c)
        }

        $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
        $g.DrawImage($img, [int](($tw - $w) / 2), [int](($th - $h) / 2), $w, $h)
        $g.Dispose(); $img.Dispose()

        $kb = 0; $used = 0
        foreach ($q in 85, 75, 65, 55, 45) {
            $p = New-Object System.Drawing.Imaging.EncoderParameters 1
            $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$q)
            if (Test-Path $out) { Remove-Item $out }
            $bmp.Save($out, $codec, $p)
            $kb = [math]::Round((Get-Item $out).Length / 1KB); $used = $q
            if ($kb -lt 280) { break }
        }
        $bmp.Dispose()
        $flag = if ($kb -ge 280) { "  <- still large" } else { "" }
        "{0,-48} {1,-5} {2,4} KB (q{3}){4}" -f $_.Name, $mode, $kb, $used, $flag
    } catch { "{0,-48} FAILED: {1}" -f $_.Name, $_.Exception.Message }
}