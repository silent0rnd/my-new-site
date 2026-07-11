$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$cssPath = Join-Path $root "styles.css"
$homeJsPath = Join-Path $root "script.js"
$dataPath = Join-Path $root "cases-data.js"
$caseJsPath = Join-Path $root "case-page.js"

$index = Get-Content -Raw -Encoding UTF8 -LiteralPath $indexPath
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath $cssPath
$homeJs = Get-Content -Raw -Encoding UTF8 -LiteralPath $homeJsPath
$data = Get-Content -Raw -Encoding UTF8 -LiteralPath $dataPath
$caseJs = Get-Content -Raw -Encoding UTF8 -LiteralPath $caseJsPath

function Assert-Match($value, $pattern, $message) {
  if ($value -notmatch $pattern) {
    throw $message
  }
}

function Assert-NotMatch($value, $pattern, $message) {
  if ($value -match $pattern) {
    throw $message
  }
}

function Assert-PathExists($path, $message) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw $message
  }
}

function Assert-PathMissing($path, $message) {
  if (Test-Path -LiteralPath $path) {
    throw $message
  }
}

$slugs = @(
  "yoga-qigong-telegram-ads",
  "medcenter-telegram-ads",
  "marketplace-managers-telegram-ads",
  "vpn-telegram-ads",
  "photoschool-scaling-yandex-direct",
  "confectioner-webinar-funnel-yandex-direct",
  "wickerwork-course-yandex-direct",
  "chef-live-streams-yandex-direct",
  "qigong-teacher-courses-yandex-direct",
  "master-campaign-online-education-yandex-direct",
  "massage-school-moscow-yandex-direct",
  "vastu-bot-launch-yandex-direct",
  "sensitive-18-funnel-yandex-direct",
  "house-construction-yandex-direct",
  "krasnogorsk-park-real-estate-yandex-direct",
  "moscow-studios-real-estate-yandex-direct",
  "vatutinki-park-commercial-real-estate-yandex-direct",
  "real-estate-agency-trade-in-yandex-direct",
  "industrial-crushers-supplier-yandex-direct",
  "ozon-yandex-market-partner-yandex-direct",
  "legal-consulting-yandex-direct",
  "business-setup-uae-yandex-direct",
  "stock-buyout-high-ticket-yandex-direct",
  "superfood-promotion-yandex-direct",
  "outdoor-advertising-yandex-direct",
  "construction-cabins-sales-yandex-direct",
  "norilsk-cargo-transport-yandex-direct",
  "kids-clothing-factory-yandex-direct",
  "sewing-production-organization-yandex-direct",
  "led-lighting-wholesale-yandex-direct",
  "strip-club-hiring-yandex-direct",
  "psychology-center-lipetsk-yandex-direct",
  "visa-services-yandex-direct",
  "crimea-taxi-fleet-yandex-direct",
  "pregnancy-photoshoots-yandex-direct",
  "saint-petersburg-tours-yandex-direct",
  "dental-prosthetics-moscow-yandex-direct",
  "doctor-dzidzaria-medical-service-yandex-direct",
  "dry-cleaning-chain-yandex-direct",
  "rybinsk-car-service-yandex-direct"
)

Assert-Match $index "cases-data\.js" "Cases data script missing on homepage"
Assert-Match $index "cases-showcase" "Cases showcase section missing"
Assert-Match $index "cases-title" "Cases title missing"
Assert-Match $index "cases-showcase__lead" "Cases subtitle missing"
Assert-Match $index "cases-showcase__lead-highlight" "Cases lead highlight missing"
Assert-Match $index "data-cases-grid" "Cases grid hook missing"
Assert-Match $index "data-cases-load-more" "Load more hook missing"
Assert-Match $index "data-case-filter=`"all`"" "All cases filter missing"
Assert-Match $index "data-case-filter=`"tg-ads`"" "TG Ads filter missing"
if ($index.IndexOf('<section class="about"') -gt $index.IndexOf('<section class="cases-showcase"')) {
  throw "About block must be above cases block"
}

foreach ($slug in $slugs) {
  Assert-Match $data $slug "Case data missing $slug"
  $pagePath = Join-Path $root "cases\$slug\index.html"
  Assert-PathExists $pagePath "Case page missing $slug"
  $page = Get-Content -Raw -Encoding UTF8 -LiteralPath $pagePath
  Assert-Match $page "data-case-slug=`"$slug`"" "Case page slug hook missing $slug"
  Assert-Match $page "case-back-link" "Back link missing $slug"
  Assert-Match $page "../../cases-data\.js" "Case data script missing $slug"
  Assert-Match $page "../../case-page\.js" "Case page script missing $slug"
  Assert-NotMatch $page ([char]0x2014) "Case page contains long dash $slug"
}

Assert-NotMatch $index ([char]0x2014) "Homepage contains long dash"
Assert-NotMatch $css ([char]0x2014) "CSS contains long dash"
Assert-NotMatch $homeJs ([char]0x2014) "Homepage JS contains long dash"
Assert-NotMatch $data ([char]0x2014) "Case data contains long dash"
Assert-NotMatch $caseJs ([char]0x2014) "Case page JS contains long dash"
Assert-PathExists (Join-Path $root "assets\cases\yoga-qigong-telegram-ads-1.jpg") "Yoga case image missing"
Assert-PathExists (Join-Path $root "assets\cases\medcenter-telegram-ads-1.png") "Medcenter case image missing"
Assert-PathExists (Join-Path $root "assets\cases\marketplace-managers-telegram-ads-1.jpg") "Marketplace case image missing"
Assert-PathExists (Join-Path $root "assets\cases\vpn-telegram-ads-1.png") "VPN case image missing"
Assert-PathExists (Join-Path $root "assets\cases\vpn-telegram-ads-2.png") "VPN second image missing"
Assert-PathMissing (Join-Path $root "cases\index.html") "Separate /cases catalog must not exist"

Assert-Match $data "category:\s*`"tg-ads`"" "TG Ads category missing"
Assert-Match $data "categoryLabel:\s*`"TG Ads`"" "TG Ads label missing"
Assert-Match $data "channel:\s*`"Telegram Ads`"" "Telegram Ads channel missing"
Assert-Match $data 'category:\s*"education"' "Education category missing"
Assert-Match $data 'category:\s*"real-estate"' "Real estate category missing"
Assert-Match $data 'category:\s*"b2b"' "B2B category missing"
Assert-Match $data 'category:\s*"b2c"' "B2C category missing"
$yandexDirectLabel = -join ([char[]](0x042F, 0x043D, 0x0434, 0x0435, 0x043A, 0x0441, 0x002E, 0x0414, 0x0438, 0x0440, 0x0435, 0x043A, 0x0442))
Assert-Match $data ([regex]::Escape($yandexDirectLabel)) "Yandex Direct channel missing"
Assert-Match $caseJs 'getCaseTitleSuffix' "Case title suffix helper missing"
Assert-Match $caseJs ([regex]::Escape($yandexDirectLabel)) "Yandex Direct title suffix missing"
Assert-Match $caseJs 'document\.title' "Document title assignment missing"
Assert-Match $caseJs 'getCaseTitleSuffix\(currentCase\)' "Document title must use category-aware suffix"
$sourceMaterialResultPhrase = -join ([char[]](0x0412, 0x0020, 0x0438, 0x0441, 0x0445, 0x043E, 0x0434, 0x043D, 0x043E, 0x043C, 0x0020, 0x043C, 0x0430, 0x0442, 0x0435, 0x0440, 0x0438, 0x0430, 0x043B, 0x0435, 0x0020, 0x0437, 0x0430, 0x0444, 0x0438, 0x043A, 0x0441, 0x0438, 0x0440, 0x043E, 0x0432, 0x0430, 0x043D, 0x0020, 0x0440, 0x0435, 0x0437, 0x0443, 0x043B, 0x044C, 0x0442, 0x0430, 0x0442))
$sourceGuideFact = -join ([char[]](0x041E, 0x0441, 0x043D, 0x043E, 0x0432, 0x0430, 0x0020, 0x0434, 0x0430, 0x043D, 0x043D, 0x044B, 0x0445, 0x003A, 0x0020, 0x0438, 0x0441, 0x0445, 0x043E, 0x0434, 0x043D, 0x044B, 0x0439, 0x0020, 0x043A, 0x0435, 0x0439, 0x0441, 0x0020, 0x0438, 0x0437, 0x0020, 0x0441, 0x043F, 0x0440, 0x0430, 0x0432, 0x043E, 0x0447, 0x043D, 0x0438, 0x043A, 0x0430))
$guidebookWord = -join ([char[]](0x0441, 0x043F, 0x0440, 0x0430, 0x0432, 0x043E, 0x0447, 0x043D, 0x0438, 0x043A))
Assert-NotMatch $data ([regex]::Escape($sourceMaterialResultPhrase)) "Generated case intro must not duplicate the case result"
Assert-NotMatch $data ([regex]::Escape($sourceGuideFact)) "Generated case facts must not mention source guide"
Assert-NotMatch $data ([regex]::Escape($guidebookWord)) "Case pages must not mention a guidebook"
Assert-Match $data "71[\s\S]*1\.3" "Yoga short result missing"
Assert-Match $data "id:\s*`"medcenter-telegram-ads`"[\s\S]*shortResult:\s*`"[^`"]*2" "Medcenter short result missing"
Assert-NotMatch $data "id:\s*`"medcenter-telegram-ads`"[\s\S]*shortResult:\s*`"62" "Medcenter short result must not include count"
Assert-Match $data "1,4" "Marketplace short result missing"
Assert-Match $data "800" "VPN short result missing"
$vpnServiceTitle = -join ([char[]](0x041F, 0x0440, 0x043E, 0x0434, 0x0432, 0x0438, 0x0436, 0x0435, 0x043D, 0x0438, 0x0435, 0x0020, 0x0056, 0x0050, 0x004E, 0x002D, 0x0441, 0x0435, 0x0440, 0x0432, 0x0438, 0x0441, 0x0430))
$suryaTitle = -join ([char[]](0x041A, 0x0443, 0x0440, 0x0441, 0x044B, 0x0020, 0x043F, 0x043E, 0x0020, 0x0439, 0x043E, 0x0433, 0x0435, 0x0020, 0x0421, 0x0443, 0x0440, 0x044C, 0x044F, 0x0020, 0x041D, 0x0430, 0x043C, 0x0430, 0x0441, 0x043A, 0x0430, 0x0440))
$vastuTitle = -join ([char[]](0x041E, 0x0431, 0x0443, 0x0447, 0x0435, 0x043D, 0x0438, 0x0435, 0x0020, 0x0412, 0x0430, 0x0441, 0x0442, 0x0443, 0x002E, 0x0020, 0x0422, 0x0440, 0x0430, 0x0444, 0x0438, 0x043A, 0x0020, 0x043D, 0x0430, 0x0020, 0x0431, 0x043E, 0x0442))
$cpaResult = -join ([char[]](0x0421, 0x043D, 0x0438, 0x0437, 0x0438, 0x043B, 0x0438, 0x0020, 0x0043, 0x0050, 0x0041, 0x0020, 0x0432, 0x0020, 0x0032, 0x0020, 0x0440, 0x0430, 0x0437, 0x0430))
$moscowLeadResult = -join ([char[]](0x0035, 0x0032, 0x0038, 0x20BD, 0x0020, 0x0437, 0x0430, 0x0020, 0x043B, 0x0438, 0x0434, 0x0020, 0x0432, 0x0020, 0x041C, 0x043E, 0x0441, 0x043A, 0x0432, 0x0435))
$legalBudgetResult = -join ([char[]](0x041B, 0x0438, 0x0434, 0x044B, 0x0020, 0x043E, 0x0442, 0x0020, 0x0031, 0x0035, 0x0030, 0x20BD, 0x0020, 0x043F, 0x0440, 0x0438, 0x0020, 0x0431, 0x044E, 0x0434, 0x0436, 0x0435, 0x0442, 0x0435, 0x0020, 0x0431, 0x043E, 0x043B, 0x0435, 0x0435, 0x0020, 0x0031, 0x0038, 0x0020, 0x043C, 0x043B, 0x043D, 0x0020, 0x0440, 0x0443, 0x0431, 0x043B, 0x0435, 0x0439))
$rubRoot = -join ([char[]](0x0440, 0x0443, 0x0431))
$rubLya = -join ([char[]](0x043B, 0x044F))
$rubLey = -join ([char[]](0x043B, 0x0435, 0x0439))
$rubleSign = [char]0x20BD
$euroSign = [char]0x20AC
Assert-Match $data ([regex]::Escape($vpnServiceTitle)) "VPN title must include service"
Assert-Match $data ([regex]::Escape($suryaTitle)) "Surya Namaskar title missing"
Assert-Match $data ([regex]::Escape($vastuTitle)) "Vastu bot title missing"
Assert-Match $data ([regex]::Escape($cpaResult)) "House construction result must use CPA wording"
Assert-Match $data ([regex]::Escape($moscowLeadResult)) "Moscow real estate result must use ruble sign"
Assert-Match $data ([regex]::Escape($legalBudgetResult)) "Legal consulting result must keep 18 mln rubley exception"
Assert-NotMatch $data ("\d[\s\u00A0]+" + $rubRoot + "(\.|" + $rubLya + "|" + $rubLey + ")") "Numeric ruble amounts must use ruble sign without a space"
Assert-NotMatch $data ("\d[\s\u00A0]+" + [regex]::Escape($rubleSign)) "Ruble sign must stay next to the number"
Assert-NotMatch $data ("\d[\s\u00A0]+" + [regex]::Escape($euroSign)) "Euro sign must stay next to the number"

Assert-Match $homeJs "const caseFilters" "Case filters hook missing"
Assert-Match $homeJs "casesLeadHighlight" "Cases lead underline hook missing"
Assert-Match $homeJs "casesLeadUnderlineObserver" "Cases lead underline observer missing"
Assert-Match $homeJs "renderCases" "Homepage cases render function missing"
Assert-Match $homeJs "visibleCaseCount = 4" "Visible case count must reset to 4"
Assert-Match $homeJs "case-card" "Case card render missing"
Assert-Match $homeJs "case-card-reveal" "Case reveal wrapper missing"
Assert-Match $homeJs "case-card-orange-border" "Case orange border SVG missing"
Assert-Match $homeJs "case-card-orange-border-line" "Case orange border line missing"
Assert-Match $homeJs "case-card-orange-border-line--top" "Top orange border line missing"
Assert-Match $homeJs "case-card-orange-border-line--right" "Right orange border line missing"
Assert-Match $homeJs "observeCaseCards" "Case reveal observer function missing"
Assert-Match $homeJs "appendCaseCards" "Load more must append new case cards instead of rebuilding the whole grid"
Assert-Match $homeJs "updateCasesControls" "Cases controls update helper missing"
Assert-Match $homeJs "appendCaseCards\(filteredCases\.slice\(previousVisibleCount, visibleCaseCount\), previousVisibleCount\)" "Load more must append only newly visible case cards"
Assert-NotMatch $homeJs "visibleCaseCount \+= 6;\s*renderCases\(\)" "Load more must not rerender the whole grid"
Assert-Match $homeJs "IntersectionObserver" "Homepage case reveal observer missing"
Assert-Match $homeJs "is-visible" "Case reveal visible class missing"
Assert-Match $homeJs "rotateX" "Desktop card tilt missing"
Assert-Match $homeJs "prefers-reduced-motion" "Homepage reduced motion check missing"
Assert-Match $caseJs "getRelatedCases" "Related cases function missing"
Assert-Match $caseJs "caseItem\.slug !== currentCase\.slug" "Related cases must exclude current case"
Assert-NotMatch $caseJs "related-list[\s\S]{0,220}keydown" "AnimatedList must not use keyboard navigation"
Assert-Match $caseJs "IntersectionObserver" "AnimatedList reveal animation missing"
Assert-Match $caseJs "prefers-reduced-motion" "Case page reduced motion check missing"
Assert-Match $caseJs "initRelatedCasesHover" "Related cases hover initializer missing"
Assert-Match $caseJs "querySelectorAll\(`"\.related-card`"\)" "Related cases hover must reuse related-card class"
Assert-Match $caseJs "matchMedia\(`"\(hover: hover\) and \(pointer: fine\)`"\)" "Related cases hover must be desktop pointer only"
Assert-Match $caseJs "--related-hover-x" "Related cases hover X variable missing"
Assert-Match $caseJs "Math\.max\(0, \(relativeX - 0\.5\) \* 3\)" "Related cases hover must not move cards left into the title column"
Assert-Match $caseJs "--related-hover-rotate-y" "Related cases hover Y rotation variable missing"
Assert-Match $caseJs "requestAnimationFrame" "Related cases hover must throttle pointer movement"
$galleryTitle = -join ([char[]](0x0421, 0x043A, 0x0440, 0x0438, 0x043D, 0x0448, 0x043E, 0x0442, 0x044B))
$oldGalleryTitle = -join ([char[]](0x0418, 0x0437, 0x043E, 0x0431, 0x0440, 0x0430, 0x0436, 0x0435, 0x043D, 0x0438, 0x044F, 0x0020, 0x0438, 0x0020, 0x0441, 0x043A, 0x0440, 0x0438, 0x043D, 0x0448, 0x043E, 0x0442, 0x044B))
Assert-Match $caseJs ([regex]::Escape($galleryTitle)) "Gallery title must be Screenshots"
Assert-NotMatch $caseJs ([regex]::Escape($oldGalleryTitle)) "Old gallery title must be removed"
Assert-Match $caseJs "renderCoverflowGallery" "3D coverflow gallery render function missing"
Assert-Match $caseJs "createGalleryItems" "Gallery items mapper missing"
Assert-Match $caseJs "currentCase\.images\.map" "Gallery must use current case images"
Assert-Match $caseJs "updateCoverflowGallery" "3D coverflow update function missing"
Assert-Match $caseJs "setCoverflowIndex" "3D coverflow active index function missing"
Assert-Match $caseJs "bindCoverflowHoverTilt" "Gallery hover tilt binding missing"
Assert-Match $caseJs "case-gallery__stage" "Gallery 3D stage missing"
Assert-Match $caseJs "case-gallery__button" "Gallery screenshots must be clickable buttons"
Assert-Match $caseJs "data-lightbox-index" "Gallery buttons must store lightbox index"
Assert-Match $caseJs "case-gallery__nav--prev" "Gallery previous control missing"
Assert-Match $caseJs "case-gallery__nav--next" "Gallery next control missing"
Assert-Match $caseJs "case-gallery__progress" "Gallery progress indicator missing"
Assert-Match $caseJs "COVERFLOW_TRANSITION_MS\s*=\s*640" "Gallery transition timing must be centralized around 640ms"
Assert-Match $caseJs "COVERFLOW_WHEEL_THRESHOLD\s*=\s*18" "Gallery wheel threshold must prevent accidental multi-slide jumps"
Assert-Match $caseJs "gallery\.dataset\.isAnimating" "Gallery must guard rapid repeated navigation while animating"
Assert-Match $caseJs "pointermove" "Gallery hover tilt must follow pointer movement"
Assert-Match $caseJs "button\.addEventListener\(`"click`", \(\) => openLightbox" "Gallery click must open screenshot in lightbox"
Assert-NotMatch $caseJs "bindCoverflowDrag" "Gallery drag binding must be removed"
Assert-NotMatch $caseJs "COVERFLOW_DRAG_THRESHOLD" "Gallery drag threshold must be removed"
Assert-NotMatch $caseJs "pressedGalleryButton" "Gallery pressed drag state must be removed"
Assert-NotMatch $caseJs "dragDelta" "Gallery drag delta must be removed"
Assert-NotMatch $caseJs "is-dragging" "Gallery dragging class must be removed from JS"
Assert-Match $caseJs "--tilt-rotate-x" "Gallery hover tilt X variable missing"
Assert-NotMatch $caseJs "--tilt-glare-x" "Gallery hover glare must be removed"
Assert-Match $caseJs "wheel" "Gallery wheel navigation missing"
Assert-Match $caseJs "--coverflow-transform" "Gallery items must receive 3D transform CSS variable"
Assert-Match $caseJs "button\.parentElement\.style\.zIndex\s*=\s*button\.style\.zIndex" "Gallery active item must be layered above side items for reliable lightbox clicks"
Assert-Match $caseJs "openLightbox" "Lightbox open function missing"
Assert-Match $caseJs "closeLightbox" "Lightbox close function missing"
Assert-Match $caseJs "showLightboxImage" "Lightbox navigation function missing"
Assert-Match $caseJs "case-lightbox" "Lightbox markup class missing"
Assert-Match $caseJs "case-lightbox__button--prev" "Lightbox previous arrow missing"
Assert-Match $caseJs "case-lightbox__button--next" "Lightbox next arrow missing"
Assert-Match $caseJs "case-lightbox__close" "Lightbox close button missing"
Assert-Match $caseJs "handleLightboxKeydown" "Lightbox keyboard handler missing"
Assert-Match $caseJs "addEventListener" "Lightbox keyboard listener missing"

$casesSectionPattern = "\.cases-showcase\s*\{[\s\S]*background:\s*var\(--bg\)"
$casesInnerPattern = "\.cases-showcase__inner\s*\{[\s\S]*max-width:\s*1180px[\s\S]*padding-left:\s*104px"
$caseCardBorderPattern = "\.case-card\s*\{[\s\S]*border:\s*2px solid var\(--line\)"
$caseCardRadiusPattern = "\.case-card\s*\{[\s\S]*border-radius:\s*8px"
$caseRevealPerspectivePattern = "\.case-card-reveal\s*\{[\s\S]*perspective:\s*1200px"
$caseRevealPattern = "\.case-card-reveal\s*\{[\s\S]*opacity:\s*0[\s\S]*blur\(8px\)[\s\S]*translateY\(24px\)"
$caseRevealVisiblePattern = "\.case-card-reveal\.is-visible\s*\{[\s\S]*opacity:\s*1[\s\S]*blur\(0\)[\s\S]*translateY\(0\)"
$caseLinePattern = "\.case-card-orange-border\s*\{[\s\S]*position:\s*absolute[\s\S]*pointer-events:\s*none[\s\S]*opacity:\s*0"
$caseLinePathPattern = "\.case-card-orange-border-line\s*\{[\s\S]*stroke:\s*#FF9800[\s\S]*stroke-width:\s*2[\s\S]*transform:\s*translate3d\(0, 0, 0\)"
$caseLineTopPattern = "\.case-card-orange-border-line--top\s*\{[\s\S]*--case-line-shift-x:\s*clamp\(-120px, -14vw, -62px\)[\s\S]*--case-line-shift-y:\s*0"
$caseLineRightPattern = "\.case-card-orange-border-line--right\s*\{[\s\S]*--case-line-shift-x:\s*0[\s\S]*--case-line-shift-y:\s*clamp\(62px, 14vw, 120px\)"
$caseLineHoverPattern = "\.case-card:hover \.case-card-orange-border[\s\S]*\.case-card:focus-visible \.case-card-orange-border\s*\{[\s\S]*opacity:\s*1"
$caseLineAnimationPattern = "\.case-card:hover \.case-card-orange-border-line[\s\S]*\.case-card:focus-visible \.case-card-orange-border-line\s*\{[\s\S]*animation:\s*case-orange-line-sway 4000ms cubic-bezier\(\.45, 0, \.2, 1\) infinite"
$caseLineKeyframesPattern = "@keyframes case-orange-line-sway\s*\{[\s\S]*50%\s*\{[\s\S]*transform:\s*translate3d\(var\(--case-line-shift-x\), var\(--case-line-shift-y\), 0\)[\s\S]*100%\s*\{[\s\S]*transform:\s*translate3d\(0, 0, 0\)"
$caseMoreArrowPattern = "\.case-card__more::after\s*\{[\s\S]*content:\s*`"[\s\S]*opacity:\s*0[\s\S]*translateX\(-4px\)"
$caseMobilePattern = "@media \(max-width:\s*560px\)\s*\{[\s\S]*\.case-card"
$caseReducedMotionPattern = "@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.case-card"
$galleryRootPattern = "\.case-gallery\s*\{[\s\S]*position:\s*relative[\s\S]*min-height:\s*clamp\(420px, 48vw, 560px\)[\s\S]*overflow:\s*visible[\s\S]*perspective:\s*1400px"
$galleryRadiusTokenPattern = "\.case-gallery\s*\{[\s\S]*--screenshot-radius:\s*8px"
$galleryStagePattern = "\.case-gallery__stage\s*\{[\s\S]*position:\s*relative[\s\S]*transform-style:\s*preserve-3d"
$galleryItemPattern = "\.case-gallery__item\s*\{[\s\S]*position:\s*absolute[\s\S]*left:\s*50%[\s\S]*top:\s*50%"
$galleryButtonPattern = "\.case-gallery__button\s*\{[\s\S]*cursor:\s*zoom-in"
$galleryTransformPattern = "\.case-gallery__button\s*\{[\s\S]*transform:\s*var\(--coverflow-transform\)"
$galleryTransitionPattern = "\.case-gallery__button\s*\{[\s\S]*transform 640ms cubic-bezier\(0\.22, 1, 0\.36, 1\)[\s\S]*opacity 520ms cubic-bezier\(0\.22, 1, 0\.36, 1\)"
$galleryTiltTransformPattern = "\.case-gallery__button\.is-tilting\s*\{[\s\S]*var\(--tilt-rotate-x, 0deg\)[\s\S]*var\(--tilt-rotate-y, 0deg\)[\s\S]*var\(--tilt-lift, 0px\)"
$galleryImagePattern = "\.case-gallery img\s*\{[\s\S]*width:\s*auto[\s\S]*max-width:\s*min\(78vw, 620px\)[\s\S]*max-height:\s*clamp\(320px, 40vw, 500px\)[\s\S]*object-fit:\s*contain"
$galleryRadiusPattern = "\.case-gallery img\s*\{[\s\S]*box-sizing:\s*border-box[\s\S]*border-radius:\s*var\(--screenshot-radius\)[\s\S]*clip-path:\s*inset\(0 round var\(--screenshot-radius\)\)"
$galleryButtonRadiusPattern = "\.case-gallery__button\s*\{[\s\S]*overflow:\s*visible[\s\S]*border-radius:\s*var\(--screenshot-radius\)"
$galleryButtonHitboxPattern = "\.case-gallery__button\s*\{[\s\S]*display:\s*grid[\s\S]*place-items:\s*center[\s\S]*width:\s*100%[\s\S]*height:\s*clamp\(320px, 40vw, 500px\)[\s\S]*background:\s*transparent"
$galleryNavPattern = "\.case-gallery__nav\s*\{[\s\S]*position:\s*absolute[\s\S]*border-radius:\s*999px"
$galleryProgressPattern = "\.case-gallery__progress\s*\{[\s\S]*display:\s*flex[\s\S]*justify-content:\s*center"
$galleryReducedMotionPattern = "@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.case-gallery__button\s*\{[\s\S]*transform:\s*translate\(-50%, -50%\) translateX\(var\(--coverflow-x, 0px\)\)"
$galleryButtonFocusPattern = "\.case-gallery__button:focus-visible\s*\{[\s\S]*outline:\s*1px solid #FF9800"
$lightboxPattern = "\.case-lightbox\s*\{[\s\S]*position:\s*fixed[\s\S]*inset:\s*0[\s\S]*z-index:\s*30[\s\S]*opacity:\s*0"
$lightboxOpenPattern = "\.case-lightbox\.is-open\s*\{[\s\S]*opacity:\s*1[\s\S]*pointer-events:\s*auto"
$lightboxImagePattern = "\.case-lightbox__image\s*\{[\s\S]*max-width:\s*min\(1120px, 86vw\)[\s\S]*max-height:\s*82vh[\s\S]*object-fit:\s*contain"
$lightboxButtonPattern = "\.case-lightbox__button,\s*\.case-lightbox__close\s*\{[\s\S]*border-radius:\s*999px[\s\S]*cursor:\s*pointer"
$relatedListScrollbarPattern = "\.related-list\s*\{[\s\S]*scrollbar-width:\s*thin[\s\S]*scrollbar-color:\s*#b8b8b2 transparent"
$relatedListHoverPaddingPattern = "\.related-list\s*\{[\s\S]*padding:\s*4px 12px 4px 4px"
$relatedListWebkitScrollbarPattern = "\.related-list::-webkit-scrollbar\s*\{[\s\S]*width:\s*6px"
$relatedListShadowPattern = "\.related-list-wrap::after\s*\{[\s\S]*linear-gradient\(to bottom, rgb\(243 243 241 / 0\), var\(--bg\)\)"
$relatedHoverMediaPattern = "@media \(hover:\s*hover\) and \(pointer:\s*fine\)\s*\{[\s\S]*\.related-card\.is-visible:hover"
$relatedHoverTransformPattern = "\.related-card\.is-visible:hover\s*\{[\s\S]*translate3d\(var\(--related-hover-x\), calc\(var\(--related-hover-y\) - 2px\), 0\)[\s\S]*rotateX\(var\(--related-hover-rotate-x\)\)[\s\S]*rotateY\(var\(--related-hover-rotate-y\)\)[\s\S]*scale\(1\.01\)"
$relatedHoverTransitionPattern = "\.related-card\s*\{[\s\S]*transform 180ms cubic-bezier\(\.2, \.7, \.2, 1\)"
$relatedHoverOriginPattern = "\.related-card\.is-visible\s*\{[\s\S]*transform-origin:\s*left center"
$relatedHoverReducedMotionPattern = "@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.related-card"

Assert-Match $css $casesSectionPattern "Cases section must use page background"
Assert-Match $css $casesInnerPattern "Cases section must keep content axis"
Assert-Match $css "\.cases-showcase__lead-highlight\s*\{[\s\S]*display:\s*inline-block" "Cases lead highlight style missing"
Assert-Match $css $caseCardBorderPattern "Case card border missing"
Assert-Match $css $caseCardRadiusPattern "Case card radius must be 8px"
Assert-NotMatch $css "aspect-ratio:\s*1 / 1" "Case cards must keep first iteration rectangular shape"
Assert-Match $css $caseRevealPerspectivePattern "Case tilt perspective must be on reveal wrapper"
Assert-Match $css $caseRevealPattern "Case reveal initial state missing"
Assert-Match $css $caseRevealVisiblePattern "Case reveal visible state missing"
Assert-Match $css $caseLinePattern "Case card orange moving line missing"
Assert-Match $css $caseLinePathPattern "Case card orange moving line path missing"
Assert-Match $css $caseLineTopPattern "Case card top orange line position missing"
Assert-Match $css $caseLineRightPattern "Case card right orange line position missing"
Assert-Match $css $caseLineHoverPattern "Case card orange moving line hover missing"
Assert-Match $css $caseLineAnimationPattern "Case card orange moving line animation duration missing"
Assert-Match $css $caseLineKeyframesPattern "Case card orange moving line keyframes missing"
Assert-Match $css $caseMoreArrowPattern "Case more arrow animation missing"
Assert-NotMatch $css "\.case-card:hover\s+\.case-card__more\s*\{\s*color:\s*#FF9800" "Case card more link hover must not be orange"
Assert-Match $css $caseMobilePattern "Case mobile styles missing"
Assert-Match $css $caseReducedMotionPattern "Case reduced motion styles missing"
Assert-Match $css $galleryRootPattern "Circular gallery root sizing missing"
Assert-Match $css $galleryRadiusTokenPattern "Gallery screenshots must use a shared radius token"
Assert-Match $css $galleryStagePattern "3D gallery stage missing"
Assert-Match $css $galleryItemPattern "Circular gallery item sizing missing"
Assert-Match $css $galleryButtonPattern "Gallery button zoom cursor missing"
Assert-Match $css $galleryTransformPattern "Gallery 3D transform variable missing"
Assert-Match $css $galleryTransitionPattern "Gallery slide transition must be soft and 500-700ms"
Assert-Match $css $galleryTiltTransformPattern "Gallery hover tilt transform missing"
Assert-NotMatch $css "\.case-gallery__button::after\s*\{[\s\S]*radial-gradient" "Gallery must not show pointer glare over screenshots"
Assert-NotMatch $css "\.case-gallery__button\.is-tilting::after\s*\{[\s\S]*opacity:\s*1" "Gallery hover tilt must not enable pointer glare"
Assert-Match $css $galleryImagePattern "Gallery image containment missing"
Assert-Match $css $galleryRadiusPattern "Gallery image radius must be even and self-clipped"
Assert-Match $css $galleryButtonRadiusPattern "Gallery wrapper must share radius without clipping screenshot corners"
Assert-Match $css $galleryButtonHitboxPattern "Gallery button must keep a transparent click target without drawing a large empty frame"
Assert-Match $css $galleryNavPattern "Gallery nav controls missing"
Assert-Match $css $galleryProgressPattern "Gallery progress indicator missing"
Assert-Match $css $galleryReducedMotionPattern "Gallery reduced motion fallback missing"
Assert-Match $css $galleryButtonFocusPattern "Gallery button focus state missing"
Assert-Match $css $lightboxPattern "Lightbox fixed overlay styles missing"
Assert-Match $css $lightboxOpenPattern "Lightbox open state missing"
Assert-Match $css $lightboxImagePattern "Lightbox image containment missing"
Assert-Match $css $lightboxButtonPattern "Lightbox round controls missing"
Assert-Match $css $relatedListScrollbarPattern "Related list visible Firefox scrollbar missing"
Assert-Match $css $relatedListHoverPaddingPattern "Related list must keep room for hover movement so card borders are not clipped"
Assert-Match $css $relatedListWebkitScrollbarPattern "Related list visible WebKit scrollbar missing"
Assert-Match $css $relatedListShadowPattern "Related list bottom scroll hint missing"
Assert-Match $css $relatedHoverMediaPattern "Related cases hover must be desktop pointer only"
Assert-Match $css $relatedHoverTransformPattern "Related cases hover transform missing"
Assert-Match $css $relatedHoverTransitionPattern "Related cases hover transform transition missing"
Assert-Match $css $relatedHoverOriginPattern "Related cases hover must keep the left border anchored"
Assert-Match $css $relatedHoverReducedMotionPattern "Related cases hover must respect reduced motion"
Assert-NotMatch $css "\.related-list::-webkit-scrollbar\s*\{\s*width:\s*0" "Related list scrollbar must stay visible"

Write-Output "case checks passed"
