$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$faviconPath = Join-Path $root "assets/avatar-donut.svg"
$faviconTag = '<link\s+rel="icon"\s+href="(?:/|(?:\.\./)+)assets/avatar-donut\.svg\?v=2"\s+type="image/svg\+xml"\s*/?>'
$doctypeBytes = [Text.Encoding]::ASCII.GetBytes("<!doctype html>")

function Test-BytePrefix {
  param(
    [byte[]]$Bytes,
    [byte[]]$Prefix,
    [int]$Offset = 0
  )

  if ($Bytes.Length -lt ($Offset + $Prefix.Length)) {
    return $false
  }

  for ($index = 0; $index -lt $Prefix.Length; $index++) {
    if ($Bytes[$Offset + $index] -ne $Prefix[$index]) {
      return $false
    }
  }

  return $true
}

$pages = Get-ChildItem -Path $root -Recurse -Filter "index.html" -File |
  Where-Object { $_.FullName -notmatch '\\(node_modules|tmp)\\' }

if (-not (Test-Path -LiteralPath $faviconPath)) {
  throw "Favicon file is missing: $faviconPath"
}

$invalid = foreach ($page in $pages) {
  $bytes = [System.IO.File]::ReadAllBytes($page.FullName)
  $doctypeOffset = if ($bytes.Length -ge $doctypeBytes.Length -and
    (Test-BytePrefix -Bytes $bytes -Prefix $doctypeBytes)) {
    0
  } elseif ($bytes.Length -ge ($doctypeBytes.Length + 3) -and
    $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF -and
    (Test-BytePrefix -Bytes $bytes -Prefix $doctypeBytes -Offset 3)) {
    3
  } else {
    -1
  }

  $html = [Text.Encoding]::UTF8.GetString($bytes)
  $head = [regex]::Match($html, '(?is)\A(?:\uFEFF)?<!doctype html>.*?<head\b[^>]*>(?<content>.*?)</head>')
  if ($doctypeOffset -lt 0 -or -not $head.Success -or $head.Groups['content'].Value -notmatch $faviconTag) {
    $page.FullName.Substring($root.Length + 1)
  }
}

if ($invalid) {
  throw "Every page must start with <!doctype html> and include the favicon in <head>:`n$($invalid -join "`n")"
}

Write-Host "Favicon check passed: $($pages.Count) pages"
