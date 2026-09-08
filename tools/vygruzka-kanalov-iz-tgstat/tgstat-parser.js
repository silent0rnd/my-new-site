(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.TgstatParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const METRIC_LABELS = {
    subscribers: ["подписчиков", "подписчики", "subscribers"],
    postReach: ["охват 1 поста", "охват поста", "средний охват поста", "average post reach"],
    citationIndex: ["индекс цитирования", "иц", "citation index"],
    err: ["err", "читателей", "уровень вовлеченности"]
  };

  function cleanText(value) {
    return String(value == null ? "" : value).replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();
  }

  function parseNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    let text = cleanText(value).toLowerCase();
    if (!text) return null;
    text = text.replace(/(?<=\d)[\s](?=\d)/g, "");
    const match = text.match(/[-+]?\d+(?:[.,]\d+)?(?:\s*(?:k|к|тыс\.?|m|млн))?/i);
    if (!match) return null;
    const token = match[0].replace(/\s/g, "");
    const multiplier = /(?:m|млн)$/i.test(token) ? 1000000 : /(?:k|к|тыс\.?)$/i.test(token) ? 1000 : 1;
    const parsed = Number(token.replace(/(?:k|к|тыс\.?|m|млн)$/i, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed * multiplier : null;
  }

  function parsePercentage(value) {
    return parseNumber(value);
  }

  function normalizeUsername(value) {
    let username = cleanText(value);
    if (!username) return "";
    username = username.replace(/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i, "");
    username = username.replace(/^@/, "").split(/[/?#]/)[0];
    return /^[a-zA-Z0-9_]{4,}$/.test(username) ? `@${username}` : "";
  }

  function normalizeTelegramUrl(value) {
    const username = normalizeUsername(value);
    return username ? `https://t.me/${username.slice(1)}` : "";
  }

  function normalizeTgstatUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, "https://tgstat.ru");
      if (!/(^|\.)tgstat\.ru$/i.test(url.hostname)) return "";
      const match = url.pathname.match(/\/channel\/([^/]+)\/stat\/?/i);
      if (!match) return "";
      return `https://tgstat.ru/channel/${match[1]}/stat`;
    } catch (_) {
      return "";
    }
  }

  function usernameFromTgstatUrl(value) {
    const url = normalizeTgstatUrl(value);
    if (!url) return "";
    const match = new URL(url).pathname.match(/\/channel\/@([^/]+)\/stat/i);
    return match ? normalizeUsername(match[1]) : "";
  }

  function elementText(element) {
    return cleanText(element && (element.innerText || element.textContent));
  }

  function findChannelCards(container) {
    if (!container || typeof container.querySelectorAll !== "function") return [];
    const links = Array.from(container.querySelectorAll("a[href*='/channel/'], a[href*='tgstat.ru/channel/']"));
    const cards = [];
    const seen = new Set();
    links.forEach((link) => {
      if (!normalizeTgstatUrl(link.getAttribute("href"))) return;
      let card = link.closest && link.closest(".peer-item-row, [data-channel-id], .card");
      if (!card) {
        card = link.parentElement;
        while (card && card.parentElement && !Object.values(METRIC_LABELS).flat().some((label) => elementText(card).toLowerCase().includes(label))) card = card.parentElement;
      }
      card = card || link;
      if (!seen.has(card)) {
        seen.add(card);
        cards.push(card);
      }
    });
    return cards;
  }

  function textLines(element) {
    return String(element && (element.innerText || element.textContent) || "")
      .split(/[\r\n]+/)
      .map(cleanText)
      .filter(Boolean);
  }

  function findMetric(card, labels, percentage) {
    const parse = percentage ? parsePercentage : parseNumber;
    if (card && typeof card.querySelectorAll === "function") {
      const candidates = Array.from(card.querySelectorAll("*")).filter((element) => {
        const lower = elementText(element).toLowerCase();
        return labels.some((label) => lower.includes(label));
      }).sort((left, right) => elementText(left).length - elementText(right).length);
      for (const candidate of candidates) {
        const text = elementText(candidate);
        const stripped = labels.reduce((value, label) => value.replace(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), ""), text);
        if (/\d/.test(stripped)) {
          const inline = parse(stripped);
          if (inline != null) return inline;
        }
        const previous = candidate.previousElementSibling && parse(elementText(candidate.previousElementSibling));
        if (previous != null) return previous;
        const heading = candidate.parentElement && candidate.parentElement.querySelector && candidate.parentElement.querySelector("h1, h2, h3, h4, h5, strong, b");
        const nearby = heading && heading !== candidate ? parse(elementText(heading)) : null;
        if (nearby != null) return nearby;
      }
    }
    const lines = textLines(card);
    for (let index = 0; index < lines.length; index += 1) {
      const lower = lines[index].toLowerCase();
      if (!labels.some((label) => lower === label || lower.includes(label))) continue;
      const stripped = labels.reduce((value, label) => value.replace(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), ""), lines[index]);
      const sameLine = parse(stripped);
      if (sameLine != null && /\d/.test(stripped)) return sameLine;
      if (index > 0) {
        const previous = parse(lines[index - 1]);
        if (previous != null) return previous;
      }
      if (index + 1 < lines.length) {
        const next = parse(lines[index + 1]);
        if (next != null) return next;
      }
    }
    return null;
  }

  function firstChannelLink(card) {
    if (!card || typeof card.querySelectorAll !== "function") return null;
    return Array.from(card.querySelectorAll("a[href*='/channel/'], a[href*='tgstat.ru/channel/']"))
      .find((link) => normalizeTgstatUrl(link.getAttribute("href"))) || null;
  }

  function extractName(card, link) {
    const candidates = [
      card.querySelector && card.querySelector("[class*='font-16'][class*='text-dark']"),
      link && link.querySelector && link.querySelector("[class*='text-truncate']"),
      link
    ].filter(Boolean);
    for (const candidate of candidates) {
      const lines = textLines(candidate);
      const name = lines.find((line) => !/\d[\d\s.,]*(?:k|m|к|млн|тыс)?\s*(?:подписчик|subscriber)/i.test(line));
      if (name) return name;
    }
    return "";
  }

  function extractCategory(card, link, name) {
    const badge = link && link.querySelector && link.querySelector(".border.rounded, [class*='badge']");
    if (badge && elementText(badge) && elementText(badge).toLowerCase() !== "не указана") return elementText(badge);
    const lines = textLines(link || card);
    return lines.find((line) => line !== name && !/\d/.test(line) && !/(подписчик|охват|индекс|err|читател)/i.test(line) && line.toLowerCase() !== "не указана") || "";
  }

  function parseChannelCard(card) {
    if (!card) return null;
    const link = firstChannelLink(card);
    const tgstatUrl = normalizeTgstatUrl(link && link.getAttribute("href"));
    let username = usernameFromTgstatUrl(tgstatUrl);
    let telegramUrl = "";
    if (card.querySelectorAll) {
      const telegramLink = Array.from(card.querySelectorAll("a[href*='t.me/'], a[href*='telegram.me/']"))[0];
      if (telegramLink) {
        telegramUrl = normalizeTelegramUrl(telegramLink.getAttribute("href"));
        username = username || normalizeUsername(telegramLink.getAttribute("href"));
      }
    }
    telegramUrl = telegramUrl || normalizeTelegramUrl(username);
    const name = extractName(card, link);
    return {
      name,
      username,
      telegramUrl,
      tgstatUrl,
      subscribers: findMetric(card, METRIC_LABELS.subscribers, false),
      postReach: findMetric(card, METRIC_LABELS.postReach, false),
      err: findMetric(card, METRIC_LABELS.err, true),
      citationIndex: findMetric(card, METRIC_LABELS.citationIndex, false),
      category: extractCategory(card, link, name),
      extraMetrics: {}
    };
  }

  function validateChannel(channel) {
    if (!channel || typeof channel !== "object") return null;
    const normalized = {
      name: cleanText(channel.name),
      username: normalizeUsername(channel.username || channel.telegramUrl),
      telegramUrl: normalizeTelegramUrl(channel.telegramUrl || channel.username),
      tgstatUrl: normalizeTgstatUrl(channel.tgstatUrl),
      subscribers: parseNumber(channel.subscribers),
      postReach: parseNumber(channel.postReach),
      err: parsePercentage(channel.err),
      citationIndex: parseNumber(channel.citationIndex),
      category: cleanText(channel.category),
      extraMetrics: {}
    };
    normalized.username = normalized.username || usernameFromTgstatUrl(normalized.tgstatUrl);
    normalized.telegramUrl = normalized.telegramUrl || normalizeTelegramUrl(normalized.username);
    return normalized.name || normalized.telegramUrl || normalized.tgstatUrl ? normalized : null;
  }

  function mergeChannels(current, incoming) {
    const merged = { ...current };
    Object.keys(incoming).forEach((key) => {
      if ((merged[key] == null || merged[key] === "") && incoming[key] != null && incoming[key] !== "") merged[key] = incoming[key];
    });
    return merged;
  }

  function identityKeys(channel) {
    return [
      channel.username && `u:${channel.username.toLowerCase()}`,
      channel.telegramUrl && `t:${channel.telegramUrl.toLowerCase()}`,
      channel.tgstatUrl && `g:${channel.tgstatUrl.toLowerCase()}`
    ].filter(Boolean);
  }

  function deduplicateChannels(channels) {
    const result = [];
    const identityMap = new Map();
    (channels || []).forEach((item) => {
      const channel = validateChannel(item);
      if (!channel) return;
      const keys = identityKeys(channel);
      const existingIndex = keys.map((key) => identityMap.get(key)).find((index) => index != null);
      if (existingIndex != null) {
        result[existingIndex] = mergeChannels(result[existingIndex], channel);
        identityKeys(result[existingIndex]).forEach((key) => identityMap.set(key, existingIndex));
        return;
      }
      const index = result.length;
      result.push(channel);
      keys.forEach((key) => identityMap.set(key, index));
    });
    return result;
  }

  function diagnosticsFor(rawCount, channels) {
    const fields = ["name", "username", "telegramUrl", "tgstatUrl", "subscribers", "postReach", "err", "citationIndex", "category"];
    const recognized = {};
    fields.forEach((field) => { recognized[field] = channels.filter((channel) => channel[field] !== "" && channel[field] != null).length; });
    return { rawCount, deduplicatedCount: channels.length, duplicatesRemoved: Math.max(0, rawCount - channels.length), recognized };
  }

  function parseTgstatDocument(container) {
    const cards = findChannelCards(container);
    const parsed = cards.map(parseChannelCard).filter(Boolean);
    const channels = deduplicateChannels(parsed);
    return { channels, diagnostics: diagnosticsFor(parsed.length, channels) };
  }

  return {
    parseTgstatDocument,
    findChannelCards,
    parseChannelCard,
    parseNumber,
    parsePercentage,
    normalizeTelegramUrl,
    normalizeUsername,
    deduplicateChannels,
    validateChannel,
    diagnosticsFor
  };
});
