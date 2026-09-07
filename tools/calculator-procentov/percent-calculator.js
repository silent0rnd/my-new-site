function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== "string") return Number.NaN;

  const normalized = value.trim().replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (normalized === "" || !/^\d+(?:\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

function roundResult(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(roundResult(value));
}

function hasValidValues(values) {
  return values.every((value) => Number.isFinite(value) && value >= 0);
}

function calculatePercent(value, percent) {
  const parsedValue = parseNumber(value);
  const parsedPercent = parseNumber(percent);
  if (!hasValidValues([parsedValue, parsedPercent])) return null;
  const result = parsedValue * parsedPercent / 100;
  return Number.isFinite(result) ? roundResult(result) : null;
}

function calculatePercentOf(value1, value2) {
  const first = parseNumber(value1);
  const second = parseNumber(value2);
  if (!hasValidValues([first, second]) || second === 0) return null;
  const result = first / second * 100;
  return Number.isFinite(result) ? roundResult(result) : null;
}

function addPercent(value, percent) {
  const parsedValue = parseNumber(value);
  const percentPart = calculatePercent(value, percent);
  if (!Number.isFinite(parsedValue) || percentPart === null) return null;
  const result = parsedValue + percentPart;
  return Number.isFinite(result) ? roundResult(result) : null;
}

function subtractPercent(value, percent) {
  const parsedValue = parseNumber(value);
  const percentPart = calculatePercent(value, percent);
  if (!Number.isFinite(parsedValue) || percentPart === null) return null;
  const result = parsedValue - percentPart;
  return Number.isFinite(result) ? roundResult(result) : null;
}

function calculateFixedPlusPercent(base, percent, fixed = 0) {
  const parsedBase = parseNumber(base);
  const parsedPercent = parseNumber(percent);
  const parsedFixed = fixed === "" || fixed === null || typeof fixed === "undefined" ? 0 : parseNumber(fixed);
  if (!hasValidValues([parsedBase, parsedPercent, parsedFixed])) return null;

  const percentPart = calculatePercent(parsedBase, parsedPercent);
  if (percentPart === null || !Number.isFinite(percentPart + parsedFixed)) return null;
  return {
    base: parsedBase,
    percent: parsedPercent,
    fixed: parsedFixed,
    percentPart,
    total: roundResult(percentPart + parsedFixed),
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    addPercent,
    calculateFixedPlusPercent,
    calculatePercent,
    calculatePercentOf,
    formatNumber,
    parseNumber,
    subtractPercent,
  };
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-percent-calculator]");

  if (root) {
    const baseInput = root.querySelector("[name=percent-base]");
    const rateInput = root.querySelector("[name=percent-rate]");
    const fixedInput = root.querySelector("[name=percent-fixed]");
    const mainError = root.querySelector("[data-main-error]");

    function setMainText(selector, value) {
      root.querySelector(selector).textContent = value;
    }

    function renderMain() {
      const result = calculateFixedPlusPercent(baseInput.value, rateInput.value, fixedInput.value);
      const hasBase = baseInput.value.trim() !== "";
      const hasInvalidInput = [baseInput, rateInput, fixedInput].some((input) => input.value.trim() !== "" && !Number.isFinite(parseNumber(input.value)));

      mainError.hidden = !hasInvalidInput;

      if (!hasBase || !result) {
        setMainText("[data-main-percent]", "0 ₽");
        setMainText("[data-main-fixed]", "0 ₽");
        setMainText("[data-main-total]", "0 ₽");
        setMainText("[data-main-expression]", hasInvalidInput ? "Проверьте введённые значения" : "Введите сумму");
        return;
      }

      setMainText("[data-main-percent]", `${formatNumber(result.percentPart)} ₽`);
      setMainText("[data-main-fixed]", `${formatNumber(result.fixed)} ₽`);
      setMainText("[data-main-total]", `${formatNumber(result.total)} ₽`);
      setMainText("[data-main-expression]", `${formatNumber(result.base)} × ${formatNumber(result.percent)}% + ${formatNumber(result.fixed)} = ${formatNumber(result.total)} ₽`);
    }

    root.querySelectorAll("[data-main-input]").forEach((input) => input.addEventListener("input", renderMain));
    root.querySelector("[data-percent-reset]").addEventListener("click", () => {
      baseInput.value = "";
      rateInput.value = "5";
      fixedInput.value = "";
      renderMain();
      baseInput.focus();
    });

    const modes = {
      "percent-of": (x, y) => calculatePercent(y, x),
      "what-percent": (x, y) => calculatePercentOf(x, y),
      "add-percent": (x, y) => addPercent(y, x),
      "subtract-percent": (x, y) => subtractPercent(y, x),
    };

    root.querySelectorAll("[data-percent-mode]").forEach((card) => {
      const inputs = [...card.querySelectorAll("input")];
      const output = card.querySelector("output");
      const renderCard = () => {
        const [x, y] = inputs.map((input) => input.value);
        if (inputs.some((input) => input.value.trim() === "")) {
          output.textContent = "Введите значения";
          output.classList.remove("is-error");
          return;
        }

        const result = modes[card.dataset.percentMode](x, y);
        if (result === null) {
          output.textContent = card.dataset.percentMode === "what-percent" && parseNumber(y) === 0 ? "На ноль делить нельзя" : "Проверьте значения";
          output.classList.add("is-error");
          return;
        }

        const suffix = card.dataset.percentMode === "what-percent" ? "%" : "";
        output.textContent = `${formatNumber(result)}${suffix}`;
        output.classList.remove("is-error");
      };

      inputs.forEach((input) => input.addEventListener("input", renderCard));
    });

    renderMain();
  }
}
