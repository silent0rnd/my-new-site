$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "index.html")
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "styles.css")
$js = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "script.js")
$firstFramePath = Join-Path $root "assets\maxim-portrait-video-frame-first.jpg"

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

Assert-NotMatch $html '<figure class="portrait"[\s\S]*<img[^>]+maxim-portrait-bg-match\.jpg' "Fallback portrait image must be removed"
Assert-Match $html '<link[^>]+rel="preload"[^>]+href="assets/maxim-portrait-video-frame-first\.jpg"[^>]+as="image"' "Portrait first frame preload missing"
Assert-Match $html '<img[^>]+class="portrait-poster"[^>]+src="assets/maxim-portrait-video-frame-first\.jpg"' "Portrait first frame image missing"
Assert-Match $html '<img[^>]+class="portrait-poster"[^>]+width="928"[^>]+height="1080"' "Mobile portrait poster dimensions missing"
Assert-Match $html '<video[^>]+class="portrait-video"' "Portrait video tag missing"
Assert-Match $html '<video[^>]+src="assets/maxim-portrait-motion\.mp4"' "Portrait video source missing"
Assert-NotMatch $html 'poster=' "Portrait video poster must not render with browser-specific mobile crop"
Assert-NotMatch $html 'poster="assets/maxim-portrait-bg-match\.jpg"' "Heavy portrait poster must not be used"
Assert-Match $html '<video[^>]+muted' "Portrait video must be muted for autoplay"
Assert-Match $html '<video[^>]+playsinline' "Portrait video must play inline on mobile"
Assert-NotMatch $html '<video[^>]+loop' "Portrait video must not loop"
Assert-Match $html '<section[^>]+class="about"[^>]+aria-labelledby="about-title"[^>]*>' "About section missing"
Assert-Match $html '<h2 id="about-title">[^<]+</h2>' "About title missing"
Assert-Match $html '<div class="about__photo-stack">\s*<img[^>]+class="about__photo"[^>]+src="assets/about-portrait\.jpg"' "About portrait image missing"
Assert-Match $html '<div class="about__content">\s*<svg class="about__orb"[^>]+aria-hidden="true"[\s\S]*<path class="about__orb-path"' "About animated SVG orb must sit inside text block"
Assert-Match $html '<figcaption class="about__caption">[\s\S]*<strong>[\s\S]*</strong>[\s\S]*<span>[\s\S]*</span>[\s\S]*</figcaption>' "About photo caption missing"
Assert-Match $html '<div class="about__copy">[\s\S]*<p>[\s\S]*</p>[\s\S]*<p>[\s\S]* - [\s\S]*</p>[\s\S]*<p>[\s\S]*</p>[\s\S]*</div>' "About copy must be 3 paragraphs and use short dash"
Assert-Match $html '616509115086' "About INN missing"
Assert-Match $html '322619600194754' "About OGRNIP missing"
Assert-NotMatch $html ([char]0x2014) "HTML must not contain long dash"

Assert-NotMatch $css '\.portrait\s+img' "Portrait fallback image CSS must be removed"
Assert-Match $css '\.about\s*\{[\s\S]*background:\s*var\(--bg\)' "About section must inherit page background"
Assert-Match $css '\.about__inner\s*\{[\s\S]*grid-template-columns:\s*minmax\(280px, 0\.82fr\) minmax\(0, 1fr\)' "About desktop grid missing"
Assert-NotMatch $css '\.about__photo\s*\{[^}]*filter:' "About portrait must stay untouched so its backdrop matches the page"
Assert-Match $css '\.about__photo-stack::after\s*\{[\s\S]*about-portrait-color\.webp' "About colour layer source missing"
Assert-Match $css '\.about__photo-stack::after\s*\{[\s\S]*mask-image:\s*radial-gradient' "About colour spot mask missing"
Assert-Match $css '\.about__photo\s*\{[\s\S]*object-fit:\s*cover' "About photo must use portrait composition"
Assert-Match $css '\.about__content\s*\{[\s\S]*position:\s*relative[\s\S]*isolation:\s*isolate' "About text block must isolate orb behind text"
Assert-Match $css '\.about__orb\s*\{[\s\S]*position:\s*absolute[\s\S]*pointer-events:\s*none[\s\S]*z-index:\s*0[\s\S]*animation:\s*about-orb-float' "About orb must be animated background layer"
Assert-Match $css '\.about__orb-path\s*\{[\s\S]*fill:\s*none[\s\S]*stroke:\s*#FF9800[\s\S]*stroke-width:\s*6[\s\S]*animation:\s*about-orb-line' "About orb path must use animated orange stroke"
Assert-Match $css '\.about h2,\s*\.about__copy,\s*\.about__requisites\s*\{[\s\S]*position:\s*relative[\s\S]*z-index:\s*1' "About text must sit above orb"
Assert-Match $css '@keyframes about-orb-float' "About orb float animation missing"
Assert-Match $css '@keyframes about-orb-line' "About orb line animation missing"
Assert-Match $css '@keyframes about-orb-float\s*\{[\s\S]*0%\s*\{\s*transform:\s*translate3d\(0, 0, 0\) rotate\(-2deg\) scale\(1\);[\s\S]*100%\s*\{\s*transform:\s*translate3d\(0, 0, 0\) rotate\(-2deg\) scale\(1\);' "About orb float loop must end where it starts"
Assert-Match $css '@keyframes about-orb-line\s*\{[\s\S]*100%\s*\{\s*stroke-dashoffset:\s*-1;' "About orb line must use full path cycle for seamless loop"
Assert-Match $css '@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.about__orb,[\s\S]*\.about__orb-path,[\s\S]*\.case-sketch-orb\s*\{[\s\S]*animation:\s*none' "About orb must respect reduced motion"
Assert-Match $css '\.about__copy\s+p\s*\{[\s\S]*max-width:\s*560px' "About text width missing"
Assert-Match $css '\.about__requisites\s*\{[\s\S]*border-top:\s*1px solid var\(--line\)' "About requisites separator missing"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.about__inner\s*\{[\s\S]*grid-template-columns:\s*1fr' "About mobile one-column layout missing"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.about__content\s*\{[\s\S]*display:\s*contents' "About mobile content reordering missing"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.about__inner\s*\{[\s\S]*position:\s*relative' "About mobile orb needs positioned container"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.about__orb\s*\{[\s\S]*display:\s*block[\s\S]*grid-row:\s*3[\s\S]*position:\s*relative[\s\S]*width:\s*240px[\s\S]*height:\s*240px[\s\S]*opacity:\s*0\.225' "About tablet orb must share the copy row"
Assert-Match $css '@media \(max-width:\s*560px\)\s*\{[\s\S]*\.about__orb\s*\{[\s\S]*width:\s*178px[\s\S]*height:\s*178px[\s\S]*opacity:\s*0\.19125' "About small mobile orb must retain its approved size and opacity"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.about__media\s*\{[\s\S]*order:\s*2' "About mobile photo order missing"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.about__copy\s*\{[\s\S]*order:\s*3[\s\S]*grid-row:\s*3' "About mobile copy must share the orb row"
Assert-NotMatch $css ([char]0x2014) "CSS must not contain long dash"
Assert-Match $css '\.topbar\s*\{[\s\S]*justify-content:\s*flex-start' "Desktop messenger links must align to the left text column"
Assert-Match $css '\.topbar\s*\{[\s\S]*padding-left:\s*104px' "Desktop messenger links must share the content left offset"
Assert-Match $css '\.portrait-video\s*\{[\s\S]*position:\s*absolute' "Video must fill portrait block"
Assert-Match $css '\.portrait\s*\{[\s\S]*background:\s*var\(--bg\) url\("assets/maxim-portrait-video-frame-first\.jpg"\) 50% 25% / cover no-repeat;' "Desktop portrait must keep the first video frame as a visible fallback"
Assert-Match $css '\.portrait-poster\s*\{[\s\S]*display:\s*block[\s\S]*object-fit:\s*cover[\s\S]*object-position:\s*50% 25%[\s\S]*transform:\s*scale\(1\.02\)' "Desktop poster must match video sizing"
Assert-Match $css '\.portrait-poster\s*\{[\s\S]*z-index:\s*1' "Portrait poster must sit above video"
Assert-Match $css '\.portrait-video\s*\{[\s\S]*opacity:\s*1' "Desktop video must stay visible immediately"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.portrait-poster\s*\{[\s\S]*transform:\s*none' "Mobile poster must match mobile video sizing"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.portrait-video\s*\{[\s\S]*opacity:\s*1' "Mobile video must stay visible under poster to avoid white flash"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.portrait-video\s*\{[\s\S]*transform:\s*none' "Mobile video must match fallback sizing"
Assert-Match $css '\.portrait-video\.is-ready\s*\{[\s\S]*opacity:\s*1' "Video ready state missing"
Assert-Match $css '\.portrait\.is-ready\s+\.portrait-poster\s*\{[\s\S]*opacity:\s*0' "Portrait poster must fade out after video is ready"
Assert-Match $css '\.portrait\s*\{[\s\S]*top:\s*-48px' "Portrait block must start above viewport to hide top seam"
Assert-Match $css '\.portrait\s*\{[\s\S]*height:\s*auto' "Portrait block must stretch from top to bottom on desktop"
Assert-Match $css '@media \(max-width:\s*920px\)\s*\{[\s\S]*\.portrait\s*\{[\s\S]*top:\s*auto' "Mobile portrait must keep height-based layout"
Assert-Match $css '@media \(max-width:\s*560px\)\s*\{[\s\S]*mask-image:\s*linear-gradient\(to right, transparent 0, rgb\(0 0 0 / 0\.28\) 24%, #000 42%\)' "Small mobile portrait mask must hide left seam"
Assert-Match $css '@media \(max-width:\s*560px\)\s*\{[\s\S]*\.portrait::before\s*\{[\s\S]*linear-gradient\(to right, var\(--bg\) 0, rgb\(243 243 241 / 0\.86\) 24%, rgb\(243 243 241 / 0\) 48%\)' "Small mobile left fade missing"
Assert-Match $css '\.portrait::after\s*\{[\s\S]*linear-gradient\(to bottom' "Bottom fade missing"
Assert-Match $css '\.portrait::before\s*\{[\s\S]*radial-gradient' "Lower-left fade missing"
Assert-Match $css '\.portrait::before\s*\{[\s\S]*linear-gradient\(to bottom' "Top edge fade missing"
Assert-Match $css '\.portrait::before\s*\{[\s\S]*linear-gradient\(to left' "Right edge fade missing"
Assert-Match $css '\.portrait-video\s*\{[\s\S]*transform:\s*scale\(1\.02\)' "Video edge scale missing"
Assert-Match $css '\.delayed-underline\s*\{[\s\S]*display:\s*inline-block[\s\S]*white-space:\s*nowrap' "Highlighted phrase must stay under one full underline"
Assert-Match $css '\.delayed-underline-svg\s*\{[\s\S]*position:\s*absolute[\s\S]*width:\s*calc\(100% \+ 0\.06em\)' "Static underline SVG layer missing"
Assert-Match $css '\.delayed-underline-path\s*\{[\s\S]*stroke:\s*#FF9800[\s\S]*stroke-width:\s*6[\s\S]*stroke-dashoffset:\s*1' "Thicker orange stroke-dash underline missing"
Assert-Match $css '\.delayed-underline\.is-underlined\s+\.delayed-underline-path\s*\{[\s\S]*stroke-dashoffset:\s*0' "Stroke reveal state missing"
Assert-NotMatch $css '\.delayed-underline[^\{]*\{[^\}]*scaleX\(' "Underline must not move by scaling"
Assert-Match $css '\.work-card__result\s+\.delayed-underline\s*\{[\s\S]*display:\s*inline-block' "Work result underline must not stretch full row"

Assert-Match $js 'const portraitVideo = document\.querySelector\("\.portrait-video"\)' "Portrait video JS hook missing"
Assert-NotMatch $js 'const isMobilePortrait' "Portrait reveal logic must not be mobile-only"
Assert-Match $js 'const messengerLinkTargets = document\.querySelectorAll\("\.messenger-links a"\)' "Messenger link underline hooks missing"
Assert-Match $js 'const workResultTargets = document\.querySelectorAll\("\.work-card__result > span"\)' "Work result underline hooks missing"
Assert-Match $js 'const workCards = document\.querySelectorAll\("\.work-card"\)' "Work card hooks missing"
Assert-Match $js 'const HIGHLIGHT_DELAY_MS = 5600' "Highlight delay must be 5600ms"
Assert-Match $js 'const HERO_HIGHLIGHT_TEXT = "\\u0447\\u0442\\u043e\\u0431\\u044b \\u0431\\u044e\\u0434\\u0436\\u0435\\u0442 \\u0440\\u0430\\u0431\\u043e\\u0442\\u0430\\u043b \\u043d\\u0430 \\u043f\\u0440\\u043e\\u0434\\u0430\\u0436\\u0438"' "Highlight target text missing"
Assert-Match $js 'createElementNS\("http://www\.w3\.org/2000/svg", "svg"\)' "Inline SVG underline creation missing"
Assert-Match $js 'pathLength", "1"' "Underline path length normalization missing"
Assert-Match $js 'messengerLinkTargets\.forEach\(\(link\) => \{[\s\S]*attachDelayedUnderline\(link\)' "Messenger links must get separate delayed underlines"
Assert-Match $js 'const workUnderlineObserver = [\s\S]*new IntersectionObserver' "Work underline viewport observer missing"
Assert-Match $js 'rootMargin:\s*"0px 0px -40% 0px"' "Work animation must use the 60% viewport activation line"
Assert-Match $js 'threshold:\s*0\.1' "Work animation threshold must start on entry"
Assert-Match $js 'workResultTargets\.forEach\(attachDelayedUnderline\)' "Work result labels must receive underlines"
Assert-Match $js 'workUnderlineObserver\.observe\(card\)' "Work cards must share the underline observer"
Assert-Match $js 'lists\.forEach\(\(list\) => workUnderlineObserver\.observe\(list\)\)' "Each work list must share the underline observer"
Assert-Match $js 'const revealWorkTicks = \(list\) => \{[\s\S]*list\.classList\.add\("is-ticked"\)' "Work ticks must reveal once per list"
Assert-Match $js 'entry\.target\.matches\("\.work-card ul"\)' "Work observer must distinguish lists from cards"
Assert-Match $js 'const TICK_PATH = ' "Work ticks must use one SVG template"
Assert-NotMatch $js 'workTickObserver|TICK_STEP_MS|TICK_COLUMN_OFFSET_MS|TICK_PATHS' "Separate work tick observer and legacy delays must be removed"
Assert-NotMatch $js 'workUnderlineObserver\.observe\(item\)' "Individual work items must not trigger ticks"
Assert-Match $css '\.work-card li:nth-child\(7\)\s*\{\s*--tick-delay:\s*810ms' "Work tick cascade must use 135ms delays through 810ms"
Assert-Match $css '\.work-tick__path\s*\{[\s\S]*transition:\s*stroke-dashoffset 780ms' "Work tick drawing duration must stay at 780ms"
Assert-Match $css '\.work-tick__path\s*\{[\s\S]*transition-delay:\s*var\(--tick-delay, 0ms\)' "Work tick drawing must use the cascade delay"
Assert-Match $css '\.work-card ul\.is-ticked\s+\.work-tick__path\s*\{[\s\S]*stroke-dashoffset:\s*0' "Work tick state must belong to the whole list"
Assert-Match $css '@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.work-tick__path\s*\{[\s\S]*transition:\s*none;[\s\S]*stroke-dashoffset:\s*0' "Work ticks must remain immediate with reduced motion"
Assert-Match $html '<svg class="page-menu__progress"[\s\S]*<path class="page-menu__progress-path"[^>]+pathLength="1"' "Desktop menu reading progress SVG missing"
Assert-Match $css '\.page-menu__progress-path\s*\{[\s\S]*stroke-dashoffset:\s*calc\(1 - var\(--scroll-progress\)\)' "Reading progress must control SVG dash offset"
Assert-Match $js 'function updateReadingProgress\(\)' "Scroll progress updater missing"
Assert-Match $js 'link\.classList\.toggle\("is-passed"' "Passed menu state missing"
Assert-Match $js 'link\.classList\.add\("is-reached"\)' "Reached menu point animation missing"
Assert-Match $js 'setTimeout\(\(\) => \{[\s\S]*is-underlined[\s\S]*HIGHLIGHT_DELAY_MS' "Delayed underline timer missing"
Assert-Match $js 'new IntersectionObserver' "Viewport return observer missing"
Assert-Match $js 'portraitVideo\.currentTime = 0' "Video reset missing"
Assert-Match $js 'const revealPortraitVideo = \(\) => \{[\s\S]*is-ready' "Video ready reveal missing"
Assert-Match $js 'portraitVideo\.readyState >= 2 && !portraitVideo\.paused' "Already-playing video ready check missing"
Assert-Match $js 'portraitVideo\.addEventListener\("playing", revealPortraitVideo' "Portrait poster must wait for video playback before hiding"
Assert-NotMatch $js 'portraitVideo\.addEventListener\("loadeddata", revealPortraitVideo' "Loadeddata is too early to hide the portrait poster"
Assert-Match $js 'requestVideoFrameCallback' "Video frame paint wait missing"
Assert-Match $js 'portrait\?\.classList\.add\("is-ready"\)' "Portrait ready reveal missing"
Assert-Match $js 'portraitVideo\.play\(\)' "Video play trigger missing"
Assert-Match $js 'portraitVideo\.pause\(\)' "Video pause trigger missing"

if (-not (Test-Path -LiteralPath $firstFramePath)) {
  throw "Portrait first frame asset missing"
}

Add-Type -AssemblyName System.Drawing
$mobilePoster = [System.Drawing.Image]::FromFile($firstFramePath)
try {
  if ($mobilePoster.Width -ne 928 -or $mobilePoster.Height -ne 1080) {
    throw "Portrait first frame must match video frame dimensions 928x1080"
  }
} finally {
  $mobilePoster.Dispose()
}

Write-Output "portrait video checks passed"
