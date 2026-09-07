importScripts("audience.js?v=20260907-11", "../mediaplan/vendor/xlsx.full.min.js");

function decode(buffer) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch (error) { return new TextDecoder("windows-1251").decode(buffer); }
}

function separator(text) {
  const line = text.split(/\r?\n/, 1)[0] || "";
  return ["\t", ";", ","].reduce((best, current) => (line.split(current).length > line.split(best).length ? current : best), ",");
}

function parseText(text) {
  const delimiter = separator(text);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

function parsePastedText(text) {
  if (text.includes("\t")) return parseText(text);
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()).map((line) => [line.trim()]);
}

function formatRows(matrix) {
  if (!matrix.length) throw new Error("В файле нет данных.");
  const width = Math.max(...matrix.map((row) => row.length));
  const firstRow = Array.from({ length: width }, (_, index) => String(matrix[0][index] ?? "").trim());
  const hasHeaders = Object.values(AudienceToolCore.detectColumns(firstRow)).some((index) => index !== null);
  const headers = hasHeaders ? firstRow.map((value, index) => value || `Колонка ${index + 1}`) : Array.from({ length: width }, (_, index) => `Колонка ${index + 1}`);
  const rows = (hasHeaders ? matrix.slice(1) : matrix).filter((row) => row.some((value) => String(value || "").trim())).map((row) => Array.from({ length: width }, (_, index) => String(row[index] ?? "").trim()));
  return { headers, rows, suggestedMapping: AudienceToolCore.detectColumns(headers, rows) };
}

self.onmessage = async (event) => {
  try {
    const data = event.data;
    if (data.type === "read") {
      let matrix;
      if (data.text !== undefined) matrix = parsePastedText(data.text);
      else {
        const name = String(data.file.name || "").toLowerCase();
        const buffer = data.buffer;
        if (/\.xlsx?$/.test(name)) { const workbook = XLSX.read(buffer, { type: "array", cellText: true }); matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "", raw: false }); }
        else matrix = parseText(decode(buffer));
      }
      self.postMessage({ type: "parsed", ...formatRows(matrix) });
    }
    if (data.type === "process") {
      const processed = AudienceToolCore.processRows(data.rows, data.mapping, data.options);
      if (data.hash) processed.records = await AudienceToolCore.hashRecords(processed.records);
      self.postMessage({ type: "processed", ...processed });
    }
  } catch (error) { self.postMessage({ type: "error", message: error.message || "Не удалось обработать файл." }); }
};
