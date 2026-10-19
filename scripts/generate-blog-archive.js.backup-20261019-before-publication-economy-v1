/*
 * Статический генератор архива блога.
 * Источник карточек - существующие страницы архива. Добавьте новую карточку в
 * /blog/, затем выполните `npm run build:blog`: страницы, ссылки и sitemap
 * пересчитаются без ручного создания /blog/page/N/.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const blogDir = path.join(root, "blog");
const relatedTopicsPath = path.join(__dirname, "blog-related-topics.json");
const pageSize = 15;
const siteUrl = "https://naklikay.ru";
const blogAssetVersion = "20260909-article-toc-3";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function archiveFiles() {
  const files = [path.join(blogDir, "index.html")];
  const pageDirectory = path.join(blogDir, "page");
  if (!fs.existsSync(pageDirectory)) return files;
  const pageDirectories = fs.readdirSync(pageDirectory, { withFileTypes: true })
    .filter((item) => item.isDirectory() && /^\d+$/.test(item.name))
    .sort((a, b) => Number(a.name) - Number(b.name));
  for (const item of pageDirectories) {
    files.push(path.join(blogDir, "page", item.name, "index.html"));
  }
  return files.filter(fs.existsSync);
}

function getCards(html) {
  return [...html.matchAll(/<div class="case-card-reveal">\s*<article class="blog-card">[\s\S]*?<\/article>\s*<\/div>/g)]
    .map((match) => match[0]);
}

function cardKey(card) {
  const match = card.match(/<h2 class="blog-card__title">\s*<a href="(?:\.\.\/\.\.\/)?([^/"]+)\//);
  if (!match) throw new Error("A blog card is missing its article link.");
  return match[1];
}

function cardTitle(card) {
  const match = card.match(/<h2 class="blog-card__title">\s*<a [^>]*>([\s\S]*?)<\/a>/);
  if (!match) throw new Error("A blog card is missing its title.");
  return match[1].trim();
}

function cardDate(card) {
  const match = card.match(/<time datetime="(\d{4}-\d{2}-\d{2})">/);
  return match ? match[1] : "0000-00-00";
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function plainText(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function inlineText(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardDescription(card, articleHtml) {
  const match = card.match(/<p class="blog-card__text">([\s\S]*?)<\/p>/);
  if (match) return plainText(match[1]);

  const metaMatch = articleHtml.match(/<meta name="description" content="([^"]+)"\s*\/?\s*>/i);
  if (!metaMatch) throw new Error("A blog card and its article are missing a description.");
  return plainText(metaMatch[1]);
}

function normalizeText(value) {
  return value
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const topicDefinitions = [
  { id: "real-estate", label: "Недвижимость", patterns: [/недвижимост/, /новостро/, /застройщик/, /жил(?:ой|ого) комплекс/, /\bжк\b/, /квартир/, /коммерческ(?:их|ой) помещен/, /агентств(?:а|о) недвижимости/] },
  { id: "construction", label: "Строительство", patterns: [/строительн/, /строительств(?:о|а) домов/, /домов под ключ/] },
  { id: "ecommerce", label: "Интернет-магазины", patterns: [/интернет магазин/, /товарн(?:ая|ые|ой) кампан/, /товарн(?:ые|ых) объявлен/, /\bфид\b/, /yml/] },
  { id: "education", label: "Онлайн-образование", patterns: [/онлайн школ/, /школ(?:а|ы) массажа/] },
  { id: "legal", label: "Юридические услуги", patterns: [/юридическ/, /\bюрист/, /адвокат/] },
  { id: "healthcare", label: "Медицина и здоровье", patterns: [/стоматолог/, /психологическ/] },
  { id: "production", label: "Производство и B2B", patterns: [/производств/, /промышленн/, /оптов/, /\bb2b\b/, /пошив/] },
  { id: "specialist", label: "Работа со специалистом", patterns: [/директолог/, /частн(?:ый|ого) специалист/, /специалист по яндекс директ/, /агентство.*директ/, /ведение яндекс директ/, /услуг(?:а|и) реклам/, /заказать/] },
  { id: "local-promotion", label: "Локальное продвижение", patterns: [/ростов/, /яндекс карт/, /геореклам/, /локальн/] },
  { id: "channel-choice", label: "Выбор рекламного канала", patterns: [/\bseo\b.*контекст/, /\bавито\b.*директ/, /\bвк\b.*директ/, /контекстн.*таргетирован/, /какая реклама самая эффектив/, /реклама услуг в интернете/, /яндекс бизнес.*яндекс директ/] },
  { id: "social-ads", label: "Реклама в соцсетях", patterns: [/telegram ads/, /telegram канал/, /\bвк\b/, /таргетированн/, /таргетолог/, /реклама в max/] },
  { id: "analytics", label: "Аналитика", patterns: [/аналитик/, /метрик/, /utm/, /коллтрекинг/, /офлайн конверси/, /мастер отчет/, /отчет по площадк/, /цели для marquiz/] },
  { id: "metrics", label: "Показатели рекламы", patterns: [/\bcac\b/, /\bcpa\b/, /\bcpc\b/, /\bcps\b/, /\bctr\b/, /\broi\b/, /\broas\b/, /\bдрр\b/, /конверсия реклам/, /эффективност/, /окупаемост/] },
  { id: "budget", label: "Бюджет и стоимость", patterns: [/стоимост/, /цен(?:а|у|ы) за клик/, /бюджет/, /расход(?:ы|ов)/, /вернуть остаток/, /вывести деньги/] },
  { id: "traffic-quality", label: "Качество трафика", patterns: [/нецелев/, /некачественн.*лид/, /скликиван/, /боты в рся/, /минус площадк/, /не дает заявк/, /сливает бюджет/, /нет показов/] },
  { id: "sites", label: "Сайты и конверсия", patterns: [/лендинг/, /без сайта/, /продающ(?:ий|их) сайт/, /посадочн/, /\bутп\b/, /\bjtbd\b/, /лидогенерац/] },
  { id: "direct-tools", label: "Инструменты Яндекс Директа", patterns: [/мастер кампан/, /динамическ.*мест/, /ретаргетинг/, /автотаргетинг/, /комбинаторн/, /объект продвижения/, /представител/, /управляющ.*аккаунт/, /объявлени/, /оператор/, /минус фраз/, /оплата за конверси/, /поиск или рся/, /что такое рся/] },
  { id: "direct-management", label: "Настройка Яндекс Директа", patterns: [/настро(?:ить|йка)/, /стратеги/, /масштабирован/, /аудит яндекс директ/, /остановить кампан/, /как работает яндекс директ/] },
  { id: "marketing", label: "Маркетинг", patterns: [/маркетинг/, /реклам/] },
];

const tagDefinitions = [
  { id: "commercial-real-estate", patterns: [/коммерческ.*(?:недвижимост|помещен)/] },
  { id: "residential-real-estate", patterns: [/новостро/, /застройщик/, /жил(?:ой|ого) комплекс/, /\bжк\b/, /квартир/] },
  { id: "real-estate-agency", patterns: [/агентств.*недвижимост/] },
  { id: "house-building", patterns: [/строительств.*дом/, /домов под ключ/] },
  { id: "ecommerce", patterns: [/интернет магазин/, /товарн/, /\bфид\b/, /yml/] },
  { id: "education", patterns: [/онлайн школ/, /школ.*массажа/] },
  { id: "legal", patterns: [/юридическ/, /\bюрист/, /адвокат/] },
  { id: "healthcare", patterns: [/стоматолог/, /психологическ/] },
  { id: "manufacturing", patterns: [/производств/, /промышленн/, /пошив/] },
  { id: "b2b", patterns: [/\bb2b\b/, /оптов/, /производств/, /промышленн/] },
  { id: "analytics", patterns: [/аналитик/, /метрик/, /отчет/, /конверси/, /utm/, /коллтрекинг/] },
  { id: "economics", patterns: [/окупаемост/, /бюджет/, /стоимост/, /цена/, /расход/, /деньг/, /остаток/, /возврат/, /\bcac\b/, /\bcpa\b/, /\bcpc\b/, /\bcps\b/, /\broi\b/, /\broas\b/, /\bдрр\b/] },
  { id: "search", patterns: [/поиск(?:е|а|овый|овая)?/, /поисков/] },
  { id: "rsya", patterns: [/\bрся\b/, /сетях яндекса/] },
  { id: "automation", patterns: [/стратеги/, /обучени.*стратег/, /автотаргет/, /оплата за конверси/, /мастер кампан/] },
  { id: "campaign-setup", patterns: [/настройк/, /настроить/, /аудит яндекс директ/] },
  { id: "account-management", patterns: [/представител/, /управляющ.*аккаунт/, /дать доступ/, /объект продвижения/] },
  { id: "ad-formats", patterns: [/объявлен/, /ретаргетинг/, /комбинаторн/, /динамическ.*мест/] },
  { id: "traffic-quality", patterns: [/нецелев/, /некачественн/, /скликиван/, /боты/, /минус площадк/, /сливает бюджет/, /нет показов/] },
  { id: "website", patterns: [/сайт/, /лендинг/, /посадочн/, /tilda/, /marquiz/] },
  { id: "specialist", patterns: [/директолог/, /специалист/, /агентств/, /ведение/, /услуг/, /заказать/] },
  { id: "comparison", patterns: [/\bили\b/, /сравнен/, /что выбрать/, /кого выбрать/, /чем отличается/] },
  { id: "telegram", patterns: [/telegram/] },
  { id: "vk", patterns: [/\bвк\b/] },
  { id: "avito", patterns: [/авито/] },
  { id: "seo", patterns: [/\bseo\b/] },
  { id: "local", patterns: [/ростов/, /яндекс карт/, /локальн/, /геореклам/] },
  { id: "lead-generation", patterns: [/заявк/, /лид/, /клиент/, /продаж/] },
];

function articleHeadings(html) {
  return [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => plainText(match[1]))
    .join(" ");
}

function intentFor(title) {
  if (/\bили\b|что выбрать|кого выбрать|чем отличается|какая реклама/i.test(title)) return "comparison";
  if (/почему|не дает|сливает|нет показов|нецелев|некачествен|скликиван|боты|остановить|отключить|вернуть/i.test(title)) return "problem";
  if (/стоимост|цен[аы]|директолог|специалист|услуг|заказать|ведение|под ключ/i.test(title)) return "service";
  if (/^как |настройк|пошагов|инструкц|добавить|проверить|посмотреть|дать доступ/i.test(title)) return "instruction";
  if (/что такое|как работает|простое объяснение/i.test(title)) return "explanation";
  return "strategy";
}

function classifyArticle(article, articleHtml) {
  const titleText = normalizeText(article.title);
  const searchText = normalizeText(`${article.title} ${article.title} ${article.description} ${articleHeadings(articleHtml)}`);
  const tagText = normalizeText(`${article.title} ${article.description}`);
  const topic = topicDefinitions.find((item) => item.patterns.some((pattern) => pattern.test(titleText)))
    || topicDefinitions.find((item) => item.patterns.some((pattern) => pattern.test(searchText)))
    || { id: "direct-management", label: "Настройка Яндекс Директа" };
  const tags = tagDefinitions
    .filter((item) => item.patterns.some((pattern) => pattern.test(tagText)))
    .map((item) => item.id);

  return { ...article, topic: topic.id, topicLabel: topic.label, tags, intent: intentFor(titleText) };
}

const stopWords = new Set([
  "для", "как", "что", "это", "или", "через", "когда", "почему", "который", "которая", "которые",
  "яндекс", "директ", "директа", "директе", "реклама", "рекламы", "рекламе", "настройка", "настроить",
  "получать", "заявки", "заявок", "клиентов", "простыми", "словами", "году", "2026",
]);

function meaningfulWords(article) {
  return new Set(normalizeText(`${article.title} ${article.description}`).split(" ")
    .filter((word) => word.length >= 5 && !stopWords.has(word)));
}

function relatedScore(article, candidate) {
  const topicAffinities = {
    "real-estate": ["construction", "local-promotion"],
    construction: ["real-estate", "production"],
    ecommerce: ["direct-tools", "analytics"],
    education: ["sites", "analytics"],
    legal: ["specialist", "local-promotion"],
    healthcare: ["local-promotion", "sites"],
    production: ["construction", "analytics"],
    specialist: ["budget", "direct-management"],
    "local-promotion": ["healthcare", "channel-choice"],
    "channel-choice": ["social-ads", "local-promotion"],
    "social-ads": ["channel-choice", "analytics"],
    analytics: ["metrics", "direct-tools"],
    metrics: ["analytics", "budget"],
    budget: ["specialist", "metrics"],
    "traffic-quality": ["analytics", "direct-tools"],
    sites: ["marketing", "direct-management"],
    "direct-tools": ["direct-management", "analytics"],
    "direct-management": ["direct-tools", "analytics"],
    marketing: ["sites", "channel-choice"],
  };
  const tagWeights = {
    "commercial-real-estate": 48,
    "residential-real-estate": 48,
    "real-estate-agency": 48,
    "house-building": 48,
    ecommerce: 40,
    education: 40,
    legal: 40,
    healthcare: 40,
    manufacturing: 40,
    b2b: 32,
    telegram: 40,
    vk: 40,
    avito: 40,
    seo: 40,
  };
  let score = article.topic === candidate.topic ? 240 : 0;
  if (topicAffinities[article.topic]?.includes(candidate.topic)) score += 54;
  const candidateTags = new Set(candidate.tags);
  for (const tag of article.tags) {
    if (candidateTags.has(tag)) score += tagWeights[tag] || 14;
  }
  if (article.intent === candidate.intent) score += 10;

  const candidateWords = meaningfulWords(candidate);
  for (const word of meaningfulWords(article)) {
    if (candidateWords.has(word)) score += 3;
  }

  return score;
}

function relatedArticlesFor(article, articles) {
  const rankedCandidates = articles
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => ({ candidate, score: relatedScore(article, candidate) }))
    .sort((a, b) => b.score - a.score
      || b.candidate.date.localeCompare(a.candidate.date)
      || a.candidate.slug.localeCompare(b.candidate.slug));

  const sameTopic = rankedCandidates.filter(({ candidate }) => candidate.topic === article.topic).slice(0, 3);
  const otherTopic = rankedCandidates.filter(({ candidate }) => candidate.topic !== article.topic).slice(0, 3 - sameTopic.length);

  return [...sameTopic, ...otherTopic].map(({ candidate }) => candidate);
}

function relatedArticlesHtml(article, articles) {
  const cards = relatedArticlesFor(article, articles).map((candidate) => `        <a class="related-article-card" href="../${candidate.slug}/" target="_blank" rel="noopener noreferrer">
          <span class="related-article-card__topic">${escapeHtml(candidate.topicLabel)}</span>
          <span class="related-article-card__title">${escapeHtml(candidate.title)}</span>
          <span class="related-article-card__description">${escapeHtml(candidate.description)}</span>
        </a>`).join("\n");

  return `<!-- related-articles:start -->
<section class="related-articles" aria-labelledby="related-articles-title">
  <h2 id="related-articles-title">Похожие статьи</h2>
  <div class="related-articles__list">
${cards}
  </div>
</section>
<!-- related-articles:end -->`;
}

const headingTransliteration = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function headingAnchor(text) {
  const transliterated = Array.from(text.toLocaleLowerCase("ru"))
    .map((character) => headingTransliteration[character] ?? character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/g, "");

  return `section-${transliterated || "article"}`;
}

function uniqueHeadingAnchor(text, usedIds) {
  const base = headingAnchor(text);
  let candidate = base;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function articleTableOfContentsHtml(outline) {
  const items = outline.map((section, index) => {
    const sectionLink = `      <a class="article-toc__link article-toc__link--section" href="#${section.id}" data-article-anchor>${escapeHtml(section.text)}</a>`;
    if (!section.children.length) return `    <li class="article-toc__item">\n${sectionLink}\n    </li>`;

    const groupId = `article-toc-subsections-${index + 1}`;
    const children = section.children.map((child) => `        <li><a class="article-toc__link article-toc__link--subsection" href="#${child.id}" data-article-anchor>${escapeHtml(child.text)}</a></li>`).join("\n");

    return `    <li class="article-toc__item article-toc__item--has-children">
      <div class="article-toc__section-row">
${sectionLink}
        <button class="article-toc__toggle" type="button" aria-expanded="false" aria-controls="${groupId}" aria-label="Показать подразделы: ${escapeHtml(section.text)}">
          <span aria-hidden="true">${section.children.length}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5" /></svg>
        </button>
      </div>
      <ol class="article-toc__sublist" id="${groupId}" hidden>
${children}
      </ol>
    </li>`;
  }).join("\n");

  return `<!-- article-toc:start -->
<nav class="article-toc" id="article-toc" aria-labelledby="article-toc-title">
  <p class="article-toc__eyebrow">Навигация по статье</p>
  <h2 class="article-toc__title" id="article-toc-title">Содержание</h2>
  <ol class="article-toc__list">
${items}
  </ol>
</nav>
<!-- article-toc:end -->`;
}

function updateArticleTableOfContents(html, slug) {
  const withoutExistingToc = html.replace(/\s*<!-- article-toc:start -->[\s\S]*?<!-- article-toc:end -->/g, "");
  const articleOpen = withoutExistingToc.match(/<article class="legal-document"[^>]*>/);
  const authorIndex = withoutExistingToc.indexOf('<aside class="article-author"');
  if (!articleOpen || articleOpen.index === undefined) throw new Error(`Article document is missing: ${slug}`);
  if (authorIndex < 0) throw new Error(`Article author block is missing: ${slug}`);

  const contentStart = articleOpen.index + articleOpen[0].length;
  const content = withoutExistingToc.slice(contentStart, authorIndex);
  const headingMatches = [...content.matchAll(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi)];
  if (!headingMatches.some((match) => match[1] === "2")) throw new Error(`Article H2 heading is missing: ${slug}`);
  if (headingMatches[0][1] !== "2") throw new Error(`Article H3 appears before the first H2: ${slug}`);

  const idCounts = new Map();
  for (const match of withoutExistingToc.matchAll(/\sid=(["'])([^"']+)\1/gi)) {
    idCounts.set(match[2], (idCounts.get(match[2]) || 0) + 1);
  }
  const usedIds = new Set(idCounts.keys());
  for (const reservedId of ["article-toc", "article-toc-title"]) {
    if (usedIds.has(reservedId)) throw new Error(`Article uses the reserved id "${reservedId}": ${slug}`);
  }
  usedIds.add("article-toc");
  usedIds.add("article-toc-title");

  const outline = [];
  let currentSection = null;
  const nextContent = content.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (fullMatch, level, attributes, innerHtml) => {
    const text = inlineText(innerHtml);
    if (!text) throw new Error(`Article has an empty H${level}: ${slug}`);

    const existingIdMatch = attributes.match(/\sid=(["'])([^"']+)\1/i);
    let id = existingIdMatch ? existingIdMatch[2] : "";
    if (id && (!/^[^\s"'<>]+$/.test(id) || idCounts.get(id) !== 1)) {
      throw new Error(`Article has an invalid or duplicate heading id "${id}": ${slug}`);
    }
    if (!id) id = uniqueHeadingAnchor(text, usedIds);

    const heading = { id, text, children: [] };
    if (level === "2") {
      outline.push(heading);
      currentSection = heading;
    } else {
      if (!currentSection) throw new Error(`Article H3 appears before the first H2: ${slug}`);
      currentSection.children.push(heading);
    }

    return existingIdMatch ? fullMatch : `<h${level}${attributes} id="${id}">${innerHtml}</h${level}>`;
  });

  outline.forEach((section, index) => {
    if (!section.children.length) return;
    const groupId = `article-toc-subsections-${index + 1}`;
    if (usedIds.has(groupId)) throw new Error(`Article uses the reserved id "${groupId}": ${slug}`);
    usedIds.add(groupId);
  });

  const firstHeadingIndex = headingMatches[0].index;
  const lowerContent = content.toLowerCase();
  const sectionOpenIndex = lowerContent.lastIndexOf("<section", firstHeadingIndex);
  const sectionCloseIndex = lowerContent.lastIndexOf("</section>", firstHeadingIndex);
  let insertionIndex = firstHeadingIndex;
  if (sectionOpenIndex > sectionCloseIndex) {
    const sectionTagEnd = content.indexOf(">", sectionOpenIndex) + 1;
    const contentBeforeHeading = content.slice(sectionTagEnd, firstHeadingIndex).trim();
    if (!contentBeforeHeading) insertionIndex = sectionOpenIndex;
  }
  const contentWithToc = `${nextContent.slice(0, insertionIndex)}\n${articleTableOfContentsHtml(outline)}\n${nextContent.slice(insertionIndex)}`;

  return `${withoutExistingToc.slice(0, contentStart)}${contentWithToc}${withoutExistingToc.slice(authorIndex)}`;
}

function updateRelatedArticles(article, articles) {
  const articlePath = path.join(blogDir, article.slug, "index.html");
  if (!fs.existsSync(articlePath)) throw new Error(`Article page is missing: ${article.slug}`);

  const currentHtml = read(articlePath);
  const withoutExistingBlock = currentHtml
    .replace(/\s*<!-- related-articles:start -->[\s\S]*?<!-- related-articles:end -->/g, "")
    .replace(/\.\.\/\.\.\/styles\.css(?:\?v=[^"]*)?/g, `../../styles.css?v=${blogAssetVersion}`)
    .replace(/\.\.\/\.\.\/script\.js(?:\?v=[^"]*)?/g, `../../script.js?v=${blogAssetVersion}`);
  const withTableOfContents = updateArticleTableOfContents(withoutExistingBlock, article.slug);
  const authorMatch = withTableOfContents.match(/<aside class="article-author"[\s\S]*?<\/aside>/);
  if (!authorMatch) throw new Error(`Article author block is missing: ${article.slug}`);

  const nextHtml = withTableOfContents.replace(authorMatch[0], `${authorMatch[0]}${relatedArticlesHtml(article, articles)}`);
  if (nextHtml !== currentHtml) write(articlePath, nextHtml);
}

function normalizeCard(card, depth) {
  const prefix = depth === 0 ? "" : "../../";
  return card
    .replace(/href="(?:\.\.\/\.\.\/)?([^/"]+)\//g, `href="${prefix}$1/`)
    .replace(/(srcset|src)="(?:\.\.\/\.\.\/)?([^/"]+)"/g, `$1="${prefix}$2"`);
}

function pagination(page, total) {
  if (total < 2) return "";
  const links = Array.from({ length: total }, (_, index) => {
    const number = index + 1;
    const href = number === 1 ? "/blog/" : `/blog/page/${number}/`;
    return number === page
      ? `          <span aria-current="page">${number}</span>`
      : `          <a href="${href}">${number}</a>`;
  });
  const previous = page > 1 ? `\n          <a class="blog-pagination__previous" href="${page === 2 ? "/blog/" : `/blog/page/${page - 1}/`}">Предыдущая</a>` : "";
  const next = page < total ? `\n          <a class="blog-pagination__next" href="/blog/page/${page + 1}/">Следующая</a>` : "";
  return `\n        <nav class="blog-pagination" aria-label="Страницы блога">${previous}\n${links.join("\n")}${next}\n        </nav>`;
}

// Поиск ищет по всем статьям сразу, поэтому список заголовков кладём в каждую
// страницу архива целиком: отдельный запрос не нужен, поиск работает мгновенно.
function searchIndexJson(allCards) {
  const items = allCards.map((card) => ({ t: cardTitle(card), u: `/blog/${cardKey(card)}/` }));
  return JSON.stringify(items).replace(/</g, "\\u003c");
}

function pageHtml(cards, page, total, allCards) {
  const depth = page === 1 ? 0 : 2;
  const assetPrefix = depth === 0 ? "../" : "../../../";
  const canonicalPath = page === 1 ? "/blog/" : `/blog/page/${page}/`;
  const archiveTitle = page === 1
    ? "Блог о платном трафике - Максим Мирошников"
    : `Блог о платном трафике - страница ${page} - Максим Мирошников`;
  const archiveDescription = page === 1
    ? "Статьи о Яндекс Директе и платном трафике простым языком: как устроена реклама, чем отличаются Поиск и РСЯ, что смотреть в аналитике."
    : `Статьи о Яндекс Директе и платном трафике простым языком. Страница ${page} из ${total} в архиве блога.`;
  const title = page === 1
    ? archiveTitle
    : `Блог о Яндекс Директ и платном трафике - страница ${page}`;
  const description = page === 1
    ? archiveDescription
    : `Статьи о Яндекс Директ, контекстной рекламе и аналитике. Страница ${page} блога Максима Мирошникова о привлечении клиентов из платного трафика.`;
  const cardsHtml = cards.map((card) => normalizeCard(card, depth)).join("\n\n");
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/assets/avatar-donut.svg?v=2" type="image/svg+xml" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${siteUrl}${canonicalPath}" />
    <link rel="preload" href="${assetPrefix}assets/fonts/TTMasters-Regular.ttf" as="font" type="font/ttf" crossorigin />
    <link rel="stylesheet" href="${assetPrefix}styles.css?v=${blogAssetVersion}" />
    <script src="${assetPrefix}script.js?v=${blogAssetVersion}" defer></script>
    <noscript><style>.case-card-reveal { opacity: 1; filter: none; transform: none; }</style></noscript>
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Максим Мирошников" />
    <meta property="og:url" content="${siteUrl}${canonicalPath}" />
    <meta property="og:title" content="${archiveTitle}" />
    <meta property="og:description" content="${archiveDescription}" />
    <meta property="og:image" content="${siteUrl}/assets/og-cover.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body class="legal-page article-page">
    <header class="legal-topbar">
      <a class="legal-home-link" href="${assetPrefix}">Максим Мирошников</a>
      <nav class="messenger-links" aria-label="Мессенджеры">
        <a href="https://t.me/miroshnikov_maxim" target="_blank" rel="noopener noreferrer">Telegram</a>
        <a href="https://max.ru/u/f9LHodD0cOIgA7Bv0YjmbdPunU2SNMxoBHXbc-v6QicEIYa6pEGXQlYaqtE" target="_blank" rel="noopener noreferrer">Макс</a>
      </nav>
    </header>
    <main class="legal-shell">
      <div class="legal-document">
        <nav class="article-breadcrumbs" aria-label="Хлебные крошки">
          <a href="${assetPrefix}">Главная</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Блог</span>
        </nav>
        <p class="legal-kicker">Блог о платном трафике</p>
        <h1>Блог</h1>
        <p class="article-lead">Разбираю рекламу простым языком: как устроен Яндекс Директ, за что уходит бюджет и что смотреть в отчетах, чтобы реклама приносила заявки.</p>
        <div class="blog-search" data-blog-search>
          <label class="blog-search__label" for="blog-search-input">Поиск по статьям</label>
          <input class="blog-search__input" id="blog-search-input" type="search" autocomplete="off" placeholder="Начните вводить название статьи" />
          <div class="blog-search__results" data-blog-search-results hidden></div>
        </div>
        <script type="application/json" data-blog-index>${searchIndexJson(allCards)}</script>
        <div class="blog-list" data-blog-archive data-blog-page="${page}">
${cardsHtml}
        </div>${pagination(page, total)}
      </div>
    </main>
  </body>
</html>
`;
}

const cardsBySlug = new Map();
for (const file of archiveFiles()) {
  for (const card of getCards(read(file))) cardsBySlug.set(cardKey(card), card);
}
const cards = [...cardsBySlug.values()].sort((a, b) => cardDate(b).localeCompare(cardDate(a)));
if (!cards.length) throw new Error("No blog cards found.");

const articles = cards.map((card) => {
  const slug = cardKey(card);
  const articlePath = path.join(blogDir, slug, "index.html");
  if (!fs.existsSync(articlePath)) throw new Error(`Article page is missing: ${slug}`);
  const articleHtml = read(articlePath);
  const article = {
    slug,
    title: plainText(cardTitle(card)),
    description: cardDescription(card, articleHtml),
    date: cardDate(card),
  };
  return classifyArticle(article, articleHtml);
});
if (articles.length < 4) throw new Error("At least four articles are required to build related article cards.");

const relatedTopics = {
  version: 1,
  articles: articles.map(({ slug, topic, topicLabel, tags, intent }) => ({ slug, topic, topicLabel, tags, intent })),
};
write(relatedTopicsPath, `${JSON.stringify(relatedTopics, null, 2)}\n`);
articles.forEach((article) => updateRelatedArticles(article, articles));

const pages = Array.from({ length: Math.ceil(cards.length / pageSize) }, (_, index) => cards.slice(index * pageSize, (index + 1) * pageSize));
const pageLastmod = (pageCards) => pageCards.reduce((latest, card) => {
  const date = cardDate(card);
  return date > latest ? date : latest;
}, "0000-00-00");
write(path.join(blogDir, "index.html"), pageHtml(pages[0], 1, pages.length, cards));
for (let index = 1; index < pages.length; index += 1) write(path.join(blogDir, "page", String(index + 1), "index.html"), pageHtml(pages[index], index + 1, pages.length, cards));

const pageRoot = path.join(blogDir, "page");
if (fs.existsSync(pageRoot)) {
  for (const item of fs.readdirSync(pageRoot, { withFileTypes: true })) {
    const page = Number(item.name);
    if (item.isDirectory() && Number.isInteger(page) && page > pages.length) fs.rmSync(path.join(pageRoot, item.name), { recursive: true, force: true });
  }
}

const sitemapPath = path.join(root, "sitemap.xml");
let sitemap = read(sitemapPath).replace(/\s*<url>\s*<loc>https:\/\/naklikay\.ru\/blog\/page\/\d+\/<\/loc>[\s\S]*?<\/url>/g, "");
const generatedPages = pages.slice(1).map((pageCards, index) => `  <url>\n    <loc>${siteUrl}/blog/page/${index + 2}/</loc>\n    <lastmod>${pageLastmod(pageCards)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`).join("\n");
if (generatedPages) sitemap = sitemap.replace("</urlset>", `${generatedPages}\n</urlset>`);
write(sitemapPath, sitemap);
console.log(`Generated ${pages.length} blog archive page(s) and related cards for ${cards.length} article(s).`);
