$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$faviconPath = Join-Path $root "assets/avatar-donut.svg"
$faviconTag = '<link\s+rel="icon"\s+href="(?:/|(?:\.\./)+)assets/avatar-donut\.svg\?v=2"\s+type="image/svg\+xml"\s*/?>'
$pages = Get-ChildItem -Path $root -Recurse -Filter "index.html" -File |
  Where-Object { $_.FullName -notmatch '\\(node_modules|tmp)\\' }

if (-not (Test-Path -LiteralPath $faviconPath)) {
  throw "Favicon file is missing: $faviconPath"
}

$missing = foreach ($page in $pages) {
  $html = Get-Content -LiteralPath $page.FullName -Raw
  if ($html -notmatch $faviconTag) {
    $page.FullName.Substring($root.Length + 1)
  }
}

if ($missing) {
  throw "Favicon is required on every page. Missing tag on:`n$($missing -join "`n")"
}

Write-Host "Favicon check passed: $($pages.Count) pages"
