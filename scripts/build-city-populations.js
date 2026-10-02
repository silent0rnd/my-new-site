const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");
const sourceFile = process.argv[2];
const sourceUrl = "https://rosstat.gov.ru/storage/mediabank/%D0%A1hisl_MO_01-01-2025.xlsx";

if (!sourceFile) {
  throw new Error(`Укажите путь к файлу Росстата: node scripts/build-city-populations.js <xlsx>\n${sourceUrl}`);
}

const citiesData = JSON.parse(fs.readFileSync(path.join(root, "data/russia-cities.json"), "utf8"));
const workbook = XLSX.readFile(path.resolve(sourceFile));
const subjectRows = XLSX.utils.sheet_to_json(workbook.Sheets["Перечень_субъектов_РФ"], { header: 1, defval: "" });
const populationRows = XLSX.utils.sheet_to_json(workbook.Sheets["Численность_по_МО"], { header: 1, defval: "" });

const normalize = (value) => String(value || "").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const genericRegionWords = new Set(["республика", "область", "край", "автономная", "автономный", "округ", "город", "федерального", "значения", "включая", "автономные", "округа", "г"]);
const regionKey = (value) => normalize(value).replace(/[^а-я0-9]+/g, " ").split(" ").filter((word) => word && !genericRegionWords.has(word)).sort().join(" ");
const cityKey = (name, region) => `${normalize(name)}::${region}`;
const fiasRegions = new Map(citiesData.regions.map((region) => [regionKey(region.name), region.name]));
const directRegions = new Map([
  ["чувашская республика", "Чувашская Республика - Чувашия"],
  ["архангельская область, включая ненецкий автономный округ", "Архангельская область"],
  ["кемеровская область - кузбасс", "Кемеровская область - Кузбасс"]
]);
const subjectRegions = new Map();

subjectRows.forEach((row) => {
  const name = String(row[2] || "").trim();
  if (!name) return;
  const region = directRegions.get(normalize(name)) || fiasRegions.get(regionKey(name));
  if (region) subjectRegions.set(normalize(name), region);
});
directRegions.forEach((region, name) => subjectRegions.set(name, region));

let currentRegion = "";
const populations = new Map();
populationRows.forEach((row) => {
  const name = String(row[1] || "").trim();
  const mappedRegion = subjectRegions.get(normalize(name));
  if (mappedRegion) {
    currentRegion = mappedRegion;
    return;
  }
  if (!/^г\.?\s+/i.test(name) || !currentRegion) return;
  const cityName = name.replace(/^г\.?\s+/i, "").trim();
  const population = Number(row[2]);
  if (!Number.isFinite(population) || population < 0) return;
  const key = cityKey(cityName, currentRegion);
  if (populations.has(key) && populations.get(key).population !== population) throw new Error(`Разная численность для ${cityName}, ${currentRegion}`);
  populations.set(key, { name: cityName, region: currentRegion, population });
});

const matchedCities = citiesData.cities.flatMap((city) => {
  const match = populations.get(cityKey(city.name, city.region));
  return match ? [{ name: city.name, region: city.region, population: match.population }] : [];
});
const result = {
  updatedAt: "2025-01-01",
  source: "Росстат, численность постоянного населения по муниципальным образованиям на 1 января 2025 года",
  sourceUrl,
  matchedCities: matchedCities.length,
  cities: matchedCities
};

fs.writeFileSync(path.join(root, "data/russia-city-populations.json"), JSON.stringify(result), "utf8");
console.log(`Записано городов с численностью: ${matchedCities.length} из ${citiesData.cities.length}`);
