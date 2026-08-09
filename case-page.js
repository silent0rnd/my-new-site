(function () {
  const root = document.querySelector("[data-case-root]");
  const page = document.querySelector("[data-case-slug]");

  if (!root || !page || !Array.isArray(window.siteCases)) {
    return;
  }

  const cases = window.siteCases;
  const currentCase = cases.find((caseItem) => caseItem.slug === page.dataset.caseSlug);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const COVERFLOW_TRANSITION_MS = 640;
  const CASE_SKETCH_ORB_PATHS = {
    upper: "M107 12C156 14 196 52 198 101C199 151 163 194 112 198C61 201 17 166 12 114C7 62 47 15 95 13",
    middle: "M105 11C158 9 198 46 200 98C203 149 167 190 117 200C65 211 19 177 10 124C2 72 40 25 91 13",
    lower: "M100 14C149 8 190 40 199 89C207 140 171 185 122 198C72 210 24 178 13 130C0 79 35 27 83 16",
  };
  let activeLightboxIndex = 0;
  let activeLightboxImages = [];
  let lightbox = null;
  let lightboxImage = null;
  let lightboxCaption = null;
  let lightboxCloseButton = null;
  let lightboxHideTimer = null;
  let lastFocusedElement = null;

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (text) {
      element.textContent = text;
    }

    return element;
  }

  function addCaseSketchOrb(section, variant) {
    const orb = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    orb.classList.add("case-sketch-orb", `case-sketch-orb--${variant}`);
    orb.setAttribute("viewBox", "0 0 210 210");
    orb.setAttribute("aria-hidden", "true");
    orb.setAttribute("focusable", "false");
    orb.dataset.caseSketchOrb = variant;

    path.setAttribute("d", CASE_SKETCH_ORB_PATHS[variant]);
    path.setAttribute("vector-effect", "non-scaling-stroke");
    orb.append(path);

    section.classList.add("has-case-sketch-orb");
    section.append(orb);
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

  function assetPath(src) {
    if (src.startsWith("assets/")) {
      return `../../${src}`;
    }

    return src;
  }

  function caseHref(caseItem) {
    return `../${caseItem.slug}/`;
  }

  function appendParagraphs(parent, paragraphs = []) {
    paragraphs.forEach((text) => {
      parent.append(createElement("p", "", text));
    });
  }

  function getRelatedCases() {
    return cases.filter((caseItem) => caseItem.category === currentCase.category && caseItem.slug !== currentCase.slug);
  }

  function hasImages(images) {
    return Array.isArray(images) && images.length > 0;
  }

  function getCaseTitleSuffix(caseItem) {
    return caseItem.channel === "Telegram Ads" ? "кейс Telegram Ads" : "кейс Яндекс.Директ";
  }

  function createGalleryItems(images) {
    return images.map((image, index) => ({
      image: assetPath(image.src),
      text: image.alt || `Скриншот ${index + 1}`,
      index,
    }));
  }

  function getLightboxImage(images, index) {
    const imageCount = images.length;
    const wrappedIndex = (index + imageCount) % imageCount;

    return {
      index: wrappedIndex,
      image: images[wrappedIndex],
    };
  }

  function showLightboxImage(images, index) {
    if (!lightboxImage || !lightboxCaption || images.length === 0) {
      return;
    }

    const nextImage = getLightboxImage(images, index);
    activeLightboxIndex = nextImage.index;
    lightboxImage.src = assetPath(nextImage.image.src);
    lightboxImage.alt = nextImage.image.alt;
    lightboxCaption.textContent = `${activeLightboxIndex + 1} / ${images.length}`;
    lightbox.classList.toggle(
      "is-loading",
      !(lightboxImage.complete && lightboxImage.naturalWidth > 0)
    );
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) {
      return;
    }

    lightbox.classList.remove("is-open");
    document.body.classList.remove("has-lightbox");

    if (lightboxHideTimer) {
      window.clearTimeout(lightboxHideTimer);
    }

    lightboxHideTimer = window.setTimeout(
      () => {
        lightbox.hidden = true;
      },
      reducedMotion.matches ? 0 : 180
    );

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function openLightbox(images, index, triggerElement) {
    if (!lightbox) {
      return;
    }

    lastFocusedElement = triggerElement || document.activeElement;
    activeLightboxImages = images;
    showLightboxImage(activeLightboxImages, index);

    if (lightboxHideTimer) {
      window.clearTimeout(lightboxHideTimer);
    }

    lightbox.hidden = false;
    document.body.classList.add("has-lightbox");

    window.requestAnimationFrame(() => {
      lightbox.classList.add("is-open");
      if (lightboxCloseButton) {
        lightboxCloseButton.focus();
      }
    });
  }

  function handleLightboxKeydown(event) {
    if (!lightbox || lightbox.hidden) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showLightboxImage(activeLightboxImages, activeLightboxIndex - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showLightboxImage(activeLightboxImages, activeLightboxIndex + 1);
    }
  }

  function renderHero() {
    const hero = createElement("section", "case-hero");
    const meta = createElement("p", "case-hero__meta", currentCase.categoryLabel);
    const title = createElement("h1", "", currentCase.title);
    const lead = createElement("p", "case-hero__lead", currentCase.intro);
    const result = createElement("p", "case-hero__result", currentCase.shortResult);

    hero.append(meta, title, lead, result);
    return hero;
  }

  function renderMetrics(metrics) {
    const section = createElement("section", "case-metrics", "");
    section.setAttribute("aria-label", "Ключевые цифры кейса");

    metrics.forEach((metric) => {
      const item = createElement("div", "case-metric");
      item.append(createElement("strong", "", metric.value));
      item.append(createElement("span", "", metric.label));
      section.append(item);
    });

    return section;
  }

  function renderFacts(facts) {
    const list = createElement("dl", "case-facts");

    facts.forEach((fact) => {
      const parts = fact.split(":");
      const term = parts.length > 1 ? parts.shift().trim() : "Факт";
      const description = parts.join(":").trim() || fact;

      list.append(createElement("dt", "", term));
      list.append(createElement("dd", "", description));
    });

    return list;
  }

  function renderSections(sections, headingTag = "h2", decorationVariants = {}) {
    const fragment = document.createDocumentFragment();

    sections.forEach((sectionData, index) => {
      const section = createElement("section", "case-content-section");
      const title = createElement(headingTag, "", sectionData.heading);
      const copy = createElement("div", "case-content-section__copy");

      appendParagraphs(copy, sectionData.paragraphs);

      if (sectionData.items && sectionData.items.length > 0) {
        const list = createElement("ul", "case-content-list");

        sectionData.items.forEach((item) => {
          list.append(createElement("li", "", item));
        });

        copy.append(list);
      }

      section.append(title, copy);

      const decorationVariant = decorationVariants[index];

      if (decorationVariant) {
        addCaseSketchOrb(section, decorationVariant);
      }

      fragment.append(section);
    });

    return fragment;
  }

  function updateCoverflowGallery(gallery, nextIndex) {
    const buttons = gallery.querySelectorAll(".case-gallery__button");
    const dots = gallery.querySelectorAll(".case-gallery__dot");
    const imageCount = buttons.length;

    if (imageCount === 0) return;

    const activeIndex = (nextIndex + imageCount) % imageCount;

    gallery.dataset.activeIndex = String(activeIndex);

    buttons.forEach((button, index) => {
      const rawOffset = index - activeIndex;
      const wrappedOffset =
        Math.abs(rawOffset) > imageCount / 2 ? rawOffset - Math.sign(rawOffset) * imageCount : rawOffset;
      const clampedOffset = Math.max(-2, Math.min(2, wrappedOffset));
      const isActive = index === activeIndex;
      const x = clampedOffset * 58;
      const z = isActive ? 90 : -Math.abs(clampedOffset) * 120;
      const rotate = clampedOffset * -18;
      const scale = isActive ? 1 : 0.86 - Math.min(Math.abs(clampedOffset) * 0.08, 0.16);
      const opacity = Math.abs(clampedOffset) > 2 ? 0 : isActive ? 1 : 0.58;

      button.style.setProperty(
        "--coverflow-transform",
        `translate(-50%, -50%) translateX(${x}%) translateZ(${z}px) rotateY(${rotate}deg) scale(${scale})`
      );
      button.style.setProperty("--coverflow-x", `${clampedOffset * 72}px`);
      button.style.zIndex = String(10 - Math.abs(Math.round(clampedOffset)));
      button.parentElement.style.zIndex = button.style.zIndex;
      button.style.opacity = String(opacity);
      button.tabIndex = isActive ? 0 : -1;
      button.setAttribute("aria-current", String(isActive));
      button.classList.remove("is-tilting");
      button.style.removeProperty("--tilt-rotate-x");
      button.style.removeProperty("--tilt-rotate-y");
      button.style.removeProperty("--tilt-lift");
    });

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex);
      dot.setAttribute("aria-current", String(index === activeIndex));
    });
  }

  function lockCoverflowAnimation(gallery) {
    if (reducedMotion.matches) return;

    gallery.dataset.isAnimating = "true";

    if (gallery._coverflowAnimationTimer) {
      window.clearTimeout(gallery._coverflowAnimationTimer);
    }

    gallery._coverflowAnimationTimer = window.setTimeout(() => {
      delete gallery.dataset.isAnimating;
      gallery._coverflowAnimationTimer = null;
    }, COVERFLOW_TRANSITION_MS);
  }

  function setCoverflowIndex(gallery, index) {
    const imageCount = gallery.querySelectorAll(".case-gallery__button").length;

    if (imageCount === 0) return;
    if (!reducedMotion.matches && gallery.dataset.isAnimating === "true") return;
    updateCoverflowGallery(gallery, index);
    lockCoverflowAnimation(gallery);
  }

  function bindCoverflowHoverTilt(gallery) {
    const buttons = gallery.querySelectorAll(".case-gallery__button");

    const resetTilt = (button) => {
      button.classList.remove("is-tilting");
      button.style.removeProperty("--tilt-rotate-x");
      button.style.removeProperty("--tilt-rotate-y");
      button.style.removeProperty("--tilt-lift");
    };

    buttons.forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        if (reducedMotion.matches || event.pointerType === "touch" || button.getAttribute("aria-current") !== "true") return;

        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        const rotateX = Math.max(-1, Math.min(1, y)) * -7;
        const rotateY = Math.max(-1, Math.min(1, x)) * 9;

        button.classList.add("is-tilting");
        button.style.setProperty("--tilt-rotate-x", `${rotateX.toFixed(2)}deg`);
        button.style.setProperty("--tilt-rotate-y", `${rotateY.toFixed(2)}deg`);
        button.style.setProperty("--tilt-lift", "18px");
      });

      button.addEventListener("pointerleave", () => resetTilt(button));
      button.addEventListener("blur", () => resetTilt(button));
      button.addEventListener("click", () => resetTilt(button));
    });
  }

  function renderCoverflowGallery(images) {
    const gallery = createElement("div", "case-gallery");
    const stage = createElement("div", "case-gallery__stage");
    const previousButton = createElement("button", "case-gallery__nav case-gallery__nav--prev");
    const nextButton = createElement("button", "case-gallery__nav case-gallery__nav--next");
    const progress = createElement("div", "case-gallery__progress");
    const galleryItems = createGalleryItems(images);

    stage.setAttribute("aria-label", "Галерея скриншотов");
    previousButton.type = "button";
    nextButton.type = "button";
    setHandDrawnNavIcon(previousButton, "prev");
    setHandDrawnNavIcon(nextButton, "next");
    previousButton.setAttribute("aria-label", "Предыдущий скриншот");
    nextButton.setAttribute("aria-label", "Следующий скриншот");

    galleryItems.forEach((galleryItem) => {
      const figure = createElement("figure", "case-gallery__item");
      const button = createElement("button", "case-gallery__button");
      const img = document.createElement("img");

      button.type = "button";
      button.setAttribute("data-lightbox-index", String(galleryItem.index));
      button.setAttribute("aria-label", `Открыть скриншот ${galleryItem.index + 1} из ${galleryItems.length}`);
      button.addEventListener("click", () => openLightbox(images, galleryItem.index, button));
      img.src = galleryItem.image;
      img.alt = galleryItem.text;
      img.loading = "lazy";
      img.decoding = "async";

      button.append(img);
      figure.append(button);
      stage.append(figure);

      const dot = createElement("button", "case-gallery__dot");
      dot.type = "button";
      dot.setAttribute("aria-label", `Показать скриншот ${galleryItem.index + 1}`);
      dot.addEventListener("click", () => setCoverflowIndex(gallery, galleryItem.index));
      progress.append(dot);
    });

    previousButton.addEventListener("click", () => setCoverflowIndex(gallery, Number(gallery.dataset.activeIndex || "0") - 1));
    nextButton.addEventListener("click", () => setCoverflowIndex(gallery, Number(gallery.dataset.activeIndex || "0") + 1));
    gallery.append(stage, previousButton, nextButton, progress);
    updateCoverflowGallery(gallery, 0);
    bindCoverflowHoverTilt(gallery);
    return gallery;
  }

  function renderGallery(images, headingTag = "h2") {
    const section = createElement("section", "case-gallery-section");
    const title = createElement(headingTag, "", "Скриншоты");
    const gallery = renderCoverflowGallery(images);

    section.append(title, gallery);
    return section;
  }

  function renderCollectionProject(project, index, decorationVariant = "") {
    const section = createElement("section", "case-project");
    const header = createElement("header", "case-project__header");
    const number = createElement("p", "case-project__number", `Проект ${String(index + 1).padStart(2, "0")}`);
    const title = createElement("h2", "", project.title);
    const intro = createElement("p", "case-project__intro", project.intro);

    header.append(number, title, intro);
    section.append(
      header,
      renderMetrics(project.metrics),
      renderFacts(project.facts),
      renderSections(project.sections, "h3", decorationVariant ? { 0: decorationVariant } : {}),
    );

    if (hasImages(project.images)) {
      section.append(renderGallery(project.images, "h3"));
    }

    return section;
  }

  function renderLightbox() {
    const overlay = createElement("div", "case-lightbox");
    const backdrop = createElement("button", "case-lightbox__backdrop");
    const figure = createElement("figure", "case-lightbox__figure");
    const previousButton = createElement("button", "case-lightbox__button case-lightbox__button--prev");
    const nextButton = createElement("button", "case-lightbox__button case-lightbox__button--next");
    const closeButton = createElement("button", "case-lightbox__close", "×");
    const image = document.createElement("img");
    const caption = createElement("figcaption", "case-lightbox__caption");

    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Просмотр скриншотов");
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Закрыть скриншот");
    previousButton.type = "button";
    previousButton.setAttribute("aria-label", "Предыдущий скриншот");
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "Следующий скриншот");
    setHandDrawnNavIcon(previousButton, "prev");
    setHandDrawnNavIcon(nextButton, "next");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Закрыть");
    image.className = "case-lightbox__image";
    image.decoding = "async";
    image.addEventListener("load", () => overlay.classList.remove("is-loading"));
    image.addEventListener("error", () => overlay.classList.remove("is-loading"));

    lightbox = overlay;
    lightboxImage = image;
    lightboxCaption = caption;
    lightboxCloseButton = closeButton;

    backdrop.addEventListener("click", closeLightbox);
    previousButton.addEventListener("click", () => showLightboxImage(activeLightboxImages, activeLightboxIndex - 1));
    nextButton.addEventListener("click", () => showLightboxImage(activeLightboxImages, activeLightboxIndex + 1));
    closeButton.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", handleLightboxKeydown);

    figure.append(image, caption);
    overlay.append(backdrop, figure, previousButton, nextButton, closeButton);
    return overlay;
  }

  function renderConclusion() {
    const section = createElement("section", "case-conclusion");
    section.append(createElement("h2", "", "Вывод"));
    section.append(createElement("p", "", currentCase.conclusion));
    addCaseSketchOrb(section, "lower");
    return section;
  }

  function initCaseSketchOrbs() {
    const orbs = document.querySelectorAll("[data-case-sketch-orb]");

    if (orbs.length === 0 || reducedMotion.matches || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-animated", entry.isIntersecting);
        });
      },
      { rootMargin: "300px 0px" },
    );

    orbs.forEach((orb) => observer.observe(orb));
  }

  function renderRelatedCases() {
    const relatedCases = getRelatedCases();
    const section = createElement("section", "related-cases");
    const title = createElement("h2", "", "Другие кейсы в этой нише");
    const listWrap = createElement("div", "related-list-wrap");
    const list = createElement("div", "related-list");

    relatedCases.forEach((caseItem) => {
      const link = createElement("a", "related-card");
      const titleText = createElement("span", "related-card__title", caseItem.title);
      const result = createElement("span", "related-card__result", caseItem.shortResult);
      const channel = createElement("span", "related-card__channel", caseItem.channel);

      link.href = caseHref(caseItem);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(titleText, result, channel);
      list.append(link);
    });

    listWrap.append(list);
    section.append(title, listWrap);
    return section;
  }

  function revealRelatedCards() {
    const relatedCards = document.querySelectorAll(".related-card");

    if (reducedMotion.matches || relatedCards.length === 0) {
      relatedCards.forEach((card) => card.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, activeObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          activeObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.18 }
    );

    relatedCards.forEach((card) => observer.observe(card));
  }

  function initRelatedCasesHover() {
    const relatedCards = document.querySelectorAll(".related-card");
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

    if (relatedCards.length === 0 || reducedMotion.matches || !canHover.matches) {
      return;
    }

    relatedCards.forEach((card) => {
      let frame = null;

      const resetCard = () => {
        card.style.setProperty("--related-hover-x", "0px");
        card.style.setProperty("--related-hover-y", "0px");
        card.style.setProperty("--related-hover-rotate-x", "0deg");
        card.style.setProperty("--related-hover-rotate-y", "0deg");
      };

      card.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        if (frame) window.cancelAnimationFrame(frame);

        frame = window.requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const relativeX = (event.clientX - rect.left) / rect.width;
          const relativeY = (event.clientY - rect.top) / rect.height;
          const moveX = Math.max(0, (relativeX - 0.5) * 3);
          const moveY = (relativeY - 0.5) * 4;
          const rotateX = (0.5 - relativeY) * 3;
          const rotateY = (relativeX - 0.5) * 4;

          card.style.setProperty("--related-hover-x", `${moveX.toFixed(2)}px`);
          card.style.setProperty("--related-hover-y", `${moveY.toFixed(2)}px`);
          card.style.setProperty("--related-hover-rotate-x", `${rotateX.toFixed(2)}deg`);
          card.style.setProperty("--related-hover-rotate-y", `${rotateY.toFixed(2)}deg`);
        });
      });

      card.addEventListener("pointerleave", () => {
        if (frame) window.cancelAnimationFrame(frame);
        resetCard();
      });
      card.addEventListener("blur", resetCard);
    });
  }

  function renderCasePage() {
    if (!currentCase) {
      root.textContent = "Кейс не найден.";
      return;
    }

    document.title =
      currentCase.caseType === "collection" ? `${currentCase.title} - кейсы` : `${currentCase.title} - ${getCaseTitleSuffix(currentCase)}`;
    root.textContent = "";

    if (currentCase.caseType === "collection") {
      const middleDecorationIndex = Math.floor(currentCase.projects.length / 2);
      const lowerDecorationIndex = Math.min(
        currentCase.projects.length - 1,
        Math.max(1, Math.floor(currentCase.projects.length * 0.6)),
      );
      const pageBlocks = [
        renderHero(),
        ...currentCase.projects.map((project, index) => {
          const decorationVariant = index === 0
            ? "upper"
            : index === middleDecorationIndex
              ? "middle"
              : index === lowerDecorationIndex
                ? "lower"
                : "";
          return renderCollectionProject(project, index, decorationVariant);
        }),
        renderLightbox(),
      ];

      root.append(...pageBlocks);
      initCaseSketchOrbs();
      return;
    }

    const middleDecorationIndex = Math.floor(currentCase.sections.length / 2);
    const pageBlocks = [
      renderHero(),
      renderMetrics(currentCase.metrics),
      renderFacts(currentCase.facts),
      renderSections(currentCase.sections, "h2", {
        0: "upper",
        [middleDecorationIndex]: "middle",
      }),
    ];

    if (hasImages(currentCase.images)) {
      pageBlocks.push(renderGallery(currentCase.images));
    }

    pageBlocks.push(renderConclusion(), renderRelatedCases());

    if (hasImages(currentCase.images)) {
      pageBlocks.push(renderLightbox());
    }

    root.append(...pageBlocks);
    initCaseSketchOrbs();
    revealRelatedCards();
    initRelatedCasesHover();
  }

  renderCasePage();
})();
