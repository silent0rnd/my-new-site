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
$index = Get-Content -Raw -Encoding UTF8 (Join-Path $root "index.html")
$styles = Get-Content -Raw -Encoding UTF8 (Join-Path $root "styles.css")
$script = Get-Content -Raw -Encoding UTF8 (Join-Path $root "script.js")
$signature = Get-Content -Raw -Encoding UTF8 (Join-Path $root "images/signature/maxim-signature.svg")

Assert-Contains $index '<footer class="site-footer site-footer--contacts" id="contacts">' "Footer must be final contacts block with #contacts"
Assert-Contains $index 'href="mailto:direct@miroshnikov-maxim.ru"' "Footer missing mailto link"
Assert-Contains $index 'href="tel:+79604457203"' "Footer missing tel link"
Assert-Contains $index 'https://t.me/miroshnikov_maxim' "Footer missing Telegram link"
Assert-Contains $index '>Telegram: @miroshnikov_maxim</a>' "Footer Telegram link text is wrong"
Assert-NotContains $index '>telegram: @miroshnikov_maxim</a>' "Footer old Telegram link text must be removed"
Assert-Contains $index 'https://max.ru/u/f9LHodD0cOIgA7Bv0YjmbdPunU2SNMxoBHXbc-v6QicEIYa6pEGXQlYaqtE' "Footer missing Max link"
Assert-Contains $index '>MAX:' "Footer Max link text is wrong"
Assert-NotContains $index '>max:' "Footer old Max link text must be removed"
Assert-Contains $index 'site-footer__lead-highlight' "Footer lead first word must be wrapped for underline"
Assert-Contains $index 'images/signature/maxim-signature.svg' "Footer missing signature image path"
Assert-Contains $index 'site-footer__signature-caption' "Footer missing signature caption element"
Assert-Contains $index 'https://naklikay.ru/personal-data-consent/' "Footer missing absolute personal-data legal link"
Assert-Contains $index 'https://naklikay.ru/cookie-policy/' "Footer missing absolute cookie legal link"
Assert-Contains $index '>Cookie</a>' "Footer cookie link text must be Cookie"
Assert-NotContains $index 'Cookie Policy' "Footer cookie link text must not be Cookie Policy"

Assert-Contains $styles '.site-footer--contacts' "Styles missing contact footer modifier"
Assert-Contains $styles 'min-height: 72dvh;' "Footer missing desktop height"
Assert-Contains $styles '.site-footer--contacts .site-footer__inner' "Footer missing contacts inner block"
Assert-Contains $styles 'padding-left: 104px;' "Footer must share reviews left axis"
Assert-Contains $styles 'prefers-reduced-motion' "Footer missing reduced-motion override"
Assert-Contains $styles '@media (hover: hover) and (pointer: fine)' "Footer missing desktop-only hover"
Assert-Contains $styles '--footer-signature-x' "Footer signature must support cursor-based x movement"
Assert-Contains $styles '--footer-signature-y' "Footer signature must support cursor-based y movement"
Assert-Contains $styles '--footer-signature-rotate' "Footer signature must support cursor-based rotation"
Assert-Contains $styles '.site-footer__lead-highlight' "Footer lead highlight style is missing"

Assert-Contains $script 'moveFooterSignature' "Footer signature missing cursor move handler"
Assert-Contains $script 'pointermove' "Footer signature missing pointermove listener"
Assert-Contains $script 'pointerleave' "Footer signature missing pointerleave listener"
Assert-Contains $script 'siteFooterLeadHighlight' "Footer lead underline script is missing"
Assert-Contains $script 'footerLeadUnderlineObserver' "Footer lead underline observer is missing"

Assert-NotContains $index 'site-footer__spacer' "Footer text block must not be shifted by spacer column"
Assert-NotContains $styles 'grid-template-columns: minmax(0, 1fr) minmax(320px, 620px);' "Footer main must not use right-shift two-column layout"

if ($signature.Contains('fill="#FDFDFD"')) {
  throw "Signature SVG still has white background fill"
}

if (-not $signature.Contains("<svg")) {
  throw "Signature file must be a browser-readable SVG"
}

Write-Host "footer checks passed"
