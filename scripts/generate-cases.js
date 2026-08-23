/*
 * Статический генератор страниц кейсов.
 * Источник данных - cases-data.js. Разметка повторяет вывод case-page.js
 * один в один, поэтому первый кадр страницы совпадает с тем, что рисует скрипт.
 * Запуск: `npm run build:cases` (или `-- --only <slug>` для одного кейса).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const casesDir = path.join(root, "cases");
const siteUrl = "https://naklikay.ru";
const author = "Максим Мирошников";

const ORB_PATHS = {
  upper: "M107 12C156 14 196 52 198 101C199 151 163 194 112 198C61 201 17 166 12 114C7 62 47 15 95 13",
  middle: "M105 11C158 9 198 46 200 98C203 149 167 190 117 200C65 211 19 177 10 124C2 72 40 25 91 13",
  lower: "M100 14C149 8 190 40 199 89C207 140 171 185 122 198C72 210 24 178 13 130C0 79 35 27 83 16",
};

const NAV_ARROWS = {
  prev: "M29.4 15.7C26.7 18.3 23.5 21.1 20.4 24.3C23.1 27.1 26 30 28.8 32.6",
  next: "M18.6 15.7C21.3 18.3 24.5 21.1 27.6 24.3C24.9 27.1 22 30 19.2 32.6",
};

// Яндекс давно пишет бренд без точки, поисковый запрос тоже чаще без неё.
const SEO_CHANNEL = {
  "Яндекс.Директ": "Яндекс Директ",
  "Telegram Ads": "Telegram Ads",
  "Геосервисы": "Яндекс Карты",
};

function loadCases() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "cases-data.js"), "utf8"), sandbox);
  const cases = sandbox.window.siteCases;
  if (!Array.isArray(cases) || cases.length === 0) throw new Error("cases-data.js не отдал siteCases.");
  return cases;
}

function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attr(value) {
  return esc(value).replace(/"/g, "&quot;");
}

function assetPath(src) {
  return src.startsWith("assets/") ? `../../${src}` : src;
}

function assetUrl(src) {
  return `${siteUrl}/${src.replace(/^\/+/, "")}`;
}

function orb(variant) {
  return `<svg class="case-sketch-orb case-sketch-orb--${variant}" viewBox="0 0 210 210" aria-hidden="true" focusable="false" data-case-sketch-orb="${variant}"><path d="${ORB_PATHS[variant]}" vector-effect="non-scaling-stroke"></path></svg>`;
}

function navIcon(direction) {
  return `<svg class="hand-drawn-nav__art" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path class="hand-drawn-nav__paper" d="M24.7 4.1C36.6 3.3 43.1 12.7 43.8 23.4C44.4 34.5 35.8 43.6 24.4 44C12.9 44.4 3.8 36 4.5 24.7C5.2 13.1 13 4.8 24.7 4.1Z"></path><path class="hand-drawn-nav__ring" d="M24.7 4.1C36.6 3.3 43.1 12.7 43.8 23.4C44.4 34.5 35.8 43.6 24.4 44C12.9 44.4 3.8 36 4.5 24.7C5.2 13.1 13 4.8 24.7 4.1Z"></path><path class="hand-drawn-nav__ring hand-drawn-nav__ring--echo" d="M23.9 4.8C34.9 3.7 43.9 12 43.2 24.6C42.6 36.2 34.9 43.1 23.3 43.5C12.3 43.8 4.8 35.9 4.8 23.5C4.9 12.2 13 5.9 23.9 4.8Z"></path><path class="hand-drawn-nav__arrow" d="${NAV_ARROWS[direction]}"></path></svg>`;
}

function heroHtml(caseItem) {
  return [
    `<section class="case-hero">`,
    `<p class="case-hero__meta">${esc(caseItem.categoryLabel)}</p>`,
    `<h1>${esc(caseItem.title)}</h1>`,
    `<p class="case-hero__lead">${esc(caseItem.intro)}</p>`,
    `<p class="case-hero__result">${esc(caseItem.shortResult)}</p>`,
    `</section>`,
  ].join("");
}

function metricsHtml(metrics = []) {
  const items = metrics
    .map((metric) => `<div class="case-metric"><strong>${esc(metric.value)}</strong><span>${esc(metric.label)}</span></div>`)
    .join("");
  return `<section class="case-metrics" aria-label="Ключевые цифры кейса">${items}</section>`;
}

function factsHtml(facts = []) {
  const rows = facts
    .map((fact) => {
      const parts = fact.split(":");
      const term = parts.length > 1 ? parts.shift().trim() : "Факт";
      const description = parts.join(":").trim() || fact;
      return `<dt>${esc(term)}</dt><dd>${esc(description)}</dd>`;
    })
    .join("");
  return `<dl class="case-facts">${rows}</dl>`;
}

function sectionsHtml(sections = [], headingTag = "h2", decorations = {}) {
  return sections
    .map((section, index) => {
      const paragraphs = (section.paragraphs || []).map((text) => `<p>${esc(text)}</p>`).join("");
      const items = section.items && section.items.length > 0
        ? `<ul class="case-content-list">${section.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
        : "";
      const variant = decorations[index];
      const className = variant ? "case-content-section has-case-sketch-orb" : "case-content-section";
      return [
        `<section class="${className}">`,
        `<${headingTag}>${esc(section.heading)}</${headingTag}>`,
        `<div class="case-content-section__copy">${paragraphs}${items}</div>`,
        variant ? orb(variant) : "",
        `</section>`,
      ].join("");
    })
    .join("");
}

// Повтор updateCoverflowGallery(gallery, 0) из case-page.js: без этих стилей
// первый кадр показал бы стопку картинок вместо веера.
function coverflowStyle(index, count) {
  const raw = index;
  const wrapped = Math.abs(raw) > count / 2 ? raw - Math.sign(raw) * count : raw;
  const clamped = Math.max(-2, Math.min(2, wrapped));
  const isActive = index === 0;
  const z = isActive ? 90 : -Math.abs(clamped) * 120;
  const scale = isActive ? 1 : 0.86 - Math.min(Math.abs(clamped) * 0.08, 0.16);
  const zIndex = 10 - Math.abs(Math.round(clamped));
  const transform = `translate(-50%, -50%) translateX(${clamped * 58}%) translateZ(${z}px) rotateY(${clamped * -18}deg) scale(${scale})`;
  return {
    zIndex,
    button: `--coverflow-transform: ${transform}; --coverflow-x: ${clamped * 72}px; z-index: ${zIndex}; opacity: ${isActive ? 1 : 0.58};`,
    tabIndex: isActive ? 0 : -1,
    current: isActive,
  };
}

function galleryHtml(images, headingTag = "h2") {
  const figures = images
    .map((image, index) => {
      const style = coverflowStyle(index, images.length);
      const alt = image.alt || `Скриншот ${index + 1}`;
      return [
        `<figure class="case-gallery__item" style="z-index: ${style.zIndex};">`,
        `<button class="case-gallery__button" type="button" data-lightbox-index="${index}"`,
        ` aria-label="${attr(`Открыть скриншот ${index + 1} из ${images.length}`)}"`,
        ` aria-current="${style.current}" tabindex="${style.tabIndex}" style="${attr(style.button)}">`,
        `<img src="${attr(assetPath(image.src))}" alt="${attr(alt)}" loading="lazy" decoding="async">`,
        `</button></figure>`,
      ].join("");
    })
    .join("");

  const dots = images
    .map((_, index) => `<button class="case-gallery__dot${index === 0 ? " is-active" : ""}" type="button" aria-label="${attr(`Показать скриншот ${index + 1}`)}" aria-current="${index === 0}"></button>`)
    .join("");

  return [
    `<section class="case-gallery-section">`,
    `<${headingTag}>Скриншоты</${headingTag}>`,
    `<div class="case-gallery" data-active-index="0">`,
    `<div class="case-gallery__stage" aria-label="Галерея скриншотов">${figures}</div>`,
    `<button class="case-gallery__nav case-gallery__nav--prev hand-drawn-nav hand-drawn-nav--prev" type="button" aria-label="Предыдущий скриншот">${navIcon("prev")}</button>`,
    `<button class="case-gallery__nav case-gallery__nav--next hand-drawn-nav hand-drawn-nav--next" type="button" aria-label="Следующий скриншот">${navIcon("next")}</button>`,
    `<div class="case-gallery__progress">${dots}</div>`,
    `</div></section>`,
  ].join("");
}

function lightboxHtml() {
  return [
    `<div class="case-lightbox" hidden role="dialog" aria-modal="true" aria-label="Просмотр скриншотов">`,
    `<button class="case-lightbox__backdrop" type="button" aria-label="Закрыть скриншот"></button>`,
    `<figure class="case-lightbox__figure"><img class="case-lightbox__image" decoding="async" alt=""><figcaption class="case-lightbox__caption"></figcaption></figure>`,
    `<button class="case-lightbox__button case-lightbox__button--prev hand-drawn-nav hand-drawn-nav--prev" type="button" aria-label="Предыдущий скриншот">${navIcon("prev")}</button>`,
    `<button class="case-lightbox__button case-lightbox__button--next hand-drawn-nav hand-drawn-nav--next" type="button" aria-label="Следующий скриншот">${navIcon("next")}</button>`,
    `<button class="case-lightbox__close" type="button" aria-label="Закрыть">×</button>`,
    `</div>`,
  ].join("");
}

function conclusionHtml(caseItem) {
  return [
    `<section class="case-conclusion has-case-sketch-orb">`,
    `<h2>Вывод</h2>`,
    `<p>${esc(caseItem.conclusion)}</p>`,
    orb("lower"),
    `</section>`,
  ].join("");
}

function relatedHtml(caseItem, cases) {
  const related = cases.filter((item) => item.category === caseItem.category && item.slug !== caseItem.slug);
  const cards = related
    .map((item) => [
      `<a class="related-card" href="../${attr(item.slug)}/" target="_blank" rel="noopener noreferrer">`,
      `<span class="related-card__title">${esc(item.title)}</span>`,
      `<span class="related-card__result">${esc(item.shortResult)}</span>`,
      `<span class="related-card__channel">${esc(item.channel)}</span>`,
      `</a>`,
    ].join(""))
    .join("");

  return [
    `<section class="related-cases">`,
    `<h2>Другие кейсы в этой нише</h2>`,
    `<div class="related-list-wrap"><div class="related-list">${cards}</div></div>`,
    `</section>`,
  ].join("");
}

function projectHtml(project, index, variant) {
  const gallery = project.images && project.images.length > 0 ? galleryHtml(project.images, "h3") : "";
  return [
    `<section class="case-project">`,
    `<header class="case-project__header">`,
    `<p class="case-project__number">Проект ${String(index + 1).padStart(2, "0")}</p>`,
    `<h2>${esc(project.title)}</h2>`,
    `<p class="case-project__intro">${esc(project.intro)}</p>`,
    `</header>`,
    metricsHtml(project.metrics),
    factsHtml(project.facts),
    sectionsHtml(project.sections, "h3", variant ? { 0: variant } : {}),
    gallery,
    `</section>`,
  ].join("");
}

function bodyHtml(caseItem, cases) {
  if (caseItem.caseType === "collection") {
    const projects = caseItem.projects || [];
    const middle = Math.floor(projects.length / 2);
    const lower = Math.min(projects.length - 1, Math.max(1, Math.floor(projects.length * 0.6)));
    const blocks = projects.map((project, index) => {
      const variant = index === 0 ? "upper" : index === middle ? "middle" : index === lower ? "lower" : "";
      return projectHtml(project, index, variant);
    });
    return heroHtml(caseItem) + blocks.join("") + lightboxHtml();
  }

  const sections = caseItem.sections || [];
  const middle = Math.floor(sections.length / 2);
  const hasImages = Array.isArray(caseItem.images) && caseItem.images.length > 0;

  return [
    heroHtml(caseItem),
    metricsHtml(caseItem.metrics),
    factsHtml(caseItem.facts),
    sectionsHtml(sections, "h2", { 0: "upper", [middle]: "middle" }),
    hasImages ? galleryHtml(caseItem.images) : "",
    conclusionHtml(caseItem),
    relatedHtml(caseItem, cases),
    hasImages ? lightboxHtml() : "",
  ].join("");
}

function seoChannel(caseItem) {
  return SEO_CHANNEL[caseItem.channel] || caseItem.channel;
}

function buildTitle(caseItem) {
  if (caseItem.seoTitle) return caseItem.seoTitle;
  const suffix = caseItem.caseType === "collection" ? "кейсы" : `кейс ${seoChannel(caseItem)}`;
  const withResult = `${caseItem.title}: ${caseItem.shortResult} - ${suffix}`;
  return withResult.length <= 70 ? withResult : `${caseItem.title} - ${suffix}`;
}

function buildDescription(caseItem) {
  if (caseItem.seoDescription) return caseItem.seoDescription;
  const head = `Кейс ${seoChannel(caseItem)}: ${caseItem.shortResult}. ${caseItem.title}.`;
  const sentences = String(caseItem.intro || "").split(/(?<=\.)\s+/);
  let text = head;
  for (const sentence of sentences) {
    if (`${text} ${sentence}`.length > 175) break;
    text = `${text} ${sentence}`;
  }
  return text.trim();
}

function buildImages(caseItem) {
  if (Array.isArray(caseItem.images) && caseItem.images.length > 0) return caseItem.images.map((image) => assetUrl(image.src));
  const fromProjects = (caseItem.projects || []).flatMap((project) => project.images || []);
  if (fromProjects.length > 0) return fromProjects.slice(0, 5).map((image) => assetUrl(image.src));
  return [`${siteUrl}/assets/avatar-donut.svg`];
}

function buildSchema(caseItem, pageUrl, images, title, description) {
  const article = {
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: title,
    name: caseItem.title,
    description,
    url: pageUrl,
    image: images,
    inLanguage: "ru-RU",
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    author: { "@type": "Person", name: author, url: `${siteUrl}/` },
    publisher: { "@type": "Person", name: author, url: `${siteUrl}/` },
    about: caseItem.title,
    articleSection: caseItem.categoryLabel,
  };

  if (caseItem.datePublished) article.datePublished = caseItem.datePublished;
  if (caseItem.dateModified || caseItem.datePublished) article.dateModified = caseItem.dateModified || caseItem.datePublished;

  const breadcrumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: caseItem.title, item: pageUrl },
    ],
  };

  const faq = Array.isArray(caseItem.faq) && caseItem.faq.length > 0
    ? {
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: caseItem.faq.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: { "@type": "Answer", text: entry.answer },
      })),
    }
    : null;

  return JSON.stringify({ "@context": "https://schema.org", "@graph": faq ? [article, breadcrumbs, faq] : [article, breadcrumbs] });
}

function pageHtml(caseItem, cases) {
  const pageUrl = `${siteUrl}/cases/${caseItem.slug}/`;
  const title = buildTitle(caseItem);
  const description = buildDescription(caseItem);
  const images = buildImages(caseItem);
  const schema = buildSchema(caseItem, pageUrl, images, title, description);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/assets/avatar-donut.svg?v=2" type="image/svg+xml" />
    <title>${esc(title)}</title>
    <meta name="description" content="${attr(description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${pageUrl}" />
    <link rel="preload" href="../../assets/fonts/TTMasters-Regular.ttf" as="font" type="font/ttf" crossorigin />
    <link rel="stylesheet" href="../../styles.css?v=20260810-mobile-layout" />
    <script src="../../cases-data.js?v=20260808" defer></script>
    <script src="../../case-page.js?v=20260809-case-orbs-v2" defer></script>
    <script src="../../script.js?v=20260810-mobile-layout" defer></script>
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${attr(author)}" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${attr(title)}" />
    <meta property="og:description" content="${attr(description)}" />
    <meta property="og:image" content="${attr(images[0])}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${schema}</script>
  </head>
  <body class="case-detail-page">
    <main class="case-shell" data-case-slug="${attr(caseItem.slug)}">
      <a class="case-back-link" href="../../index.html">← Вернуться на главную</a>
      <div class="case-detail" data-case-root>${bodyHtml(caseItem, cases)}</div>
    </main>
  </body>
</html>
`;
}

const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];
const cases = loadCases();
const targets = only ? cases.filter((caseItem) => caseItem.slug === only) : cases;

if (only && targets.length === 0) throw new Error(`Кейс «${only}» не найден в cases-data.js.`);

for (const caseItem of targets) {
  const file = path.join(casesDir, caseItem.slug, "index.html");
  if (!fs.existsSync(path.dirname(file))) throw new Error(`Нет папки для кейса: ${caseItem.slug}`);
  fs.writeFileSync(file, pageHtml(caseItem, cases), "utf8");
}

console.log(`Собрано страниц кейсов: ${targets.length}.`);
