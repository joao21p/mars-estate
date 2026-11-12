# Original Mars Estate vector artwork and local raster fallbacks. No downloads.
# Windows PowerShell / PowerShell on Windows; uses the built-in System.Drawing.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$brandRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$publicRoot = Join-Path $brandRoot 'public'
$socialRoot = Join-Path $publicRoot 'social'
[IO.Directory]::CreateDirectory($socialRoot) | Out-Null
$utf8 = New-Object Text.UTF8Encoding($false)

$mark = @'
  <rect width="64" height="64" rx="14" fill="#111014"/>
  <ellipse cx="32" cy="32" rx="28" ry="10" transform="rotate(-25 32 32)" fill="none" stroke="#805039" stroke-width="2.5"/>
  <circle cx="32" cy="32" r="17" fill="#cc8053"/>
  <circle cx="26" cy="27" r="4" fill="#b36544"/>
  <circle cx="37" cy="38" r="5" fill="#b36544"/>
  <path d="M4 32 A28 10 0 0 0 60 32" transform="rotate(-25 32 32)" fill="none" stroke="#edb98d" stroke-width="3" stroke-linecap="round"/>
'@
$iconSvg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <title>Mars Estate</title>
$mark
</svg>
"@
[IO.File]::WriteAllText((Join-Path $publicRoot 'favicon.svg'), $iconSvg, $utf8)

function Color([string]$hex) { return [Drawing.ColorTranslator]::FromHtml($hex) }
function Disc($g, [string]$hex, [single]$x, [single]$y, [single]$w, [single]$h) {
  $brush = [Drawing.SolidBrush]::new((Color $hex))
  try { $g.FillEllipse($brush, $x, $y, $w, $h) } finally { $brush.Dispose() }
}
function Stroke($g, [string]$hex, [single]$width, [single]$x1, [single]$y1, [single]$x2, [single]$y2) {
  $pen = [Drawing.Pen]::new((Color $hex), $width)
  try { $g.DrawLine($pen, $x1, $y1, $x2, $y2) } finally { $pen.Dispose() }
}
function Label($g, [string]$text, [single]$size, [single]$x, [single]$y, [string]$hex, [bool]$bold = $false) {
  $style = if ($bold) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular }
  $font = [Drawing.Font]::new('Arial', $size, $style, [Drawing.GraphicsUnit]::Pixel)
  $brush = [Drawing.SolidBrush]::new((Color $hex))
  try { $g.DrawString($text, $font, $brush, $x, $y) } finally { $font.Dispose(); $brush.Dispose() }
}
function Draw-Mark($g, [single]$x, [single]$y, [single]$size) {
  $state = $g.Save()
  try {
    $g.TranslateTransform($x, $y)
    $g.ScaleTransform($size / 64, $size / 64)
    $bg = [Drawing.Drawing2D.GraphicsPath]::new()
    $brush = [Drawing.SolidBrush]::new((Color '#111014'))
    try {
      $bg.AddArc(0,0,28,28,180,90); $bg.AddArc(36,0,28,28,270,90)
      $bg.AddArc(36,36,28,28,0,90); $bg.AddArc(0,36,28,28,90,90); $bg.CloseFigure()
      $g.FillPath($brush, $bg)
    } finally { $bg.Dispose(); $brush.Dispose() }
    $orbit = $g.Save()
    $pen = [Drawing.Pen]::new((Color '#805039'), 2.5)
    try {
      $g.TranslateTransform(32,32); $g.RotateTransform(-25); $g.TranslateTransform(-32,-32)
      $g.DrawEllipse($pen,4,22,56,20)
    } finally { $g.Restore($orbit); $pen.Dispose() }
    Disc $g '#cc8053' 15 15 34 34
    Disc $g '#b36544' 22 23 8 8
    Disc $g '#b36544' 32 33 10 10
    $orbit = $g.Save()
    $pen = [Drawing.Pen]::new((Color '#edb98d'), 3)
    $pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    try {
      $g.TranslateTransform(32,32); $g.RotateTransform(-25); $g.TranslateTransform(-32,-32)
      $g.DrawArc($pen,4,22,56,20,0,180)
    } finally { $g.Restore($orbit); $pen.Dispose() }
  } finally { $g.Restore($state) }
}

# Render large, then downsample so the 16/32/48 px marks retain a clear silhouette.
$master = [Drawing.Bitmap]::new(512,512)
$g = [Drawing.Graphics]::FromImage($master)
try {
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear((Color '#111014'))
  Draw-Mark $g 0 0 512
} finally { $g.Dispose() }
function Resize-Mark([int]$size) {
  $bitmap = [Drawing.Bitmap]::new($size,$size)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($master,0,0,$size,$size)
  } finally { $graphics.Dispose() }
  return $bitmap
}
foreach ($asset in @(@(32,'favicon-32x32.png'), @(180,'apple-touch-icon.png'))) {
  $bitmap = Resize-Mark $asset[0]
  try { $bitmap.Save((Join-Path $publicRoot $asset[1]), [Drawing.Imaging.ImageFormat]::Png) }
  finally { $bitmap.Dispose() }
}

# Multi-size ICO with standard 32-bit DIB entries, including legacy BMP-based readers.
$entries = @()
foreach ($size in @(16,32,48)) {
  $bitmap = Resize-Mark $size
  $memory = [IO.MemoryStream]::new()
  $writer = [IO.BinaryWriter]::new($memory)
  try {
    $maskLength = [int]([Math]::Ceiling($size / 32.0) * 4 * $size)
    $writer.Write([int]40); $writer.Write([int]$size); $writer.Write([int]($size * 2))
    $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([int]0)
    $writer.Write([int]($size * $size * 4 + $maskLength))
    foreach ($zero in 1..4) { $writer.Write([int]0) }
    for ($y = $size - 1; $y -ge 0; $y--) {
      for ($x = 0; $x -lt $size; $x++) {
        $pixel = $bitmap.GetPixel($x,$y)
        $writer.Write([byte]$pixel.B); $writer.Write([byte]$pixel.G)
        $writer.Write([byte]$pixel.R); $writer.Write([byte]255)
      }
    }
    $writer.Write([byte[]]::new($maskLength))
    $entries += @{ Size = $size; Bytes = $memory.ToArray() }
  } finally { $bitmap.Dispose(); $writer.Dispose(); $memory.Dispose() }
}
$file = [IO.File]::Create((Join-Path $publicRoot 'favicon.ico'))
$writer = [IO.BinaryWriter]::new($file)
try {
  $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$entries.Count)
  $offset = 6 + 16 * $entries.Count
  foreach ($entry in $entries) {
    $writer.Write([byte]$entry.Size); $writer.Write([byte]$entry.Size)
    $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([int]$entry.Bytes.Length); $writer.Write([int]$offset)
    $offset += $entry.Bytes.Length
  }
  foreach ($entry in $entries) { $writer.Write([byte[]]$entry.Bytes) }
} finally { $writer.Dispose(); $file.Dispose(); $master.Dispose() }

$ogSvg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <title>Mars Estate | Explore o impossível</title>
  <rect width="1200" height="630" fill="#111014"/>
  <path d="M40 40H1160V590H40Z" fill="none" stroke="#3a2d28"/>
  <g font-family="Arial, sans-serif">
    <text x="80" y="107" font-size="18" fill="#d79b73">MARS ESTATE / CADERNO DE EXPLORAÇÃO</text>
    <text x="80" y="253" font-size="66" fill="#f1e9df">Explore o</text>
    <text x="80" y="344" font-size="78" font-weight="700" fill="#edb98d">impossível.</text>
    <text x="80" y="416" font-size="23" fill="#b9ada4">Uma plataforma fictícia para explorar Marte</text>
    <text x="80" y="448" font-size="23" fill="#b9ada4">e comparar novos horizontes.</text>
    <text x="80" y="554" font-size="17" fill="#b9ada4">PROJETO DE PORTFÓLIO</text>
    <text x="948" y="554" font-size="17" fill="#d79b73">SIMULAÇÃO / 01</text>
  </g>
  <path d="M80 500H1120" stroke="#3a2d28"/>
  <g transform="translate(816 182) scale(4.5)">
$mark
  </g>
</svg>
"@
[IO.File]::WriteAllText((Join-Path $socialRoot 'mars-estate.svg'), $ogSvg, $utf8)
$bitmap = [Drawing.Bitmap]::new(1200,630)
$g = [Drawing.Graphics]::FromImage($bitmap)
try {
  $g.Clear((Color '#111014'))
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  Stroke $g '#3a2d28' 1 40 40 1160 40
  Stroke $g '#3a2d28' 1 40 590 1160 590
  Stroke $g '#3a2d28' 1 40 40 40 590
  Stroke $g '#3a2d28' 1 1160 40 1160 590
  Label $g 'MARS ESTATE / CADERNO DE EXPLORAÇÃO' 18 80 87 '#d79b73'
  Label $g 'Explore o' 66 76 183 '#f1e9df'
  Label $g 'impossível.' 78 76 260 '#edb98d' $true
  Label $g 'Uma plataforma fictícia para explorar Marte' 23 78 389 '#b9ada4'
  Label $g 'e comparar novos horizontes.' 23 78 421 '#b9ada4'
  Stroke $g '#3a2d28' 1 80 500 1120 500
  Label $g 'PROJETO DE PORTFÓLIO' 17 78 534 '#b9ada4'
  Label $g 'SIMULAÇÃO / 01' 17 946 534 '#d79b73'
  Draw-Mark $g 816 182 288
  $bitmap.Save((Join-Path $socialRoot 'mars-estate.png'), [Drawing.Imaging.ImageFormat]::Png)
} finally { $g.Dispose(); $bitmap.Dispose() }
Write-Output 'Generated original Mars Estate SVG, PNG, ICO and 1200x630 social artwork.'
