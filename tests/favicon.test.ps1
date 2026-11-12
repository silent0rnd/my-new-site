$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$faviconIcoPath = Join-Path $root "favicon.ico"
$faviconPngPath = Join-Path $root "favicon-32x32.png"
$faviconIcoTag = '<link\s+rel="icon"\s+href="(?:/|(?:\.\./)+)favicon\.ico"\s+sizes="any"\s*/?>'
$faviconPngTag = '<link\s+rel="icon"\s+href="(?:/|(?:\.\./)+)favicon-32x32\.png"\s+type="image/png"\s+sizes="32x32"\s*/?>'
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

if (-not (Test-Path -LiteralPath $faviconIcoPath)) {
  throw "Favicon file is missing: $faviconIcoPath"
}

if (-not (Test-Path -LiteralPath $faviconPngPath)) {
  throw "Favicon file is missing: $faviconPngPath"
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
  if ($doctypeOffset -lt 0 -or -not $head.Success -or
    $head.Groups['content'].Value -notmatch $faviconIcoTag -or
    $head.Groups['content'].Value -notmatch $faviconPngTag) {
    $page.FullName.Substring($root.Length + 1)
  }
}

if ($invalid) {
  throw "Every page must start with <!doctype html> and include the favicon in <head>:`n$($invalid -join "`n")"
}

Write-Host "Favicon check passed: $($pages.Count) pages"
