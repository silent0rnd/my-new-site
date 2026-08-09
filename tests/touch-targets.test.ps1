$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "styles.css")

function Assert-Match($value, $pattern, $message) {
  if ($value -notmatch $pattern) {
    throw $message
  }
}

Assert-Match $css '\.messenger-links a::after,[\s\S]*\.site-footer--contacts \.site-footer__contact-list a::after,[\s\S]*\.site-footer--contacts \.site-footer__legal a::after' "Mobile link hit areas are missing"
Assert-Match $css 'width:\s*max\(100%,\s*44px\);[\s\S]*height:\s*44px;' "Mobile links must have 44px hit areas"
Assert-Match $css '\.reviews-gallery__nav::after\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;' "Review navigation must have 44px hit areas"
Assert-Match $css '\.reviews-gallery__dot\s*\{[\s\S]*height:\s*44px;[\s\S]*background:\s*transparent;' "Review dots must have a 44px-high hit area"
Assert-Match $css '\.reviews-gallery__dot::before\s*\{[\s\S]*top:\s*29\.5px;[\s\S]*height:\s*3px;[\s\S]*background:\s*#c4c4bf;' "Review dot line must remain 3px high"
Assert-Match $css '\.reviews-gallery__dot\.is-active::before\s*\{[\s\S]*background:\s*#FF9800;' "Active review dot must retain the accent color"
Assert-Match $css '\.reviews-gallery__progress\s*\{[\s\S]*bottom:\s*0;' "Review dot progress must preserve its visual position"

Write-Output "touch target checks passed"
