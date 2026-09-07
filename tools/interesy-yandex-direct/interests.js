(() => {
  const root = document.querySelector("[data-interests-catalog]");
  if (!root) return;

  const search = root.querySelector("[data-interests-search]");
  const types = root.querySelector("[data-interests-types]");
  const tree = root.querySelector("[data-interests-tree]");
  const status = root.querySelector("[data-interests-status]");
  const updated = root.querySelector("[data-interests-updated]");
  const expand = root.querySelector("[data-interests-expand]");
  const collapse = root.querySelector("[data-interests-collapse]");
  let cache;

  const labels = { SHORT_TERM: "Краткосрочные", LONG_TERM: "Долгосрочные", ANY: "Любой период" };
  const normalize = (value) => String(value || "").toLocaleLowerCase("ru-RU").trim();
  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

  function indexed(items) {
    const byId = new Map(items.map((item) => [item.id, { ...item, children: [] }]));
    const roots = [];
    byId.forEach((item) => {
      const parent = item.parentId && byId.get(item.parentId);
      if (parent && parent.id !== item.id) parent.children.push(item); else roots.push(item);
    });
    return { byId, roots };
  }

  function pathFor(item, byId) {
    const chain = [item.name];
    const visited = new Set([item.id]);
    let parent = item.parentId && byId.get(item.parentId);
    while (parent && !visited.has(parent.id)) {
      visited.add(parent.id); chain.unshift(parent.name); parent = parent.parentId && byId.get(parent.parentId);
    }
    return chain;
  }

  function itemCard(item, path) {
    const isStandalone = path.length === 1;
    return `<article class="interests-catalog__item${isStandalone ? " interests-catalog__item--standalone" : ""}"><h3>${escapeHtml(item.name)}</h3>${isStandalone ? "" : `<p class="interests-catalog__path">${escapeHtml(path.join(" → "))}</p>`}${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${isStandalone ? "" : `<p class="interests-catalog__meta">Тип: ${labels[item.interestType] || item.interestType}</p>`}</article>`;
  }

  function branch(item, byId) {
    const path = pathFor(item, byId);
    if (!item.children.length) return itemCard(item, path);
    return `<details class="interests-catalog__branch"><summary><span>${escapeHtml(item.name)}</span><span class="interests-catalog__count">${item.children.length}</span></summary><div class="interests-catalog__children">${item.description ? `<p class="interests-catalog__description">${escapeHtml(item.description)}</p>` : ""}${item.children.map((child) => branch(child, byId)).join("")}</div></details>`;
  }

  function render() {
    const selected = root.querySelector("[data-interests-type].is-active")?.dataset.interestsType || "SHORT_TERM";
    const items = cache.items.filter((item) => item.interestType === selected);
    const query = normalize(search.value);
    const { byId, roots } = indexed(items);
    if (query) {
      const found = items.filter((item) => normalize(item.name).includes(query) || normalize(item.description).includes(query));
      tree.innerHTML = found.length ? `<div class="interests-catalog__results">${found.map((item) => itemCard(item, pathFor(item, byId))).join("")}</div>` : "";
      status.textContent = found.length ? `Найдено: ${found.length}` : "По вашему запросу интересы не найдены.";
      return;
    }
    tree.innerHTML = roots.length ? roots.map((item) => branch(item, byId)).join("") : "";
    status.textContent = roots.length ? `Категорий: ${roots.length}. Интересов: ${items.length}.` : "Для выбранного типа интересов данных пока нет.";
  }

  function renderTypes() {
    const present = ["SHORT_TERM", "LONG_TERM", "ANY"].filter((type) => cache.items.some((item) => item.interestType === type));
    types.innerHTML = present.map((type) => `<button class="utm-button${type === "SHORT_TERM" ? " is-active" : " utm-button--ghost"}" type="button" data-interests-type="${type}">${labels[type]}</button>`).join("");
    types.hidden = present.length < 2;
  }

  fetch("../../data/yandex-direct-interests.json", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data) => {
      if (!data || !Array.isArray(data.items)) throw new Error("Invalid cache");
      cache = {
        ...data,
        items: data.items.map((item) => ({
          id: String(item.Id ?? item.id ?? ""),
          parentId: item.ParentId == null && item.parentId == null ? null : String(item.ParentId ?? item.parentId),
          name: String(item.Name ?? item.name ?? ""),
          description: String(item.Description ?? item.description ?? ""),
          interestType: String(item.InterestType ?? item.interestType ?? "SHORT_TERM"),
          interestKey: item.InterestKey ?? item.interestKey ?? null
        })).filter((item) => item.id && item.name)
      };
      if (data.updatedAt) updated.textContent = `Данные обновлены: ${new Intl.DateTimeFormat("ru-RU").format(new Date(data.updatedAt))}. Источник: Яндекс Директ API.`;
      else updated.textContent = "Данные ещё не загружены.";
      renderTypes(); render();
    })
    .catch(() => { status.textContent = "Каталог временно недоступен. Попробуйте обновить страницу позже."; });

  search.addEventListener("input", () => cache && render());
  types.addEventListener("click", (event) => {
    const button = event.target.closest("[data-interests-type]"); if (!button || !cache) return;
    types.querySelectorAll("[data-interests-type]").forEach((item) => item.classList.toggle("is-active", item === button));
    types.querySelectorAll("[data-interests-type]").forEach((item) => item.classList.toggle("utm-button--ghost", item !== button)); render();
  });
  expand.addEventListener("click", () => tree.querySelectorAll("details").forEach((item) => { item.open = true; }));
  collapse.addEventListener("click", () => tree.querySelectorAll("details").forEach((item) => { item.open = false; }));
})();
