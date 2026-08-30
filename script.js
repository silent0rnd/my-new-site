(() => {
  const CONSENT_KEY = "naklikayCookieConsent";
  const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;
  const COOKIE_CONSENT_DELAY_MS = 6000;
  const COOKIE_CONSENT_MOBILE_DELAY_MS = 7000;
  const COOKIE_CONSENT_ANIMATION_MS = 360;
  const YANDEX_METRIKA_ID = 110564693;
  const YANDEX_METRIKA_SRC = "https://mc.yandex.ru/metrika/tag.js?id=110564693";
  const MOBILE_VIEWPORT_QUERY = "(max-width: 720px)";

  // script.js всегда лежит в корне сайта, поэтому его собственный адрес даёт корень.
  // Пути от корня вида "/images/..." работают только через сервер: если открыть файл
  // кейса с диска двойным кликом, браузер ищет папку в корне диска C: и путь ломается.
  const rootScript = document.currentScript || document.querySelector('script[src*="script.js"]');
  const SITE_ROOT = new URL(".", rootScript ? rootScript.src : location.href).href;

  function openBlogLinksInNewTab() {
    if (!/^\/blog(?:\/|$)/.test(window.location.pathname)) return;

    const prepareLink = (link) => {
      link.target = "_blank";
      link.relList.add("noopener", "noreferrer");
    };

    document.querySelectorAll("a[href]").forEach(prepareLink);

    new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;

          if (node.matches("a[href]")) prepareLink(node);
          node.querySelectorAll("a[href]").forEach(prepareLink);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  openBlogLinksInNewTab();

  function readCookieConsent() {
    try {
      const storedValue = window.localStorage.getItem(CONSENT_KEY);
      if (!storedValue) return false;

      const consent = JSON.parse(storedValue);
      if (!consent || consent.accepted !== true || Number(consent.expiresAt) <= Date.now()) {
        window.localStorage.removeItem(CONSENT_KEY);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  function saveCookieConsent() {
    const consent = {
      accepted: true,
      savedAt: Date.now(),
      expiresAt: Date.now() + CONSENT_TTL_MS,
    };

    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch (error) {
      return;
    }
  }

  window.loadYandexMetrika = function loadYandexMetrika() {
    const counterId = YANDEX_METRIKA_ID;

    if (!counterId || window.__naklikayMetrikaLoaded) {
      return false;
    }

    window.__naklikayMetrikaLoaded = true;
    window.ym = window.ym || function ym() {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = 1 * new Date();
    window.dataLayer = window.dataLayer || [];

    const script = document.createElement("script");
    script.async = true;
    script.src = YANDEX_METRIKA_SRC;
    script.id = "yandex-metrika-loader";
    document.head.append(script);

    window.ym(counterId, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });

    return true;
  };

  function createCookieConsentBanner() {
    const banner = document.createElement("aside");
    const icon = document.createElement("div");
    const text = document.createElement("p");
    const button = document.createElement("button");

    banner.className = "cookie-consent";
    banner.setAttribute("aria-label", "Уведомление об использовании cookie");
    icon.className = "cookie-consent__icon";
    icon.setAttribute("aria-hidden", "true");
    text.className = "cookie-consent__text";
    text.innerHTML = `Я, как и все, использую файлы cookie. Но согласно нашим прекрасным законам, я вынужден вам это показать. Нажимая кнопку, вы подтверждаете <a href="${SITE_ROOT}cookie-policy/" target="_blank" rel="noopener noreferrer">согласие на их использование</a> и <a href="${SITE_ROOT}personal-data-consent/" target="_blank" rel="noopener noreferrer">обработку персональных данных</a>.`;
    button.className = "cookie-consent__button";
    button.type = "button";
    button.textContent = "Понятно";

    button.addEventListener("click", () => {
      saveCookieConsent();
      banner.classList.remove("is-visible");
      window.loadYandexMetrika();
      setTimeout(() => {
        banner.remove();
        document.body.classList.remove("cookie-consent-open");
      }, COOKIE_CONSENT_ANIMATION_MS);
    });

    banner.append(icon, text, button);
    return banner;
  }

  function showCookieConsentBanner() {
    const existingBanner = document.querySelector(".cookie-consent");
    if (existingBanner) {
      document.body.classList.add("cookie-consent-open");
      existingBanner.classList.add("is-visible");
      return;
    }

    const banner = createCookieConsentBanner();
    document.body.classList.add("cookie-consent-open");
    document.body.append(banner);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.classList.add("is-visible");
      });
    });
  }

  function showCookieConsentBannerWithDelay() {
    const delay = window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
      ? COOKIE_CONSENT_MOBILE_DELAY_MS
      : COOKIE_CONSENT_DELAY_MS;

    window.setTimeout(() => {
      if (!readCookieConsent()) {
        showCookieConsentBanner();
      }
    }, delay);
  }

  // Разметка футера продублирована здесь и в index.html. Меняете контакты - правьте оба места.
  // Свести в одно нельзя без переноса футера главной в JS, а это отложит его появление на главной.
  const SITE_FOOTER_HTML = `
    <div class="site-footer__inner">
      <div class="site-footer__main">
        <div class="site-footer__content">
          <section class="site-footer__contacts" aria-labelledby="footer-contacts-title">
            <h2 class="site-footer__title" id="footer-contacts-title">Контакты</h2>
            <p class="site-footer__lead">
              <span class="site-footer__lead-highlight">Напишите</span>, если хотите обсудить рекламу, сайт или воронку.
            </p>

            <p class="site-footer__location">г. Ростов-на-Дону</p>

            <address class="site-footer__contact-list">
              <a href="mailto:direct@miroshnikov-maxim.ru">direct@miroshnikov-maxim.ru</a>
              <a href="tel:+79604457203">+7 960 445-72-03</a>
              <a href="https://t.me/miroshnikov_maxim" target="_blank" rel="noopener noreferrer">Telegram: @miroshnikov_maxim</a>
              <a href="https://max.ru/u/f9LHodD0cOIgA7Bv0YjmbdPunU2SNMxoBHXbc-v6QicEIYa6pEGXQlYaqtE" target="_blank" rel="noopener noreferrer">MAX: ссылка на профиль</a>
            </address>

            <section class="site-footer__channels" aria-labelledby="footer-channels-title">
              <h3 class="site-footer__channels-title" id="footer-channels-title">Мои каналы</h3>
              <div class="site-footer__channels-grid">
                <a class="site-footer__channel-link" href="https://max.ru/id616509115086_biz" target="_blank" rel="noopener noreferrer">
                  <svg class="site-footer__channel-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="3.5" width="25" height="25" rx="7" stroke="currentColor" stroke-width="2.25" />
                    <path d="M10 21.5V16a6 6 0 0 1 12 0v.15a6.35 6.35 0 0 1-8.8 5.86l-3.2 1.9v-2.4Z" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span>MAX-канал</span>
                </a>
                <a class="site-footer__channel-link" href="https://t.me/kot_baun_pro" target="_blank" rel="noopener noreferrer">
                  <svg class="site-footer__channel-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
                    <path d="M4.5 14.2 27 5.2c.9-.36 1.8.5 1.5 1.43l-7.08 21.05c-.3.9-1.5 1.06-2.05.28l-5.7-8.12-9-3.66Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="m13.67 19.84 8.15-9.15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span>Telegram-канал</span>
                </a>
                <a class="site-footer__channel-link" href="https://www.youtube.com/channel/UC50PdHuEt3ttl-0f5VoJfdg" target="_blank" rel="noopener noreferrer">
                  <svg class="site-footer__channel-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="7" width="25" height="18" rx="5" stroke="currentColor" stroke-width="2" />
                    <path d="m14 12.5 6.5 3.5-6.5 3.5v-7Z" fill="currentColor" />
                  </svg>
                  <span>YouTube-канал</span>
                </a>
                <a class="site-footer__channel-link" href="https://rutube.ru/channel/30401918" target="_blank" rel="noopener noreferrer">
                  <svg class="site-footer__channel-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="3.5" width="25" height="25" rx="8" stroke="currentColor" stroke-width="2.25" />
                    <path d="M10 23V9h6.2a4.3 4.3 0 0 1 1.25 8.42L22 23M10 16.4h6.2" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span>RuTube-канал</span>
                </a>
              </div>
            </section>

            <div class="site-footer__details" aria-label="Реквизиты">
              <p>ИП Мирошников Максим Анатольевич</p>
              <p>ИНН: 616509115086</p>
              <p>ОГРНИП: 322619600194754</p>
            </div>
          </section>

          <div class="site-footer__signature">
            <img
              src="${SITE_ROOT}images/signature/maxim-signature.svg"
              alt="Подпись Максим Мирошников"
              class="site-footer__signature-image"
              loading="lazy"
              decoding="async"
            />
            <p class="site-footer__signature-caption">
              Максим Мирошников - ревностный последователь осознанного маркетинга
            </p>
          </div>
        </div>
      </div>

      <div class="site-footer__legal">
        <a href="${SITE_ROOT}blog/">Блог</a>
        <a href="${SITE_ROOT}personal-data-consent/" target="_blank" rel="noopener noreferrer">Согласие на обработку персональных данных</a>
        <a href="${SITE_ROOT}cookie-policy/" target="_blank" rel="noopener noreferrer">Cookie</a>
      </div>
    </div>
  `;

  function ensureSiteFooter() {
    if (document.querySelector(".site-footer")) {
      return;
    }

    const footer = document.createElement("footer");
    footer.className = "site-footer site-footer--contacts";
    footer.id = "contacts";
    footer.innerHTML = SITE_FOOTER_HTML;
    document.body.append(footer);
  }

  ensureSiteFooter();

  if (readCookieConsent()) {
    window.loadYandexMetrika();
  } else {
    showCookieConsentBannerWithDelay();
  }
})();

// Страховка на весь остальной файл. Анимация прячет текст до разбора на буквы, и если
// разбор не дойдёт до конца из-за ошибки, текст останется невидимым. Таймер снимает все
// метки "спрятано до анимации" - и на главной, и на кейсах. Последняя строка файла его
// отменяет, поэтому в рабочем сценарии он не срабатывает никогда.
const animationFailsafe = setTimeout(() => {
  document.documentElement.classList.remove("is-restoring-scroll", "is-hero-intro-pending", "is-section-titles-pending");
  document.querySelectorAll(".is-roll-paused").forEach((element) => element.classList.remove("is-roll-paused"));
}, 4000);

// Короткие слова (предлоги, союзы) склеиваются со следующим словом неразрывным
// пробелом, чтобы не повисали в конце строки. На заголовках в 60-90px одиночное
// "в" или "и" в конце строки - самый заметный типографический дефект в кадре.
// Дополняет text-wrap из styles.css: там выравнивается длина строк, здесь
// запрещается сам перенос. Блоки с побуквенной анимацией (.hero) не трогаем.
const TYPOGRAPHY_TAGS = "h1, h2, h3, p, li, dd, figcaption";
const TYPOGRAPHY_SKIP = ".hero";
const SHORT_WORD = /^[("«„'-]*[а-яёa-z]{1,2}$/i;

function glueShortWords(text) {
  return text.replace(/(\S+)(\s+)/g, (match, word) => (SHORT_WORD.test(word) ? `${word}\u00A0` : match));
}

function applyTypography(root) {
  root.querySelectorAll(TYPOGRAPHY_TAGS).forEach((element) => {
    if (element.closest(TYPOGRAPHY_SKIP)) return;

    element.childNodes.forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;

      const glued = glueShortWords(node.nodeValue);
      if (glued !== node.nodeValue) {
        node.nodeValue = glued;
      }
    });
  });
}

const LETTER_DELAY_MS = 63;
// 63 × 0.45: на страницах кейсов перекат заголовков идёт заметно быстрее.
// Парное правило - animation-duration у .case-detail в styles.css.
const CASE_LETTER_DELAY_MS = 28;
const MOBILE_CASE_TITLE_QUERY = "(max-width: 560px)";
const CASE_TITLE_MIN_FONT_SIZE_PX = 32;
const CASE_TITLE_MAX_FONT_SIZE_PX = 64;
const ANIMATION_DURATION_MS = 588;
const GLOBAL_ANIMATION_DELAY_MS = 3000;
const AFTER_STATS_PAUSE_MS = 0;
const TEXT_LETTER_DELAY_MS = 8;
const AFTER_TEXT_PAUSE_MS = 0;
const TEXT_OVERLAP_MS = 1000;
const HIGHLIGHT_DELAY_MS = 5600;
const HERO_HIGHLIGHT_TEXT = "\u0447\u0442\u043e\u0431\u044b \u0431\u044e\u0434\u0436\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u043b \u043d\u0430 \u043f\u0440\u043e\u0434\u0430\u0436\u0438";
const SCROLL_RESTORE_KEY = "naklikayScrollY";
const HERO_VIDEO_PLAYED_KEY = "heroVideoPlayed";

const statsTargets = document.querySelectorAll(".stats strong, .stats span");
const messengerLinkTargets = document.querySelectorAll(".messenger-links a");
const workResultTargets = document.querySelectorAll(".work-card__result > span");
const workCards = document.querySelectorAll(".work-card");
const casesLeadHighlight = document.querySelector(".cases-showcase__lead-highlight");
const reviewsTextHighlight = document.querySelector(".reviews-section__text-highlight");
const siteFooterLeadHighlight = document.querySelector(".site-footer__lead-highlight");
const subtitleTarget = document.querySelector(".subtitle");
const heroCopyTarget = document.querySelector(".hero-copy");
const hero = document.querySelector(".hero");
const portraitVideo = document.querySelector(".portrait-video");

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function getCurrentScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function readSavedScrollY() {
  try {
    return Number(window.sessionStorage.getItem(SCROLL_RESTORE_KEY) || 0);
  } catch (error) {
    return 0;
  }
}

function saveCurrentScrollY() {
  try {
    window.sessionStorage.setItem(SCROLL_RESTORE_KEY, String(getCurrentScrollY()));
  } catch (error) {}
}

function readHeroVideoPlayed() {
  try {
    return window.localStorage.getItem(HERO_VIDEO_PLAYED_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function saveHeroVideoPlayed() {
  try {
    window.localStorage.setItem(HERO_VIDEO_PLAYED_KEY, "true");
  } catch (error) {}
}

const hasHeroVideoPlayed = Boolean(hero && readHeroVideoPlayed());
const firstHeroCopy = document.querySelector('[data-hero-copy="first"]');
const returningHeroCopy = document.querySelector('[data-hero-copy="returning"]');
const returningHeroTitle = returningHeroCopy?.querySelector("h1");
const returningHeroEyebrow = returningHeroCopy?.querySelector(".eyebrow");
const returningHeroTopic = returningHeroCopy?.querySelector("[data-returning-hero-topic]");
const RETURNING_HERO_TOPICS = ["рекламе?", "бюджету?", "стратегии?", "сайту?", "окупаемости?", "офферу?", "аналитике?", "воронке?"];
const RETURNING_HERO_TOPIC_INTERVAL_MS = 2000;
const RETURNING_HERO_TOPIC_ERASE_MS = 260;

if (hasHeroVideoPlayed && firstHeroCopy && returningHeroCopy) {
  firstHeroCopy.hidden = true;
  returningHeroCopy.hidden = false;
  hero.classList.add("is-returning-visitor");
}

// Прокрутку помним только для главной. У кейсов своя вкладка, но хранилище общее,
// поэтому без этой проверки кейс открывался с середины - на позиции главной страницы.
const isHomePage = window.location.pathname.replace(/index\.html$/, "") === "/";

function restoreSavedScrollPosition() {
  const savedScroll = readSavedScrollY();

  if (isHomePage && savedScroll > 120 && !window.location.hash) {
    window.scrollTo(0, savedScroll);
  }

  requestAnimationFrame(() => {
    document.documentElement.classList.remove("is-restoring-scroll");
  });
}

if (isHomePage) {
  window.addEventListener("pagehide", saveCurrentScrollY);
  window.addEventListener("beforeunload", saveCurrentScrollY);
}

restoreSavedScrollPosition();

function initPageMenu() {
  const menuLinks = document.querySelectorAll("[data-page-menu-link]");
  const desktopMenu = document.querySelector(".page-menu");
  const mobileMenu = document.querySelector(".mobile-page-menu");
  const mobileToggle = document.querySelector(".mobile-menu-toggle");
  const sectionIds = ["start", "work-scope", "about", "cases", "reviews", "contacts"];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!menuLinks.length || !sections.length) return;

  let activeSectionId = null;
  let progressFrame = null;

  function updateReadingProgress() {
    progressFrame = null;
    if (!desktopMenu) return;

    const scrollRange = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const progress = scrollRange === 0 ? 1 : Math.min(1, Math.max(0, getCurrentScrollY() / scrollRange));
    desktopMenu.style.setProperty("--scroll-progress", progress.toFixed(4));
  }

  function queueReadingProgress() {
    if (progressFrame !== null) return;
    progressFrame = window.requestAnimationFrame(updateReadingProgress);
  }

  function markReached(link) {
    link.classList.remove("is-reached");
    void link.offsetWidth;
    link.classList.add("is-reached");
    link.addEventListener("animationend", () => link.classList.remove("is-reached"), { once: true });
  }

  function setActiveSection(id) {
    const activeIndex = sectionIds.indexOf(id);
    const shouldAnimateReach = activeSectionId !== null && activeSectionId !== id;

    menuLinks.forEach((link) => {
      const isActive = link.getAttribute("data-page-menu-link") === id;
      const linkIndex = sectionIds.indexOf(link.getAttribute("data-page-menu-link"));
      link.classList.toggle("is-active", isActive);
      link.classList.toggle("is-passed", linkIndex >= 0 && linkIndex < activeIndex);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }

      if (isActive && shouldAnimateReach) markReached(link);
    });

    activeSectionId = id;
  }

  function closeMobileMenu() {
    if (!mobileMenu || !mobileToggle) return;
    mobileMenu.classList.remove("is-open");
    mobileMenu.hidden = true;
    mobileToggle.classList.remove("is-open");
    mobileToggle.setAttribute("aria-expanded", "false");
    mobileToggle.setAttribute("aria-label", "Открыть меню");
  }

  function toggleMobileMenu() {
    if (!mobileMenu || !mobileToggle) return;
    const shouldOpen = mobileMenu.hidden;
    mobileMenu.hidden = !shouldOpen;
    mobileMenu.classList.toggle("is-open", shouldOpen);
    mobileToggle.classList.toggle("is-open", shouldOpen);
    mobileToggle.setAttribute("aria-expanded", String(shouldOpen));
    mobileToggle.setAttribute("aria-label", shouldOpen ? "Закрыть меню" : "Открыть меню");
  }

  function updateActiveFromScroll() {
    const anchorLine = window.innerHeight * 0.36;
    let activeId = sections[0].id;

    for (const section of sections) {
      if (section.getBoundingClientRect().top <= anchorLine) {
        activeId = section.id;
      }
    }

    setActiveSection(activeId);
  }

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const sectionId = link.getAttribute("data-page-menu-link");
      if (sectionId) setActiveSection(sectionId);
      closeMobileMenu();
    });
  });

  if (mobileToggle) {
    mobileToggle.addEventListener("click", toggleMobileMenu);
  }

  document.addEventListener("pointerdown", (event) => {
    if (
      mobileMenu?.hidden ||
      mobileMenu?.contains(event.target) ||
      mobileToggle?.contains(event.target)
    ) {
      return;
    }

    closeMobileMenu();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0];

        if (visibleEntry) {
          setActiveSection(visibleEntry.target.id);
        } else {
          updateActiveFromScroll();
        }
      },
      {
        rootMargin: "-28% 0px -58% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  window.addEventListener("scroll", updateActiveFromScroll, { passive: true });
  window.addEventListener("scroll", queueReadingProgress, { passive: true });
  window.addEventListener("resize", updateActiveFromScroll);
  window.addEventListener("resize", queueReadingProgress);
  updateActiveFromScroll();
  updateReadingProgress();
}

initPageMenu();

function shouldRunHeroIntroAnimation() {
  if (!hero) return false;
  if (window.location.hash && window.location.hash !== "#") return false;
  if (readSavedScrollY() > 120) return false;

  const currentScroll = getCurrentScrollY();
  return currentScroll < Math.max(120, window.innerHeight * 0.25);
}

// Неразрывный пробел из applyTypography() переживает разбор на буквы: он остаётся
// внутри слова, а у .text-roll-word стоит white-space: nowrap - значит перенос между
// склеенными словами невозможен. Обычный \s его бы схлопнул и типографика пропала бы.
function getCleanText(element) {
  return (element.textContent || "").replace(/[ \t\n\r]+/g, " ").trim();
}

function splitHighlightText(text, highlightText) {
  const highlightIndex = highlightText ? text.indexOf(highlightText) : -1;

  if (highlightIndex < 0) {
    return [{ text, highlighted: false }];
  }

  return [
    { text: text.slice(0, highlightIndex), highlighted: false },
    { text: highlightText, highlighted: true },
    { text: text.slice(highlightIndex + highlightText.length), highlighted: false },
  ].filter((part) => part.text.length > 0);
}

function createUnderlineSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  svg.setAttribute("class", "delayed-underline-svg");
  svg.setAttribute("viewBox", "0 0 260 18");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  path.setAttribute("class", "delayed-underline-path");
  path.setAttribute("d", "M3 12 C44 5.8 90 5 132 6 C181 7.1 220 6.1 257 11.4");
  path.setAttribute("pathLength", "1");

  svg.append(path);
  return svg;
}

function attachDelayedUnderline(element) {
  element.classList.add("delayed-underline");

  if (!element.querySelector(".delayed-underline-svg")) {
    element.append(createUnderlineSvg());
  }

  return element;
}

const TICK_PATH = "M1.5 7.1 C3 8.2 4.1 9.7 5.3 11.4 C7.2 7.5 9.5 4.1 12.7 1.8";

function createTickSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  svg.setAttribute("class", "work-tick");
  svg.setAttribute("viewBox", "0 0 14 13");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  path.setAttribute("class", "work-tick__path");
  path.setAttribute("d", TICK_PATH);
  path.setAttribute("pathLength", "1");

  svg.append(path);
  return svg;
}

function buildTextRoll(element, baseDelay = 0, letterDelay = LETTER_DELAY_MS, highlightText = "") {
  const text = getCleanText(element);
  let letterIndex = 0;

  // Разбор стирает исходный текст, чтобы собрать его заново по буквам. Если на середине
  // сборки что-то сломается, кусок текста просто исчезнет с экрана, поэтому на такой
  // случай возвращаем строку целиком - без анимации, но на месте.
  try {
    element.textContent = "";
    element.setAttribute("aria-label", text);

    const rollRoot = document.createElement("span");
    rollRoot.className = "text-roll";

    const fragments = splitHighlightText(text, highlightText);

    for (const fragment of fragments) {
      const fragmentRoot = fragment.highlighted ? document.createElement("span") : rollRoot;

      if (fragment.highlighted) {
        fragmentRoot.className = "delayed-underline";
      }

      const parts = fragment.text.split(/([ \t\n\r]+)/);

      for (const part of parts) {
        if (!part) continue;

        if (/^[ \t\n\r]+$/.test(part)) {
          fragmentRoot.append(document.createTextNode(" "));
          continue;
        }

        const word = document.createElement("span");
        word.className = "text-roll-word";

        for (const letter of Array.from(part)) {
          const letterWrap = document.createElement("span");
          const letterInner = document.createElement("span");

          letterWrap.className = "text-roll-letter";
          letterWrap.style.setProperty("--roll-delay", `${baseDelay + letterIndex * letterDelay}ms`);
          letterWrap.setAttribute("aria-hidden", "true");
          letterInner.textContent = letter;

          letterWrap.append(letterInner);
          word.append(letterWrap);
          letterIndex += 1;
        }

        fragmentRoot.append(word);
      }

      if (fragment.highlighted) {
        attachDelayedUnderline(fragmentRoot);
        rollRoot.append(fragmentRoot);
      }
    }

    element.append(rollRoot);
    return letterIndex;
  } catch (error) {
    element.textContent = text;
    element.classList.remove("is-roll-paused");
    return 0;
  }
}

function fitMobileCaseTitle(title) {
  if (!title) return;

  if (!window.matchMedia(MOBILE_CASE_TITLE_QUERY).matches) {
    title.style.removeProperty("--case-title-font-size");
    return;
  }

  const words = Array.from(title.querySelectorAll(".text-roll-word"));
  if (words.length === 0 || title.clientWidth <= 0) return;

  const currentFontSize = parseFloat(window.getComputedStyle(title).fontSize) || CASE_TITLE_MAX_FONT_SIZE_PX;
  const widestWordAtCurrentSize = words.reduce(
    (widest, word) => Math.max(widest, word.getBoundingClientRect().width),
    0,
  );

  if (widestWordAtCurrentSize <= 0) return;

  const widestWordAtMaxSize = widestWordAtCurrentSize * (CASE_TITLE_MAX_FONT_SIZE_PX / currentFontSize);
  const availableWidth = Math.max(0, title.clientWidth - 1);
  const fittedSize = Math.min(
    CASE_TITLE_MAX_FONT_SIZE_PX,
    Math.max(
      CASE_TITLE_MIN_FONT_SIZE_PX,
      Math.floor((CASE_TITLE_MAX_FONT_SIZE_PX * availableWidth * 10) / widestWordAtMaxSize) / 10,
    ),
  );

  title.style.setProperty("--case-title-font-size", `${fittedSize}px`);
}

let maxStatsLetters = 0;

if (shouldRunHeroIntroAnimation()) {
  const heroAnimationDelay = hasHeroVideoPlayed ? 0 : GLOBAL_ANIMATION_DELAY_MS;
  const heroHighlightDelay = hasHeroVideoPlayed ? HIGHLIGHT_DELAY_MS - GLOBAL_ANIMATION_DELAY_MS : HIGHLIGHT_DELAY_MS;

  statsTargets.forEach((element) => {
    const count = buildTextRoll(element, heroAnimationDelay);
    maxStatsLetters = Math.max(maxStatsLetters, count);
  });

  const delayedStart = Math.max(
    0,
    heroAnimationDelay + ANIMATION_DURATION_MS + maxStatsLetters * LETTER_DELAY_MS + AFTER_STATS_PAUSE_MS - TEXT_OVERLAP_MS
  );

  const subtitleLetters = subtitleTarget ? buildTextRoll(subtitleTarget, delayedStart, TEXT_LETTER_DELAY_MS) : 0;
  const heroCopyStart = delayedStart + ANIMATION_DURATION_MS + subtitleLetters * TEXT_LETTER_DELAY_MS + AFTER_TEXT_PAUSE_MS;

  messengerLinkTargets.forEach((link) => {
    const underlinedLink = attachDelayedUnderline(link);

    setTimeout(() => {
      underlinedLink.classList.add("is-underlined");
    }, heroHighlightDelay);
  });

  if (heroCopyTarget) {
    buildTextRoll(heroCopyTarget, heroCopyStart, TEXT_LETTER_DELAY_MS, HERO_HIGHLIGHT_TEXT);

    const delayedUnderline = heroCopyTarget.querySelector(".delayed-underline");

    if (delayedUnderline) {
      setTimeout(() => {
        delayedUnderline.classList.add("is-underlined");
      }, heroHighlightDelay);
    }
  }
}

document.documentElement.classList.remove("is-hero-intro-pending");

function startReturningHeroTopicCycle() {
  if (!returningHeroTopic || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let topicIndex = 0;

  window.setInterval(() => {
    returningHeroTopic.classList.remove("is-writing");
    returningHeroTopic.classList.add("is-erasing");

    window.setTimeout(() => {
      topicIndex = (topicIndex + 1) % RETURNING_HERO_TOPICS.length;
      returningHeroTopic.textContent = RETURNING_HERO_TOPICS[topicIndex];
      returningHeroTopic.classList.remove("is-erasing");
      void returningHeroTopic.offsetWidth;
      returningHeroTopic.classList.add("is-writing");
    }, RETURNING_HERO_TOPIC_ERASE_MS);
  }, RETURNING_HERO_TOPIC_INTERVAL_MS);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = text;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  document.body.append(temporaryInput);
  temporaryInput.select();

  const copied = document.execCommand("copy");
  temporaryInput.remove();

  if (!copied) throw new Error("Clipboard copy failed");
}

const copyLoginButton = document.querySelector("[data-copy-login]");
const copyLoginStatus = document.querySelector("[data-copy-login-status]");
let copyLoginStatusTimeout;

if (copyLoginButton && copyLoginStatus) {
  copyLoginButton.addEventListener("click", async () => {
    const login = copyLoginButton.dataset.copyLogin;

    try {
      await copyTextToClipboard(login);
      copyLoginStatus.textContent = "Скопировано";
    } catch {
      copyLoginStatus.textContent = "Не удалось скопировать";
    }

    copyLoginStatus.hidden = false;
    window.clearTimeout(copyLoginStatusTimeout);
    copyLoginStatusTimeout = window.setTimeout(() => {
      copyLoginStatus.hidden = true;
    }, 1800);
  });
}

if (hasHeroVideoPlayed) {
  let returningHeroTitleAnimationEndDelay = 0;

  if (returningHeroTitle && shouldRunHeroIntroAnimation()) {
    const titleLetterCount = buildTextRoll(returningHeroTitle);
    returningHeroTitleAnimationEndDelay = ANIMATION_DURATION_MS + Math.max(0, titleLetterCount - 1) * LETTER_DELAY_MS;
  }

  if (returningHeroEyebrow) {
    window.setTimeout(() => {
      returningHeroEyebrow.classList.add("is-marker-drawn");
    }, returningHeroTitleAnimationEndDelay || 750);
  }

  startReturningHeroTopicCycle();

  document.querySelectorAll("[data-returning-hero-underline]").forEach((element) => {
    const underlinedElement = attachDelayedUnderline(element);
    const underlineDelay = returningHeroTitleAnimationEndDelay;

    requestAnimationFrame(() => {
      window.setTimeout(() => {
        underlinedElement.classList.add("is-underlined");
      }, underlineDelay);
    });
  });
}

if (workCards.length > 0) {
  workResultTargets.forEach(attachDelayedUnderline);

  workCards.forEach((card) => {
    card.querySelectorAll("li").forEach((item) => {
      if (!item.querySelector(".work-tick")) {
        item.prepend(createTickSvg());
      }
    });
  });

  const revealWorkCard = (card) => {
    card.querySelectorAll(".work-card__result > span").forEach((result) => result.classList.add("is-underlined"));
  };

  const revealWorkTicks = (list) => {
    list.classList.add("is-ticked");
  };

  const skipWorkCardAnimation =
    !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const workUnderlineObserver = skipWorkCardAnimation
    ? null
    : new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            const activationLine = entry.rootBounds?.bottom ?? window.innerHeight * 0.6;
            const hasPassedActivationLine = entry.boundingClientRect.top < activationLine;

            if (!entry.isIntersecting && !hasPassedActivationLine) return;

            if (entry.target.matches(".work-card ul")) {
              revealWorkTicks(entry.target);
            } else {
              revealWorkCard(entry.target);
            }

            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -40% 0px", threshold: 0.1 }
      );

  workCards.forEach((card) => {
    const lists = card.querySelectorAll("ul");

    if (skipWorkCardAnimation) {
      revealWorkCard(card);
      lists.forEach(revealWorkTicks);
    } else {
      workUnderlineObserver.observe(card);
      lists.forEach((list) => workUnderlineObserver.observe(list));
    }
  });
}

if (casesLeadHighlight) {
  const underlinedCasesLead = attachDelayedUnderline(casesLeadHighlight);

  if ("IntersectionObserver" in window) {
    const casesLeadUnderlineObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-underlined");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.8 }
    );

    casesLeadUnderlineObserver.observe(underlinedCasesLead);
  } else {
    underlinedCasesLead.classList.add("is-underlined");
  }
}

if (reviewsTextHighlight) {
  const underlinedReviewsText = attachDelayedUnderline(reviewsTextHighlight);

  if ("IntersectionObserver" in window) {
    const reviewsTextUnderlineObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-underlined");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.8 }
    );

    reviewsTextUnderlineObserver.observe(underlinedReviewsText);
  } else {
    underlinedReviewsText.classList.add("is-underlined");
  }
}

if (siteFooterLeadHighlight) {
  const underlinedFooterLead = attachDelayedUnderline(siteFooterLeadHighlight);

  if ("IntersectionObserver" in window) {
    const footerLeadUnderlineObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-underlined");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.8 }
    );

    footerLeadUnderlineObserver.observe(underlinedFooterLead);
  } else {
    underlinedFooterLead.classList.add("is-underlined");
  }
}

if (hero && portraitVideo) {
  const portrait = portraitVideo.closest(".portrait");

  const revealPortraitVideo = () => {
    let didReveal = false;

    const markReady = () => {
      if (didReveal) return;
      didReveal = true;
      portraitVideo.classList.add("is-ready");
      portrait?.classList.add("is-ready");
    };

    const markReadyOnNextPaint = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(markReady);
      });
    };

    if ("requestVideoFrameCallback" in portraitVideo && !portraitVideo.paused) {
      portraitVideo.requestVideoFrameCallback(() => {
        requestAnimationFrame(markReady);
      });
      return;
    }

    if (portraitVideo.paused) {
      markReady();
      return;
    }

    markReadyOnNextPaint();
  };

  const playPortraitVideo = () => {
    portraitVideo.currentTime = 0;
    const playPromise = portraitVideo.play();

    if (playPromise) {
      playPromise.catch(() => {});
    }
  };

  portraitVideo.addEventListener("playing", () => {
    saveHeroVideoPlayed();
    revealPortraitVideo();
  }, { once: true });

  portraitVideo.addEventListener("ended", () => {
    portraitVideo.pause();
  });

  if (hasHeroVideoPlayed) {
    portraitVideo.pause();
  } else {
    playPortraitVideo();
  }
}

const casesShowcase = document.querySelector(".cases-showcase");
const caseFilters = casesShowcase ? casesShowcase.querySelectorAll("[data-case-filter]") : [];
const casesGrid = casesShowcase ? casesShowcase.querySelector("[data-cases-grid]") : null;
const casesEmpty = casesShowcase ? casesShowcase.querySelector("[data-cases-empty]") : null;
const casesLoadMoreButton = casesShowcase ? casesShowcase.querySelector("[data-cases-load-more]") : null;
const caseCategoryOrder = (Array.isArray(window.caseCategories) ? window.caseCategories : [])
  .map((category) => category.id)
  .filter((id) => id !== "all");

function interleaveCasesByCategory(caseItems) {
  const buckets = caseCategoryOrder.map((id) => caseItems.filter((item) => item.category === id));
  const mixed = [];

  while (buckets.some((bucket) => bucket.length > 0)) {
    buckets.forEach((bucket) => {
      if (bucket.length > 0) mixed.push(bucket.shift());
    });
  }

  return mixed.concat(caseItems.filter((item) => !caseCategoryOrder.includes(item.category)));
}

const homepageCases = interleaveCasesByCategory(
  Array.isArray(window.siteCases) ? window.siteCases.filter((caseItem) => caseItem.isFeatured !== false) : [],
);
const FOOTER_SIGNATURE_DRAW_DURATION_MS = 1400;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const footerSignature = document.querySelector(".site-footer__signature");
let caseRevealObserver = null;

let activeCaseCategory = "all";
let visibleCaseCount = 4;

function getHomepageCaseHref(caseItem) {
  return `cases/${caseItem.slug}/`;
}

function getFilteredCases() {
  if (activeCaseCategory === "all") {
    return homepageCases;
  }

  return homepageCases.filter((caseItem) => caseItem.category === activeCaseCategory);
}

function canTiltCaseCard() {
  return !prefersReducedMotion.matches && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function canMoveFooterSignature() {
  return Boolean(footerSignature) && !prefersReducedMotion.matches && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function moveFooterSignature(event) {
  if (!canMoveFooterSignature()) return;

  const rect = footerSignature.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  const moveX = Math.max(-6, Math.min(6, x * 12));
  const moveY = Math.max(-6, Math.min(6, y * 12));
  const rotate = Math.max(-1, Math.min(1, x * 2));

  footerSignature.style.setProperty("--footer-signature-x", `${moveX.toFixed(2)}px`);
  footerSignature.style.setProperty("--footer-signature-y", `${moveY.toFixed(2)}px`);
  footerSignature.style.setProperty("--footer-signature-rotate", `${rotate.toFixed(2)}deg`);
  footerSignature.style.setProperty("--footer-signature-scale", "1.015");
}

function resetFooterSignature() {
  if (!footerSignature) return;

  footerSignature.style.removeProperty("--footer-signature-x");
  footerSignature.style.removeProperty("--footer-signature-y");
  footerSignature.style.removeProperty("--footer-signature-rotate");
  footerSignature.style.removeProperty("--footer-signature-scale");
}

if (footerSignature) {
  footerSignature.addEventListener("pointermove", moveFooterSignature);
  footerSignature.addEventListener("pointerleave", resetFooterSignature);
}

function getFooterSignatureAnimationSource(sourceUrl) {
  return sourceUrl.replace("maxim-signature.svg", "maxim-signature-writing.webp");
}

function initFooterSignatureReveal() {
  const signaturePendingRoot = document.documentElement;

  if (!footerSignature) {
    signaturePendingRoot.classList.remove("is-signature-pending");
    return;
  }

  const staticSignature = footerSignature.querySelector("img.site-footer__signature-image");
  if (!staticSignature) {
    signaturePendingRoot.classList.remove("is-signature-pending");
    return;
  }

  const originalSource = staticSignature.getAttribute("src");
  if (!originalSource) {
    signaturePendingRoot.classList.remove("is-signature-pending");
    return;
  }

  const showSignature = () => {
    signaturePendingRoot.classList.remove("is-signature-pending");
    footerSignature.classList.remove("is-signature-idle");
  };

  footerSignature.classList.add("is-signature-idle");

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    showSignature();
    return;
  }

  const animationSource = getFooterSignatureAnimationSource(originalSource);
  const animationPreload = new Image();
  let animationReady = false;
  let animationQueued = false;
  let animationStarted = false;

  // Пока анимация не началась, место подписи держим пустым: иначе на медленной
  // мобильной сети сначала видно готовую подпись, а потом она заново рисуется.
  const finishDrawing = () => {
    staticSignature.src = originalSource;
    footerSignature.classList.remove("is-signature-writing");
    footerSignature.classList.add("is-signature-written");
  };

  const playAnimation = () => {
    if (animationStarted) return;

    animationStarted = true;
    staticSignature.src = animationSource;
    showSignature();
    footerSignature.classList.add("is-signature-writing");
    window.setTimeout(finishDrawing, FOOTER_SIGNATURE_DRAW_DURATION_MS);
  };

  const startReveal = () => {
    animationQueued = true;
    if (animationReady) {
      playAnimation();
      return;
    }

    // Анимация не догрузилась - не оставляем пустое место навсегда.
    window.setTimeout(() => {
      if (animationStarted) return;
      animationQueued = false;
      showSignature();
    }, 2500);
  };

  animationPreload.addEventListener("load", () => {
    animationReady = true;
    if (animationQueued) playAnimation();
  }, { once: true });

  animationPreload.addEventListener("error", () => {
    animationQueued = false;
    showSignature();
  }, { once: true });

  animationPreload.src = animationSource;
  if (animationPreload.complete && animationPreload.naturalWidth > 0) {
    animationReady = true;
  }

  const signatureRevealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        observer.unobserve(entry.target);
        startReveal();
      });
    },
    { threshold: 0.2 },
  );

  signatureRevealObserver.observe(footerSignature);
}

initFooterSignatureReveal();

// Портрет в "Обо мне": цветное пятно доступно только при точном курсоре.
const aboutPhotoStack = document.querySelector(".about__photo-stack");

function setAboutSpot(x, y) {
  aboutPhotoStack.style.setProperty("--about-spot-x", `${x.toFixed(1)}%`);
  aboutPhotoStack.style.setProperty("--about-spot-y", `${y.toFixed(1)}%`);
}

if (aboutPhotoStack && !prefersReducedMotion.matches) {
  if (window.matchMedia("(min-width: 721px) and (hover: hover) and (pointer: fine)").matches) {
    aboutPhotoStack.addEventListener("pointermove", (event) => {
      const rect = aboutPhotoStack.getBoundingClientRect();
      setAboutSpot(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
    });
    aboutPhotoStack.addEventListener("pointerenter", () => aboutPhotoStack.classList.add("is-lit"));
    aboutPhotoStack.addEventListener("pointerleave", () => aboutPhotoStack.classList.remove("is-lit"));
  }
}

function moveCaseCard(event) {
  if (!canTiltCaseCard()) return;

  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const rotateX = ((0.5 - y) * 4).toFixed(2);
  const rotateY = ((x - 0.5) * 6).toFixed(2);

  card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
}

function resetCaseCard(event) {
  event.currentTarget.style.transform = "";
}

// Карточки блога не наклоняются: в них лежат скриншоты с мелким текстом, а любой
// сдвиг заставляет браузер пересчитать пиксели, и текст мылится. Вместо движения
// под курсором ходит тень. Свет как будто идёт от курсора, поэтому тень падает в
// противоположную сторону. Постоянные 8px вниз держат карточку лежащей на бумаге
// даже когда курсор у верхнего края.
function moveBlogCardShadow(event) {
  if (!canTiltCaseCard()) return;

  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  card.style.setProperty("--shadow-x", `${(x * -18).toFixed(1)}px`);
  card.style.setProperty("--shadow-y", `${(y * -14 + 8).toFixed(1)}px`);
}

function resetBlogCardShadow(event) {
  event.currentTarget.style.removeProperty("--shadow-x");
  event.currentTarget.style.removeProperty("--shadow-y");
}

// Отсчёт цифр в карточке кейса при наведении. Числа один раз оборачиваются в span,
// дальше hover гоняет по ним общий rAF-цикл.
// В TT Masters цифры пропорциональные: при 45px "1" занимает 14px, а "8" и "0" - 22px.
// Пока число крутится, строка дышит на десятки пикселей и хвост ездит туда-сюда. Лечится
// только постоянным резервом ширины под самый широкий кадр отсчёта: в покое и во время
// анимации макет одинаковый, двигаться нечему. Резерв считаем в пикселях - ch в этом
// шрифте резолвится в ноль. Валюту и "+" забираем внутрь span, чтобы запас ширины падал
// в межсловный пробел, а не разрывал "126₽".
// Группы тысяч ("656 000") идут первой альтернативой, иначе съедалась бы только "656".
const COUNT_PATTERN = /(\d+(?:[\s ]\d{3})+|\d+(?:[.,]\d+)?)([₽€$%+]?)/g;
const DESKTOP_COUNT_DURATION_MS = 900;
const MOBILE_COUNT_DURATION_MS = 1350;
const mobileCaseViewport = window.matchMedia("(max-width: 720px)");
const COUNT_SAMPLES = 256;
const COUNT_CHARS = "0123456789.,  ₽€$%+";
const COUNT_TARGETS =
  ".case-card__title, .case-card__result, .related-card__title, .related-card__result, " +
  ".case-metric strong, .case-hero__result";
const countFrames = new WeakMap();
const charWidthCache = new Map();

// У цифр нет кернинга, поэтому ширина строки - обычная сумма ширин символов.
// Один замер на шрифт вместо тысяч обращений к layout.
function getCharWidths(element) {
  const style = getComputedStyle(element);
  const key = `${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${style.fontStyle}|${style.letterSpacing}`;
  const cached = charWidthCache.get(key);

  if (cached) return cached;

  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre";
  probe.style.fontFamily = style.fontFamily;
  probe.style.fontSize = style.fontSize;
  probe.style.fontWeight = style.fontWeight;
  probe.style.fontStyle = style.fontStyle;
  probe.style.letterSpacing = style.letterSpacing;
  document.body.append(probe);

  const widths = new Map();
  Array.from(COUNT_CHARS).forEach((char) => {
    probe.textContent = char;
    widths.set(char, probe.getBoundingClientRect().width);
  });

  probe.remove();
  charWidthCache.set(key, widths);
  return widths;
}

function parseCount(span) {
  const raw = span.dataset.count;
  const separatorMatch = raw.match(/[.,](?=\d+$)/);

  return {
    raw,
    suffix: span.dataset.countSuffix || "",
    value: Number(raw.replace(/[\s ]/g, "").replace(",", ".")),
    separator: separatorMatch ? separatorMatch[0] : ",",
    decimals: separatorMatch ? raw.length - raw.indexOf(separatorMatch[0]) - 1 : 0,
    grouped: /[\s ]/.test(raw),
  };
}

function formatCount(count, value) {
  const [whole, fraction] = value.toFixed(count.decimals).split(".");
  const grouped = count.grouped ? whole.replace(/\B(?=(\d{3})+$)/g, " ") : whole;

  return `${grouped}${fraction ? count.separator + fraction : ""}${count.suffix}`;
}

function reserveCountWidth(span) {
  const count = parseCount(span);
  const widths = getCharWidths(span);
  let widest = 0;

  // Перебираем значения, а не кадры: так резерв не зависит от кривой easing.
  for (let sample = 0; sample <= COUNT_SAMPLES; sample += 1) {
    const text = formatCount(count, (count.value * sample) / COUNT_SAMPLES);
    let width = 0;

    for (const char of text) {
      width += widths.get(char) || 0;
    }

    if (width > widest) widest = width;
  }

  span.style.minWidth = `${Math.ceil(widest)}px`;
}

function wrapCardNumbers(card) {
  card.querySelectorAll(COUNT_TARGETS).forEach((element) => {
    Array.from(element.childNodes).forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE || !COUNT_PATTERN.test(node.nodeValue)) return;

      COUNT_PATTERN.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      while ((match = COUNT_PATTERN.exec(node.nodeValue)) !== null) {
        const span = document.createElement("span");
        span.className = "case-count";
        span.dataset.count = match[1];
        span.dataset.countSuffix = match[2];
        span.textContent = match[0];
        fragment.append(node.nodeValue.slice(lastIndex, match.index), span);
        lastIndex = match.index + match[0].length;
      }

      fragment.append(node.nodeValue.slice(lastIndex));
      node.replaceWith(fragment);
    });
  });
}

function stopCountUp(event) {
  const card = event.currentTarget;
  const frame = countFrames.get(card);

  if (frame) {
    window.cancelAnimationFrame(frame);
    countFrames.delete(card);
  }

  card.querySelectorAll(".case-count").forEach((span) => {
    span.textContent = `${span.dataset.count}${span.dataset.countSuffix}`;
  });
}

// Сам отсчёт не знает, кто его запустил: на карточке это курсор, на странице кейса -
// прокрутка. Проверка на мышь живёт в обработчике наведения, а не здесь.
function runCountUp(container, duration = DESKTOP_COUNT_DURATION_MS) {
  const spans = Array.from(container.querySelectorAll(".case-count"));

  if (spans.length === 0) return;

  const previousFrame = countFrames.get(container);
  if (previousFrame) window.cancelAnimationFrame(previousFrame);

  const counts = spans.map(parseCount);
  spans.forEach((span) => {
    if (!span.style.minWidth) reserveCountWidth(span);
  });

  const startedAt = performance.now();

  const step = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);

    spans.forEach((span, index) => {
      const count = counts[index];

      if (progress >= 1) {
        span.textContent = `${count.raw}${count.suffix}`;
        return;
      }

      // Числа до 10 - это два-три кадра, ease-out склеил бы их в рывок в самом начале.
      const eased = count.value < 10 && count.decimals === 0 ? progress : 1 - (1 - progress) ** 3;
      span.textContent = formatCount(count, count.value * eased);
    });

    if (progress < 1) {
      countFrames.set(container, window.requestAnimationFrame(step));
      return;
    }

    countFrames.delete(container);
  };

  countFrames.set(container, window.requestAnimationFrame(step));
}

function startCountUp(event) {
  if (!canTiltCaseCard() || mobileCaseViewport.matches) return;

  runCountUp(event.currentTarget, DESKTOP_COUNT_DURATION_MS);
}

function prepareCountUp(card) {
  // На мобильном отсчёт запустится при появлении карточки, на ПК - при наведении.
  if (prefersReducedMotion.matches || (!mobileCaseViewport.matches && !canTiltCaseCard())) return;

  wrapCardNumbers(card);

  const spans = card.querySelectorAll(".case-count");
  if (spans.length === 0) return;

  // Меряем только после загрузки TT Masters, иначе ширины будут от запасного шрифта.
  document.fonts.ready.then(() => spans.forEach(reserveCountWidth));

  if (mobileCaseViewport.matches) return;

  card.addEventListener("mouseenter", startCountUp);
  card.addEventListener("focus", startCountUp);
  card.addEventListener("mouseleave", stopCountUp);
  card.addEventListener("blur", stopCountUp);
}

function startMobileCountUp(card) {
  if (
    !card ||
    prefersReducedMotion.matches ||
    !mobileCaseViewport.matches ||
    card.dataset.mobileCountPlayed === "true"
  ) {
    return;
  }

  card.dataset.mobileCountPlayed = "true";
  runCountUp(card, MOBILE_COUNT_DURATION_MS);
}

function createCaseCard(caseItem) {
  const wrapper = document.createElement("div");
  const card = document.createElement("a");
  const top = document.createElement("span");
  const title = document.createElement("h3");
  const result = document.createElement("p");
  const channel = document.createElement("span");
  const more = document.createElement("span");

  wrapper.className = "case-card-reveal";
  card.className = "case-card";
  card.href = getHomepageCaseHref(caseItem);
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  top.className = "case-card__category";
  title.className = "case-card__title";
  result.className = "case-card__result";
  channel.className = "case-card__channel";
  more.className = "case-card__more";

  top.textContent = caseItem.categoryLabel;
  title.textContent = caseItem.title;
  result.textContent = caseItem.shortResult;
  channel.textContent = `Канал: ${caseItem.channel}`;
  more.textContent = "Подробнее";
  attachDelayedUnderline(more);

  card.append(top, title, result, channel, more);
  card.addEventListener("mousemove", moveCaseCard);
  card.addEventListener("mouseleave", resetCaseCard);
  wrapper.append(card);
  applyTypography(wrapper);
  prepareCountUp(card);

  return wrapper;
}

function observeCaseCards(revealItems = casesGrid ? casesGrid.querySelectorAll(".case-card-reveal:not(.is-visible)") : [], shouldReset = true) {
  const items = Array.from(revealItems);

  if (shouldReset && caseRevealObserver) {
    caseRevealObserver.disconnect();
    caseRevealObserver = null;
  }

  if (prefersReducedMotion.matches) {
    items.forEach((item) => {
      item.classList.add("is-visible");
      item.style.removeProperty("--reveal-delay");
    });
    return;
  }

  if (!caseRevealObserver) {
    caseRevealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          startMobileCountUp(entry.target.querySelector(".case-card"));
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.14 }
    );
  }

  items.forEach((item, index) => {
    if (!item.style.getPropertyValue("--reveal-delay")) {
      item.style.setProperty("--reveal-delay", `${Math.min(index * 90, 360)}ms`);
    }

    if (caseRevealObserver) {
      caseRevealObserver.observe(item);
    }
  });
}

function appendCaseCards(caseItems, startIndex = 0) {
  if (!casesGrid || caseItems.length === 0) return;

  const newCards = [];

  caseItems.forEach((caseItem, index) => {
    const card = createCaseCard(caseItem);
    card.style.setProperty("--reveal-delay", `${Math.min((startIndex + index) * 90, 360)}ms`);
    casesGrid.append(card);
    newCards.push(card);
  });

  observeCaseCards(newCards, false);
}

function resetCaseRevealObserver() {
  if (!caseRevealObserver) return;

  caseRevealObserver.disconnect();
  caseRevealObserver = null;
}

function updateCasesControls(filteredCases) {
  if (casesEmpty) {
    casesEmpty.hidden = filteredCases.length > 0;
  }

  if (casesLoadMoreButton) {
    casesLoadMoreButton.hidden = visibleCaseCount >= filteredCases.length;
  }

  updateCaseFilters();
}

function updateCaseFilters() {
  caseFilters.forEach((button) => {
    const isActive = button.dataset.caseFilter === activeCaseCategory;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function animateCaseFilterSelection(button) {
  if (prefersReducedMotion.matches) return;

  caseFilters.forEach((filter) => filter.classList.remove("is-selecting"));
  void button.offsetWidth;
  button.classList.add("is-selecting");
  button.addEventListener("animationend", (event) => {
    if (event.animationName === "case-filter-settle" && event.pseudoElement === "::before") {
      button.classList.remove("is-selecting");
    }
  }, { once: true });
}

function animateCasesLoadMore() {
  if (!casesLoadMoreButton || prefersReducedMotion.matches) return;

  casesLoadMoreButton.classList.remove("is-loading-more");
  void casesLoadMoreButton.offsetWidth;
  casesLoadMoreButton.classList.add("is-loading-more");
  casesLoadMoreButton.addEventListener("animationend", (event) => {
    if (event.animationName === "case-filter-settle" && event.pseudoElement === "::before") {
      casesLoadMoreButton.classList.remove("is-loading-more");
    }
  }, { once: true });
}

function addCaseControlRays(button) {
  if (button.querySelector(".case-control-rays")) return;

  const rays = document.createElement("span");
  rays.className = "case-control-rays";
  rays.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 3; index += 1) {
    const ray = document.createElement("span");
    ray.className = "case-control-ray";
    rays.append(ray);
  }

  button.append(rays);
}

function renderCases() {
  if (!casesGrid) return;

  const filteredCases = getFilteredCases();
  const visibleCases = filteredCases.slice(0, visibleCaseCount);

  resetCaseRevealObserver();
  casesGrid.textContent = "";
  appendCaseCards(visibleCases);
  updateCasesControls(filteredCases);
}

caseFilters.forEach((button) => {
  addCaseControlRays(button);

  button.addEventListener("click", () => {
    const nextCaseCategory = button.dataset.caseFilter || "all";
    const categoryChanged = nextCaseCategory !== activeCaseCategory;

    activeCaseCategory = nextCaseCategory;
    visibleCaseCount = 4;
    renderCases();

    if (categoryChanged) animateCaseFilterSelection(button);
  });
});

if (casesLoadMoreButton) {
  addCaseControlRays(casesLoadMoreButton);

  casesLoadMoreButton.addEventListener("click", () => {
    const filteredCases = getFilteredCases();
    const previousVisibleCount = visibleCaseCount;
    visibleCaseCount += 6;
    appendCaseCards(filteredCases.slice(previousVisibleCount, visibleCaseCount), previousVisibleCount);
    updateCasesControls(filteredCases);
    animateCasesLoadMore();
  });
}

renderCases();

// Похожие кейсы на странице кейса: case-page.js рендерит их синхронно и выполняется
// раньше script.js, так что к этому моменту карточки уже в DOM.
document.querySelectorAll(".related-card").forEach(prepareCountUp);

// Блог: карточки лежат прямо в разметке, поэтому эффекты вешаем здесь - появление
// при скролле и тень под курсором. Пагинация остаётся обычной HTML-навигацией:
// так каждая страница имеет постоянный URL для пользователей и поисковых роботов.
const blogList = document.querySelector(".blog-list");

if (blogList) {
  blogList.querySelectorAll(".blog-card").forEach((card) => {
    card.addEventListener("mousemove", moveBlogCardShadow);
    card.addEventListener("mouseleave", resetBlogCardShadow);
  });

  // shouldReset = false: наблюдатель общий с главной, сбрасывать его нечего.
  observeCaseCards(blogList.querySelectorAll(".case-card-reveal"), false);

}

// Поиск по статьям. Список заголовков лежит прямо в странице (data-blog-index),
// поэтому подсказки появляются без запроса к серверу и ищут по всему архиву, а
// не только по текущей странице пагинации.
const blogSearch = document.querySelector("[data-blog-search]");
const blogIndexScript = document.querySelector("[data-blog-index]");

if (blogSearch && blogIndexScript) {
  const searchInput = blogSearch.querySelector(".blog-search__input");
  const searchResults = blogSearch.querySelector("[data-blog-search-results]");
  const searchIndex = JSON.parse(blogIndexScript.textContent);
  // Приводим к нижнему регистру и убираем "ё": иначе "еще" не найдёт "ещё".
  const normalize = (text) => text.toLowerCase().replace(/ё/g, "е");

  const renderSearchResults = () => {
    const words = normalize(searchInput.value.trim()).split(/\s+/).filter(Boolean);

    if (!words.length) {
      searchResults.hidden = true;
      searchResults.textContent = "";
      return;
    }

    const found = searchIndex
      .filter((item) => words.every((word) => normalize(item.t).includes(word)))
      .slice(0, 8);

    searchResults.hidden = false;
    searchResults.textContent = "";

    if (!found.length) {
      const empty = document.createElement("p");
      empty.className = "blog-search__empty";
      empty.textContent = "Ничего не нашлось";
      searchResults.append(empty);
      return;
    }

    for (const item of found) {
      const link = document.createElement("a");
      link.className = "blog-search__result";
      link.href = item.u;
      link.textContent = item.t;
      searchResults.append(link);
    }
  };

  searchInput.addEventListener("input", renderSearchResults);

  // Стрелками ходим по подсказкам обычным фокусом: браузер сам откроет ссылку
  // по Enter, отдельная обработка выбора не нужна.
  blogSearch.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      searchResults.hidden = true;
      searchInput.focus();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const items = [searchInput, ...searchResults.querySelectorAll(".blog-search__result")];
    const current = items.indexOf(document.activeElement);
    if (current === -1) return;

    const next = items[current + (event.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;

    event.preventDefault();
    next.focus();
  });

  blogSearch.addEventListener("focusout", () => {
    // Ждём кадр: иначе подсказки исчезнут раньше, чем сработает клик по ссылке.
    requestAnimationFrame(() => {
      if (!blogSearch.contains(document.activeElement)) searchResults.hidden = true;
    });
  });

  searchInput.addEventListener("focus", renderSearchResults);
}

function setHandDrawnNavIcon(button, direction) {
  const arrowPath = direction === "prev"
    ? "M29.4 15.7C26.7 18.3 23.5 21.1 20.4 24.3C23.1 27.1 26 30 28.8 32.6"
    : "M18.6 15.7C21.3 18.3 24.5 21.1 27.6 24.3C24.9 27.1 22 30 19.2 32.6";

  button.classList.add("hand-drawn-nav", `hand-drawn-nav--${direction}`);
  button.innerHTML = `
    <svg class="hand-drawn-nav__art" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path class="hand-drawn-nav__paper" d="M24.7 4.1C36.6 3.3 43.1 12.7 43.8 23.4C44.4 34.5 35.8 43.6 24.4 44C12.9 44.4 3.8 36 4.5 24.7C5.2 13.1 13 4.8 24.7 4.1Z" />
      <path class="hand-drawn-nav__ring" d="M24.7 4.1C36.6 3.3 43.1 12.7 43.8 23.4C44.4 34.5 35.8 43.6 24.4 44C12.9 44.4 3.8 36 4.5 24.7C5.2 13.1 13 4.8 24.7 4.1Z" />
      <path class="hand-drawn-nav__ring hand-drawn-nav__ring--echo" d="M23.9 4.8C34.9 3.7 43.9 12 43.2 24.6C42.6 36.2 34.9 43.1 23.3 43.5C12.3 43.8 4.8 35.9 4.8 23.5C4.9 12.2 13 5.9 23.9 4.8Z" />
      <path class="hand-drawn-nav__arrow" d="${arrowPath}" />
    </svg>`;
}

const reviewsData = [
  { src: "images/reviews/review-01.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 1", width: 583, height: 362 },
  { src: "images/reviews/review-02.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 2", width: 576, height: 1280 },
  { src: "images/reviews/review-03.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 3", width: 576, height: 1280 },
  { src: "images/reviews/review-04.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 4", width: 1228, height: 1024 },
  { src: "images/reviews/review-05.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 5", width: 1219, height: 511 },
  { src: "images/reviews/review-06.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 6", width: 576, height: 1280 },
  { src: "images/reviews/review-07.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 7", width: 576, height: 1280 },
  { src: "images/reviews/review-08.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 8", width: 1221, height: 253 },
  { src: "images/reviews/review-09.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 9", width: 933, height: 830 },
];

const reviewsGallery = document.querySelector("[data-reviews-gallery]");

if (reviewsGallery && reviewsData.length > 0) {
  let activeReviewIndex = 0;
  let reviewLightboxIndex = 0;
  let reviewLightboxTrigger = null;

  const reviewStage = document.createElement("div");
  const reviewPrev = document.createElement("button");
  const reviewNext = document.createElement("button");
  const reviewProgress = document.createElement("div");
  const reviewItems = [];
  const reviewDots = [];

  reviewStage.className = "reviews-gallery__stage";
  reviewProgress.className = "reviews-gallery__progress";
  reviewPrev.className = "reviews-gallery__nav reviews-gallery__nav--prev";
  reviewNext.className = "reviews-gallery__nav reviews-gallery__nav--next";
  reviewPrev.type = "button";
  reviewNext.type = "button";
  setHandDrawnNavIcon(reviewPrev, "prev");
  setHandDrawnNavIcon(reviewNext, "next");
  reviewPrev.setAttribute("aria-label", "Показать предыдущий отзыв");
  reviewNext.setAttribute("aria-label", "Показать следующий отзыв");

  const reviewLightbox = document.createElement("div");
  const reviewLightboxBackdrop = document.createElement("button");
  const reviewLightboxFigure = document.createElement("figure");
  const reviewLightboxImage = document.createElement("img");
  const reviewLightboxCounter = document.createElement("figcaption");
  const reviewLightboxClose = document.createElement("button");
  const reviewLightboxPrev = document.createElement("button");
  const reviewLightboxNext = document.createElement("button");

  reviewLightbox.className = "reviews-lightbox";
  reviewLightbox.hidden = true;
  reviewLightbox.setAttribute("role", "dialog");
  reviewLightbox.setAttribute("aria-modal", "true");
  reviewLightbox.setAttribute("aria-label", "Просмотр отзыва");
  reviewLightboxBackdrop.className = "reviews-lightbox__backdrop";
  reviewLightboxBackdrop.type = "button";
  reviewLightboxBackdrop.setAttribute("aria-label", "Закрыть отзыв");
  reviewLightboxFigure.className = "reviews-lightbox__figure";
  reviewLightboxImage.className = "reviews-lightbox__image";
  reviewLightboxImage.decoding = "async";
  reviewLightboxCounter.className = "reviews-lightbox__counter";
  reviewLightboxClose.className = "reviews-lightbox__close";
  reviewLightboxPrev.className = "reviews-lightbox__nav reviews-lightbox__nav--prev";
  reviewLightboxNext.className = "reviews-lightbox__nav reviews-lightbox__nav--next";
  reviewLightboxClose.type = "button";
  reviewLightboxPrev.type = "button";
  reviewLightboxNext.type = "button";
  reviewLightboxClose.textContent = "×";
  setHandDrawnNavIcon(reviewLightboxPrev, "prev");
  setHandDrawnNavIcon(reviewLightboxNext, "next");
  reviewLightboxClose.setAttribute("aria-label", "Закрыть отзыв");
  reviewLightboxPrev.setAttribute("aria-label", "Показать предыдущий отзыв");
  reviewLightboxNext.setAttribute("aria-label", "Показать следующий отзыв");

  reviewLightboxFigure.append(reviewLightboxImage, reviewLightboxCounter);
  reviewLightbox.append(
    reviewLightboxBackdrop,
    reviewLightboxFigure,
    reviewLightboxPrev,
    reviewLightboxNext,
    reviewLightboxClose
  );
  document.body.append(reviewLightbox);

  function getReviewOffset(index) {
    const total = reviewsData.length;
    let offset = index - activeReviewIndex;

    if (total > 2) {
      if (offset > total / 2) offset -= total;
      if (offset < total / -2) offset += total;
    }

    return offset;
  }

  function updateReviewsGallery() {
    const hasControls = reviewsData.length > 2;

    reviewItems.forEach(({ item, button }, index) => {
      const offset = getReviewOffset(index);
      const absOffset = Math.abs(offset);
      const isActive = offset === 0;
      const clampedOffset = Math.max(-2, Math.min(2, offset));
      const x = clampedOffset * 230;
      const scale = isActive ? 1 : absOffset === 1 ? 0.82 : 0.68;
      const rotateY = isActive ? 0 : clampedOffset < 0 ? 12 : -12;
      const opacity = isActive ? 1 : absOffset === 1 ? 0.48 : 0;

      item.style.zIndex = String(10 - absOffset);
      button.style.opacity = String(opacity);
      button.style.filter = isActive ? "none" : "saturate(0.86)";
      button.style.pointerEvents = absOffset <= 1 ? "auto" : "none";
      button.style.setProperty("--reviews-x", `${x}px`);
      button.style.setProperty("--reviews-scale", String(scale));
      button.style.setProperty(
        "--reviews-transform",
        `translate(-50%, -50%) translateX(${x}px) scale(${scale}) rotateY(${rotateY}deg)`
      );
      button.setAttribute("aria-current", String(isActive));
      button.classList.remove("is-tilting");
      button.setAttribute("tabindex", absOffset <= 1 ? "0" : "-1");
      button.style.removeProperty("--tilt-rotate-x");
      button.style.removeProperty("--tilt-rotate-y");
      button.style.removeProperty("--tilt-lift");
    });

    reviewDots.forEach((dot, index) => {
      const isActive = index === activeReviewIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", String(isActive));
    });

    reviewPrev.hidden = !hasControls;
    reviewNext.hidden = !hasControls;
    reviewProgress.hidden = reviewsData.length <= 1;
  }

  function setActiveReview(index) {
    activeReviewIndex = (index + reviewsData.length) % reviewsData.length;
    updateReviewsGallery();
  }

  function clearReviewLightboxLoading() {
    reviewLightbox.classList.remove("is-loading");
  }

  reviewLightboxImage.addEventListener("load", clearReviewLightboxLoading);
  reviewLightboxImage.addEventListener("error", clearReviewLightboxLoading);

  function showReviewLightboxImage(index) {
    reviewLightboxIndex = (index + reviewsData.length) % reviewsData.length;
    const review = reviewsData[reviewLightboxIndex];
    reviewLightboxImage.src = review.src;
    reviewLightboxImage.alt = review.alt;
    reviewLightboxImage.width = review.width;
    reviewLightboxImage.height = review.height;
    reviewLightboxCounter.textContent = `${reviewLightboxIndex + 1} / ${reviewsData.length}`;
    reviewLightbox.classList.toggle(
      "is-loading",
      !(reviewLightboxImage.complete && reviewLightboxImage.naturalWidth > 0)
    );
  }

  function handleReviewLightboxKeydown(event) {
    if (event.key === "Escape") {
      closeReviewLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      showReviewLightboxImage(reviewLightboxIndex - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      showReviewLightboxImage(reviewLightboxIndex + 1);
    }
  }

  function openReviewLightbox(index, trigger) {
    reviewLightboxTrigger = trigger;
    showReviewLightboxImage(index);
    reviewLightbox.hidden = false;
    document.body.classList.add("has-lightbox");
    window.addEventListener("keydown", handleReviewLightboxKeydown);
    requestAnimationFrame(() => {
      reviewLightbox.classList.add("is-open");
      reviewLightboxClose.focus();
    });
  }

  function closeReviewLightbox() {
    reviewLightbox.classList.remove("is-open");
    document.body.classList.remove("has-lightbox");
    window.removeEventListener("keydown", handleReviewLightboxKeydown);

    setTimeout(() => {
      reviewLightbox.hidden = true;
      if (reviewLightboxTrigger) {
        reviewLightboxTrigger.focus();
      }
      reviewLightboxTrigger = null;
    }, 180);
  }

  reviewsData.forEach((review, index) => {
    const item = document.createElement("div");
    const button = document.createElement("button");
    const image = document.createElement("img");
    const dot = document.createElement("button");

    item.className = "reviews-gallery__item";
    button.className = "reviews-gallery__button";
    button.type = "button";
    button.setAttribute("aria-label", "Открыть отзыв в полном размере");
    image.className = "reviews-gallery__image";
    image.src = review.src;
    image.alt = review.alt;
    image.decoding = "async";
    image.loading = "lazy";
    image.width = review.width;
    image.height = review.height;

    dot.className = "reviews-gallery__dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Показать отзыв ${index + 1}`);
    button.setAttribute("data-lightbox-index", String(index));

    button.addEventListener("click", () => {
      openReviewLightbox(index, button);
    });

    button.addEventListener("pointermove", (event) => {
      if (prefersReducedMotion.matches) return;
      if (button.getAttribute("aria-current") !== "true") return;

      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      const rotateX = Math.max(-1, Math.min(1, -y)) * 5;
      const rotateY = Math.max(-1, Math.min(1, x)) * 8;

      button.classList.add("is-tilting");
      button.style.setProperty("--tilt-rotate-x", `${rotateX.toFixed(2)}deg`);
      button.style.setProperty("--tilt-rotate-y", `${rotateY.toFixed(2)}deg`);
      button.style.setProperty("--tilt-lift", "14px");
    });

    button.addEventListener("pointerleave", () => {
      button.classList.remove("is-tilting");
      button.style.removeProperty("--tilt-rotate-x");
      button.style.removeProperty("--tilt-rotate-y");
      button.style.removeProperty("--tilt-lift");
    });

    dot.addEventListener("click", () => {
      setActiveReview(index);
    });

    button.append(image);
    item.append(button);
    reviewStage.append(item);
    reviewProgress.append(dot);
    reviewItems.push({ item, button });
    reviewDots.push(dot);
  });

  reviewPrev.addEventListener("click", () => setActiveReview(activeReviewIndex - 1));
  reviewNext.addEventListener("click", () => setActiveReview(activeReviewIndex + 1));
  reviewLightboxBackdrop.addEventListener("click", closeReviewLightbox);
  reviewLightboxClose.addEventListener("click", closeReviewLightbox);
  reviewLightboxPrev.addEventListener("click", () => showReviewLightboxImage(reviewLightboxIndex - 1));
  reviewLightboxNext.addEventListener("click", () => showReviewLightboxImage(reviewLightboxIndex + 1));

  reviewsGallery.append(reviewStage, reviewPrev, reviewNext, reviewProgress);
  updateReviewsGallery();
}

// Один проход по готовой странице: на главной карточки кейсов к этому моменту
// отрисованы, на странице кейса case-page.js уже собрал контент.
applyTypography(document);

// Все таблицы внутри статей приводим к одному адаптивному представлению.
// На телефоне CSS превращает строки в карточки, а подписи колонок берутся
// из data-label, чтобы сравнение не превращалось в неясный набор строк.
function prepareArticleTables() {
  document.querySelectorAll(".article-page .legal-document table:not(.mediaplan-table)").forEach((table) => {
    table.classList.add("article-table");

    if (!table.parentElement.classList.contains("article-table-wrap")) {
      const wrap = document.createElement("div");
      wrap.className = "article-table-wrap";
      table.before(wrap);
      wrap.append(table);
    }

    const labels = Array.from(table.querySelectorAll("thead th"), (heading) =>
      heading.textContent.trim()
    );

    table.querySelectorAll("tbody tr").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (cell.tagName === "TD" && labels[index]) {
          cell.dataset.label = labels[index];
        }
      });
    });
  });
}

prepareArticleTables();

// Заголовки секций перекатываются по буквам, как хиро. Разбор идёт здесь, сразу после
// типографики и до первой отрисовки: буквы уже стоят в DOM невидимые и на паузе, а
// IntersectionObserver только снимает паузу. Разбирать под скроллом нельзя - переписывать
// заголовок на сотню спанов в момент пересечения и есть тот дёрганый подмен текста.
const sectionTitles = document.querySelectorAll(
  "#work-scope-title, #about-title, #cases-title, #reviews-title, #footer-contacts-title, " +
    ".case-detail h1, .case-detail h2, .case-detail h3"
);

sectionTitles.forEach((title) => {
  title.classList.add("is-roll-paused");
  buildTextRoll(title, 0, title.closest(".case-detail") ? CASE_LETTER_DELAY_MS : LETTER_DELAY_MS);
});

const caseHeroTitle = document.querySelector(".case-detail .case-hero h1");
let caseTitleFitFrame = 0;

function queueCaseTitleFit() {
  if (!caseHeroTitle) return;

  window.cancelAnimationFrame(caseTitleFitFrame);
  caseTitleFitFrame = window.requestAnimationFrame(() => fitMobileCaseTitle(caseHeroTitle));
}

fitMobileCaseTitle(caseHeroTitle);

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(queueCaseTitleFit).catch(() => {});
}

window.addEventListener("resize", queueCaseTitleFit);

document.documentElement.classList.remove("is-section-titles-pending");

if (sectionTitles.length > 0 && "IntersectionObserver" in window) {
  const sectionTitleObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.remove("is-roll-paused");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
  );

  sectionTitles.forEach((title) => sectionTitleObserver.observe(title));
} else {
  sectionTitles.forEach((title) => title.classList.remove("is-roll-paused"));
}

// На карточке отсчёт запускает курсор, на странице кейса - прокрутка: цифры проезжают
// мимо один раз. Значение сразу ставится в ноль, иначе настоящее число успело бы
// показаться при входе в экран и скакнуть обратно на ноль.
// Шапка целиком, а не .case-hero__result: wrapCardNumbers ищет цели через
// querySelectorAll, то есть среди потомков - сам переданный элемент она не видит.
const countBlocks = document.querySelectorAll(".case-metrics, .case-hero");

if (countBlocks.length > 0 && !prefersReducedMotion.matches) {
  countBlocks.forEach((block) => {
    wrapCardNumbers(block);
    block.querySelectorAll(".case-count").forEach((span) => {
      span.textContent = formatCount(parseCount(span), 0);
    });
  });

  // Резерв ширины меряется только после загрузки TT Masters, иначе замеры будут от
  // запасного шрифта и строка всё равно будет дышать на отсчёте.
  document.fonts.ready.then(() => {
    countBlocks.forEach((block) => block.querySelectorAll(".case-count").forEach(reserveCountWidth));
  });

  const countObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        runCountUp(
          entry.target,
          mobileCaseViewport.matches ? MOBILE_COUNT_DURATION_MS : DESKTOP_COUNT_DURATION_MS
        );
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.3 }
  );

  countBlocks.forEach((block) => countObserver.observe(block));
}

// Файл дошёл до конца, всё спрятанное уже показано штатно - страховка не нужна.
clearTimeout(animationFailsafe);

function createFloatingControlLabel(text) {
  const label = document.createElement("span");
  label.className = "floating-control-label";
  label.setAttribute("aria-hidden", "true");

  Array.from(text).forEach((character, index) => {
    const letter = document.createElement("span");
    const burstY = [-18, 20, -30, 27][index % 4];
    letter.className = "floating-control-label__letter";
    letter.style.setProperty("--floating-control-letter-index", String(index));
    letter.style.setProperty("--floating-control-burst-x", `${-28 - index * 7}px`);
    letter.style.setProperty("--floating-control-burst-x-end", `${-38 - index * 9}px`);
    letter.style.setProperty("--floating-control-burst-y", `${burstY}px`);
    letter.style.setProperty("--floating-control-burst-y-end", `${Math.round(burstY * 1.6)}px`);
    letter.style.setProperty("--floating-control-burst-rotate", `${-30 + index * 9}deg`);
    letter.style.setProperty("--floating-control-burst-rotate-end", `${-46 + index * 13}deg`);
    letter.textContent = character;
    label.append(letter);
  });

  return label;
}

function initFeedbackWidget() {
  const widget = document.createElement("div");
  const trigger = document.createElement("button");
  const menu = document.createElement("nav");
  const heroTrigger = document.querySelector("[data-open-feedback-widget]");
  const label = createFloatingControlLabel("Поговорим?");
  const menuId = "feedback-widget-menu";

  widget.className = "feedback-widget";
  widget.setAttribute("data-feedback-widget", "");

  trigger.className = "feedback-widget__trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", menuId);
  trigger.setAttribute("aria-label", "Открыть способы связи");
  trigger.innerHTML = `
    <svg class="feedback-widget__trigger-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path class="feedback-widget__chat" d="M17 17C24 10 40 10 49 17C57 24 55 38 46 43C38 48 25 47 18 41L10 46L12.3 37C7.5 29 10.3 21 17 17Z" />
      <circle class="feedback-widget__dot feedback-widget__dot--one" cx="24.6" cy="29.1" r="1.55" />
      <circle class="feedback-widget__dot feedback-widget__dot--two" cx="31.7" cy="29.1" r="1.55" />
      <circle class="feedback-widget__dot feedback-widget__dot--three" cx="38.8" cy="29.1" r="1.55" />
    </svg>`;

  menu.className = "feedback-widget__menu";
  menu.id = menuId;
  menu.setAttribute("aria-label", "Написать в мессенджере");
  menu.setAttribute("aria-hidden", "true");
  menu.innerHTML = `
    <a
      class="feedback-widget__option feedback-widget__option--telegram"
      data-feedback-option="telegram"
      href="https://t.me/miroshnikov_maxim"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Написать в Telegram"
      tabindex="-1"
    >
      <span class="feedback-widget__label" aria-hidden="true">Telegram</span>
      <span class="feedback-widget__option-circle" aria-hidden="true">
        <svg class="feedback-widget__option-art" viewBox="0 0 52 52" focusable="false">
          <path class="feedback-widget__option-ring" d="M26.5 3.8C38.8 3.3 47.8 11.5 48.2 24.8C48.8 38.3 40.7 47.3 26.8 48.1C13.8 48.6 4.6 40.7 4 27.1C3.6 13.8 12.5 4.3 26.5 3.8Z" />
          <path class="feedback-widget__option-ring feedback-widget__option-ring--echo" d="M25.5 5C38.1 4.5 46.5 12.5 46.9 25.1C47.4 37.8 39.8 45.7 26.4 46.7C14 47.2 5.9 39.8 5.3 26.8C5 14.6 13.3 5.5 25.5 5Z" />
          <path class="feedback-widget__brand-mark" d="M13.6 24.3 36.7 15c1.1-.4 2.1.6 1.7 1.7l-7.3 21.7c-.4 1.1-1.8 1.3-2.4.4l-5.8-8.3-9.3-3.8c-1.2-.5-1.2-2 0-2.4Z" />
          <path class="feedback-widget__brand-mark" d="m23.1 30.5 8.9-10" />
        </svg>
      </span>
    </a>
    <a
      class="feedback-widget__option feedback-widget__option--max"
      data-feedback-option="max"
      href="https://max.ru/u/f9LHodD0cOIgA7Bv0YjmbdPunU2SNMxoBHXbc-v6QicEIYa6pEGXQlYaqtE"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Написать в MAX"
      tabindex="-1"
    >
      <span class="feedback-widget__label" aria-hidden="true">MAX</span>
      <span class="feedback-widget__option-circle" aria-hidden="true">
        <svg class="feedback-widget__option-art" viewBox="0 0 52 52" focusable="false">
          <path class="feedback-widget__option-ring" d="M26.5 3.8C38.8 3.3 47.8 11.5 48.2 24.8C48.8 38.3 40.7 47.3 26.8 48.1C13.8 48.6 4.6 40.7 4 27.1C3.6 13.8 12.5 4.3 26.5 3.8Z" />
          <path class="feedback-widget__option-ring feedback-widget__option-ring--echo" d="M25.5 5C38.1 4.5 46.5 12.5 46.9 25.1C47.4 37.8 39.8 45.7 26.4 46.7C14 47.2 5.9 39.8 5.3 26.8C5 14.6 13.3 5.5 25.5 5Z" />
          <path class="feedback-widget__brand-mark feedback-widget__brand-mark--max" d="M27.2 10.6C18.6 10.6 13.4 16.1 13.4 24.8C13.4 33.7 18.2 39.8 26.5 39.8C29.3 39.8 31.6 39.2 33.5 38.1L38.5 42.6L37.4 35.9C40.1 33.1 41.2 29.3 41.2 24.8C41.2 16.1 35.8 10.6 27.2 10.6Z" />
          <path class="feedback-widget__brand-mark feedback-widget__brand-mark--max" d="M24.1 20.8C26.6 18.8 30.3 18.9 32.6 21.1C34.8 23.3 34.9 26.9 32.9 29.3C31.2 31.2 28.6 31.9 26.2 31.1L22.1 33.5L22.9 29.4C21.2 27 21.6 22.8 24.1 20.8Z" />
        </svg>
      </span>
    </a>`;

  widget.append(label, menu, trigger);
  document.body.append(widget);

  const options = Array.from(menu.querySelectorAll(".feedback-widget__option"));
  const AUTO_CLOSE_MS = 1000;
  let isOpen = false;
  let returnFocusTarget = trigger;
  let labelBurstTimer = 0;
  let autoCloseTimer = 0;

  const canShowLabel = () => window.matchMedia("(min-width: 721px) and (hover: hover) and (pointer: fine)").matches;
  const canAnimateLabel = () => !prefersReducedMotion.matches && canShowLabel();

  const setLabelVisible = (isVisible) => {
    if (!canShowLabel()) return;
    widget.classList.toggle("has-floating-control-label", isVisible && !isOpen);
  };

  const playLabelBurst = () => {
    if (!canAnimateLabel()) return;

    window.clearTimeout(labelBurstTimer);
    widget.classList.remove("has-floating-control-label", "is-floating-control-label-burst");
    void label.offsetWidth;
    widget.classList.add("is-floating-control-label-burst");
    labelBurstTimer = window.setTimeout(() => {
      widget.classList.remove("is-floating-control-label-burst");
    }, 460);
  };

  const clearAutoClose = () => {
    window.clearTimeout(autoCloseTimer);
    autoCloseTimer = 0;
  };

  const scheduleAutoClose = () => {
    clearAutoClose();
    if (!isOpen) return;

    autoCloseTimer = window.setTimeout(() => {
      if (isOpen && !widget.matches(":hover")) {
        setOpen(false);
      }
    }, AUTO_CLOSE_MS);
  };

  const setOpen = (nextOpen, { returnFocus = false } = {}) => {
    if (!nextOpen) {
      clearAutoClose();
    }

    isOpen = nextOpen;
    widget.classList.toggle("is-open", isOpen);
    trigger.setAttribute("aria-expanded", String(isOpen));
    heroTrigger?.setAttribute("aria-expanded", String(isOpen));
    trigger.setAttribute("aria-label", isOpen ? "Закрыть способы связи" : "Открыть способы связи");
    menu.setAttribute("aria-hidden", String(!isOpen));
    options.forEach((option) => {
      option.tabIndex = isOpen ? 0 : -1;
    });

    if (returnFocus) {
      returnFocusTarget.focus();
    }
  };

  const toggleWidget = () => {
    if (isOpen) {
      setOpen(false);
      return;
    }

    returnFocusTarget = trigger;
    playLabelBurst();
    setOpen(true);
  };

  heroTrigger?.addEventListener("click", () => {
    if (isOpen) {
      setOpen(false);
      return;
    }

    returnFocusTarget = heroTrigger;
    playLabelBurst();
    setOpen(true);
    options[0]?.focus();
  });

  trigger.addEventListener("pointerenter", () => setLabelVisible(true));
  trigger.addEventListener("pointerleave", () => setLabelVisible(false));
  widget.addEventListener("pointerenter", clearAutoClose);
  widget.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") {
      scheduleAutoClose();
    }
  });
  widget.addEventListener("focusin", (event) => {
    const isKeyboardFocus = event.target instanceof HTMLElement && event.target.matches(":focus-visible");
    setLabelVisible(isKeyboardFocus);
  });
  widget.addEventListener("focusout", (event) => {
    if (!widget.contains(event.relatedTarget)) {
      setLabelVisible(false);
    }
  });

  trigger.addEventListener("click", toggleWidget);
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleWidget();
  });

  options.forEach((option) => {
    option.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("pointerdown", (event) => {
    if (isOpen && !widget.contains(event.target) && !heroTrigger?.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) {
      setOpen(false, { returnFocus: true });
    }
  });

  new MutationObserver(() => {
    if (document.body.classList.contains("cookie-consent-open")) {
      setOpen(false);
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

function initScrollToTopButton() {
  const scrollToTopButton = document.createElement("button");
  const label = createFloatingControlLabel("Вверх!");
  scrollToTopButton.className = "scroll-to-top";
  scrollToTopButton.type = "button";
  scrollToTopButton.setAttribute("aria-label", "Вернуться в начало страницы");
  scrollToTopButton.append(label);
  scrollToTopButton.insertAdjacentHTML("beforeend", `
    <svg class="scroll-to-top__art" viewBox="0 0 48 56" aria-hidden="true" focusable="false">
      <path class="scroll-to-top__line" d="M24.7 48.2C24.4 37.7 24.8 27.1 24.2 16.7" />
      <path class="scroll-to-top__line" d="M12.4 27.1C16.5 22.5 20.4 18.1 24.2 12.4C28.1 18.4 32.5 22.8 36.5 27.2" />
    </svg>`);
  document.body.append(scrollToTopButton);

  let isScrollTicking = false;
  let labelBurstTimer = 0;

  const canShowLabel = () => window.matchMedia("(min-width: 721px) and (hover: hover) and (pointer: fine)").matches;
  const canAnimateLabel = () => !prefersReducedMotion.matches && canShowLabel();

  const setLabelVisible = (isVisible) => {
    if (!canShowLabel()) return;
    scrollToTopButton.classList.toggle("has-floating-control-label", isVisible);
  };

  const playLabelBurst = () => {
    if (!canAnimateLabel()) return;

    window.clearTimeout(labelBurstTimer);
    scrollToTopButton.classList.remove("has-floating-control-label", "is-floating-control-label-burst");
    void label.offsetWidth;
    scrollToTopButton.classList.add("is-floating-control-label-burst");
    labelBurstTimer = window.setTimeout(() => {
      scrollToTopButton.classList.remove("is-floating-control-label-burst");
    }, 460);
  };

  const updateScrollToTopButton = () => {
    scrollToTopButton.classList.toggle("is-visible", getCurrentScrollY() > window.innerHeight * 0.75);
    isScrollTicking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (isScrollTicking) return;

      isScrollTicking = true;
      window.requestAnimationFrame(updateScrollToTopButton);
    },
    { passive: true }
  );

  scrollToTopButton.addEventListener("pointerenter", () => setLabelVisible(true));
  scrollToTopButton.addEventListener("pointerleave", () => setLabelVisible(false));
  scrollToTopButton.addEventListener("focus", () => setLabelVisible(true));
  scrollToTopButton.addEventListener("blur", () => setLabelVisible(false));

  scrollToTopButton.addEventListener("click", () => {
    playLabelBurst();
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion.matches ? "auto" : "smooth"
    });
  });

  updateScrollToTopButton();
}

initFeedbackWidget();
initScrollToTopButton();
