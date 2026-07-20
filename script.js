(() => {
  const CONSENT_KEY = "naklikayCookieConsent";
  const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;
  const COOKIE_CONSENT_DELAY_MS = 5000;
  const COOKIE_CONSENT_ANIMATION_MS = 360;
  const YANDEX_METRIKA_ID = 110564693;
  const YANDEX_METRIKA_SRC = "https://mc.yandex.ru/metrika/tag.js?id=110564693";

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
    text.innerHTML = 'Я, как и все, использую файлы cookie. Но согласно нашим прекрасным законам, я вынужден вам это показать. Нажимая кнопку, вы подтверждаете <a href="/cookie-policy/" target="_blank" rel="noopener noreferrer">согласие на их использование</a> и <a href="/personal-data-consent/" target="_blank" rel="noopener noreferrer">обработку персональных данных</a>.';
    button.className = "cookie-consent__button";
    button.type = "button";
    button.textContent = "Понятно";

    button.addEventListener("click", () => {
      saveCookieConsent();
      banner.classList.remove("is-visible");
      window.loadYandexMetrika();
      setTimeout(() => banner.remove(), COOKIE_CONSENT_ANIMATION_MS);
    });

    banner.append(icon, text, button);
    return banner;
  }

  function showCookieConsentBanner() {
    const existingBanner = document.querySelector(".cookie-consent");
    if (existingBanner) {
      existingBanner.classList.add("is-visible");
      return;
    }

    const banner = createCookieConsentBanner();
    document.body.append(banner);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.classList.add("is-visible");
      });
    });
  }

  function showCookieConsentBannerWithDelay() {
    window.setTimeout(() => {
      if (!readCookieConsent()) {
        showCookieConsentBanner();
      }
    }, COOKIE_CONSENT_DELAY_MS);
  }

  function ensureLegalFooter() {
    if (document.querySelector(".site-footer") || document.body.classList.contains("case-detail-page")) {
      return;
    }

    const footer = document.createElement("footer");
    const inner = document.createElement("div");
    const consentLink = document.createElement("a");
    const cookieLink = document.createElement("a");

    footer.className = "site-footer";
    inner.className = "site-footer__inner";
    consentLink.href = "/personal-data-consent/";
    consentLink.target = "_blank";
    consentLink.rel = "noopener noreferrer";
    consentLink.textContent = "Согласие на обработку персональных данных";
    cookieLink.href = "/cookie-policy/";
    cookieLink.target = "_blank";
    cookieLink.rel = "noopener noreferrer";
    cookieLink.textContent = "Политика использования cookie";

    inner.append(consentLink, cookieLink);
    footer.append(inner);
    document.body.append(footer);
  }

  ensureLegalFooter();

  if (readCookieConsent()) {
    window.loadYandexMetrika();
  } else {
    showCookieConsentBannerWithDelay();
  }
})();

const LETTER_DELAY_MS = 90;
const ANIMATION_DURATION_MS = 840;
const GLOBAL_ANIMATION_DELAY_MS = 3000;
const AFTER_STATS_PAUSE_MS = 0;
const TEXT_LETTER_DELAY_MS = 11;
const AFTER_TEXT_PAUSE_MS = 0;
const TEXT_OVERLAP_MS = 1000;
const HIGHLIGHT_DELAY_MS = 7000;
const HERO_HIGHLIGHT_TEXT = "\u0447\u0442\u043e\u0431\u044b \u0431\u044e\u0434\u0436\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u043b \u043d\u0430 \u043f\u0440\u043e\u0434\u0430\u0436\u0438";
const SCROLL_RESTORE_KEY = "naklikayScrollY";

const statsTargets = document.querySelectorAll(".stats strong, .stats span");
const messengerLinkTargets = document.querySelectorAll(".messenger-links a");
const workResultTargets = document.querySelectorAll(".work-card__result > span");
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

function restoreSavedScrollPosition() {
  const savedScroll = readSavedScrollY();

  if (savedScroll > 120 && !window.location.hash) {
    window.scrollTo(0, savedScroll);
  }

  requestAnimationFrame(() => {
    document.documentElement.classList.remove("is-restoring-scroll");
  });
}

window.addEventListener("pagehide", saveCurrentScrollY);
window.addEventListener("beforeunload", saveCurrentScrollY);
restoreSavedScrollPosition();

function initPageMenu() {
  const menuLinks = document.querySelectorAll("[data-page-menu-link]");
  const mobileMenu = document.querySelector(".mobile-page-menu");
  const mobileToggle = document.querySelector(".mobile-menu-toggle");
  const sectionIds = ["start", "work-scope", "about", "cases", "reviews", "contacts"];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!menuLinks.length || !sections.length) return;

  function setActiveSection(id) {
    menuLinks.forEach((link) => {
      const isActive = link.getAttribute("data-page-menu-link") === id;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
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
  window.addEventListener("resize", updateActiveFromScroll);
  updateActiveFromScroll();
}

initPageMenu();

function shouldRunHeroIntroAnimation() {
  if (!hero) return false;
  if (window.location.hash && window.location.hash !== "#") return false;
  if (readSavedScrollY() > 120) return false;

  const currentScroll = getCurrentScrollY();
  return currentScroll < Math.max(120, window.innerHeight * 0.25);
}

function getCleanText(element) {
  return (element.textContent || "").replace(/\s+/g, " ").trim();
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

function buildTextRoll(element, baseDelay = 0, letterDelay = LETTER_DELAY_MS, highlightText = "") {
  const text = getCleanText(element);
  let letterIndex = 0;

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

    const parts = fragment.text.split(/(\s+)/);

    for (const part of parts) {
      if (!part) continue;

      if (/^\s+$/.test(part)) {
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
}

let maxStatsLetters = 0;

if (shouldRunHeroIntroAnimation()) {
  statsTargets.forEach((element) => {
    const count = buildTextRoll(element, GLOBAL_ANIMATION_DELAY_MS);
    maxStatsLetters = Math.max(maxStatsLetters, count);
  });

  const delayedStart = Math.max(
    0,
    GLOBAL_ANIMATION_DELAY_MS + ANIMATION_DURATION_MS + maxStatsLetters * LETTER_DELAY_MS + AFTER_STATS_PAUSE_MS - TEXT_OVERLAP_MS
  );

  const subtitleLetters = subtitleTarget ? buildTextRoll(subtitleTarget, delayedStart, TEXT_LETTER_DELAY_MS) : 0;
  const heroCopyStart = delayedStart + ANIMATION_DURATION_MS + subtitleLetters * TEXT_LETTER_DELAY_MS + AFTER_TEXT_PAUSE_MS;

  messengerLinkTargets.forEach((link) => {
    const underlinedLink = attachDelayedUnderline(link);

    setTimeout(() => {
      underlinedLink.classList.add("is-underlined");
    }, HIGHLIGHT_DELAY_MS);
  });

  if (heroCopyTarget) {
    buildTextRoll(heroCopyTarget, heroCopyStart, TEXT_LETTER_DELAY_MS, HERO_HIGHLIGHT_TEXT);

    const delayedUnderline = heroCopyTarget.querySelector(".delayed-underline");

    if (delayedUnderline) {
      setTimeout(() => {
        delayedUnderline.classList.add("is-underlined");
      }, HIGHLIGHT_DELAY_MS);
    }
  }
}

document.documentElement.classList.remove("is-hero-intro-pending");

if (workResultTargets.length > 0) {
  const workUnderlineObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-underlined");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -18% 0px", threshold: 0.8 }
  );

  workResultTargets.forEach((element) => {
    const underlinedResult = attachDelayedUnderline(element);
    workUnderlineObserver.observe(underlinedResult);
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

    if ("requestVideoFrameCallback" in portraitVideo) {
      portraitVideo.requestVideoFrameCallback(() => {
        requestAnimationFrame(markReady);
      });
      return;
    }

    markReadyOnNextPaint();
  };

  if (portraitVideo.readyState >= 2 && !portraitVideo.paused) {
    revealPortraitVideo();
  } else {
    portraitVideo.addEventListener("playing", revealPortraitVideo, { once: true });
  }

  const playPortraitVideo = () => {
    portraitVideo.currentTime = 0;
    const playPromise = portraitVideo.play();

    if (playPromise) {
      playPromise.catch(() => {});
    }
  };

  portraitVideo.addEventListener("ended", () => {
    portraitVideo.pause();
  });

  let wasBelowHero = false;

  const portraitObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;

      if (entry.isIntersecting && wasBelowHero) {
        playPortraitVideo();
        wasBelowHero = false;
        return;
      }

      if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
        wasBelowHero = true;
        portraitVideo.pause();
      }
    },
    { threshold: 0.25 }
  );

  portraitObserver.observe(hero);
}

const casesShowcase = document.querySelector(".cases-showcase");
const caseFilters = casesShowcase ? casesShowcase.querySelectorAll("[data-case-filter]") : [];
const casesGrid = casesShowcase ? casesShowcase.querySelector("[data-cases-grid]") : null;
const casesEmpty = casesShowcase ? casesShowcase.querySelector("[data-cases-empty]") : null;
const casesLoadMoreButton = casesShowcase ? casesShowcase.querySelector("[data-cases-load-more]") : null;
const homepageCases = Array.isArray(window.siteCases) ? window.siteCases.filter((caseItem) => caseItem.isFeatured !== false) : [];
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

function createCaseCard(caseItem) {
  const wrapper = document.createElement("div");
  const card = document.createElement("a");
  const orangeBorder = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const orangeBorderTopLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const orangeBorderRightLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
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
  orangeBorder.classList.add("case-card-orange-border");
  orangeBorder.setAttribute("viewBox", "0 0 100 100");
  orangeBorder.setAttribute("preserveAspectRatio", "none");
  orangeBorder.setAttribute("aria-hidden", "true");
  orangeBorderTopLine.classList.add("case-card-orange-border-line", "case-card-orange-border-line--top");
  orangeBorderRightLine.classList.add("case-card-orange-border-line", "case-card-orange-border-line--right");
  orangeBorderTopLine.setAttribute("x1", "50");
  orangeBorderTopLine.setAttribute("y1", "1");
  orangeBorderTopLine.setAttribute("x2", "94");
  orangeBorderTopLine.setAttribute("y2", "1");
  orangeBorderRightLine.setAttribute("x1", "99");
  orangeBorderRightLine.setAttribute("y1", "4");
  orangeBorderRightLine.setAttribute("x2", "99");
  orangeBorderRightLine.setAttribute("y2", "46");
  [orangeBorderTopLine, orangeBorderRightLine].forEach((line) => {
    line.setAttribute("vector-effect", "non-scaling-stroke");
  });
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

  orangeBorder.append(orangeBorderTopLine, orangeBorderRightLine);
  card.append(orangeBorder, top, title, result, channel, more);
  card.addEventListener("mousemove", moveCaseCard);
  card.addEventListener("mouseleave", resetCaseCard);
  wrapper.append(card);

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
  button.addEventListener("click", () => {
    activeCaseCategory = button.dataset.caseFilter || "all";
    visibleCaseCount = 4;
    renderCases();
  });
});

if (casesLoadMoreButton) {
  casesLoadMoreButton.addEventListener("click", () => {
    const filteredCases = getFilteredCases();
    const previousVisibleCount = visibleCaseCount;
    visibleCaseCount += 6;
    appendCaseCards(filteredCases.slice(previousVisibleCount, visibleCaseCount), previousVisibleCount);
    updateCasesControls(filteredCases);
  });
}

renderCases();

const reviewsData = [
  { src: "images/reviews/review-01.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 1" },
  { src: "images/reviews/review-02.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 2" },
  { src: "images/reviews/review-03.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 3" },
  { src: "images/reviews/review-04.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 4" },
  { src: "images/reviews/review-05.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 5" },
  { src: "images/reviews/review-06.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 6" },
  { src: "images/reviews/review-07.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 7" },
  { src: "images/reviews/review-08.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 8" },
  { src: "images/reviews/review-09.webp", alt: "Отзыв клиента о работе с рекламой, скриншот 9" },
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
  reviewPrev.textContent = "‹";
  reviewNext.textContent = "›";
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
  reviewLightboxPrev.textContent = "‹";
  reviewLightboxNext.textContent = "›";
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

  function showReviewLightboxImage(index) {
    reviewLightboxIndex = (index + reviewsData.length) % reviewsData.length;
    const review = reviewsData[reviewLightboxIndex];
    reviewLightboxImage.src = review.src;
    reviewLightboxImage.alt = review.alt;
    reviewLightboxCounter.textContent = `${reviewLightboxIndex + 1} / ${reviewsData.length}`;
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
