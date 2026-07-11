$ErrorActionPreference = "Stop"

function Assert-Contains {
  param(
    [string]$Content,
    [string]$Needle,
    [string]$Message
  )

  if (-not $Content.Contains($Needle)) {
    throw $Message
  }
}

function Assert-NotContains {
  param(
    [string]$Content,
    [string]$Needle,
    [string]$Message
  )

  if ($Content.Contains($Needle)) {
    throw $Message
  }
}

$root = Split-Path -Parent $PSScriptRoot
$script = Get-Content -Raw -Encoding UTF8 (Join-Path $root "script.js")
$index = Get-Content -Raw -Encoding UTF8 (Join-Path $root "index.html")
$styles = Get-Content -Raw -Encoding UTF8 (Join-Path $root "styles.css")

Assert-Contains $script "function shouldRunHeroIntroAnimation()" "Missing hero animation guard"
Assert-Contains $script 'window.location.hash' "Hero animation guard must skip hash navigation"
Assert-Contains $script "window.scrollY" "Hero animation guard must check restored scroll position"
Assert-Contains $script "if (shouldRunHeroIntroAnimation())" "Hero animation setup must be guarded"
Assert-Contains $script 'is-hero-intro-pending' "Hero intro pending class must be cleared after animation setup"
Assert-Contains $script 'naklikayScrollY' "Missing saved scroll key"
Assert-Contains $script 'scrollRestoration' "Missing manual scroll restoration"
Assert-Contains $script 'pagehide' "Missing scroll save on pagehide"
Assert-Contains $script 'restoreSavedScrollPosition' "Missing saved scroll restore function"
Assert-Contains $index 'is-restoring-scroll' "Missing early scroll restore class in head"
Assert-Contains $index 'is-hero-intro-pending' "Missing early hero intro pending class in head"
Assert-NotContains $styles '.is-restoring-scroll .hero' "Scroll restore must not hide the whole hero portrait"
Assert-Contains $styles '.is-restoring-scroll .stats' "Scroll restore may hide text blocks, not the portrait"
Assert-Contains $styles '.is-restoring-scroll .intro' "Scroll restore may hide text blocks, not the portrait"
Assert-Contains $styles '.is-hero-intro-pending .stats strong' "Missing CSS to hide animated hero text before setup"

Write-Host "hero animation guard checks passed"
