#!/usr/bin/env python3
"""Import Keys.so competitor exports into the persistent local research base."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / ".agents" / "research" / "seo-competitors"
SOURCES = BASE / "sources"
RAW = SOURCES / "raw"
INTAKE = SOURCES / "source-intake.json"
PROCESSED = BASE / "processed"
REPORTS = BASE / "reports"
TARGET_SITEMAP = ROOT / "sitemap.xml"
TARGET_INTENTS = ROOT / "seo-project-sources-v8" / "naklikay_seo_intent_map_2026-10-26_MONITORING_EXISTING_PAGES.md"

COMPETITORS = [
    "blog-directologa.ru", "marketingbezpontov.ru", "yumashev.digital",
    "trafformula.ru", "mikhailantonov.digital", "vtop.pro", "baikal-target.ru",
    "digitalriff.ru", "zhadov.ru", "smart-conversion.ru", "trafdealer.ru",
    "atib.by", "pageagency.ru", "context-kill.by", "inclusif.ru",
    "dmitry-rzhansky.ru", "geodirect.ru", "spichkaaa.ru", "iammarketing.ru",
    "amigos-digital.ru", "pilum.agency", "gaiphutdinov.ru", "coocher.ru",
    "leolukin.ru", "marchenko.agency",
]
OWN_DOMAIN = "naklikay.ru"

STOP_WORDS = {
    "и", "в", "во", "на", "по", "с", "для", "как", "что", "это", "или", "из",
    "к", "от", "до", "а", "о", "об", "не", "за", "при", "ли", "про", "где",
    "когда", "почему", "можно", "нужно", "лучше", "все", "свой", "его", "ее",
}
RELEVANT_TERMS = {
    "директ", "яндекс", "реклама", "контекст", "лид", "лиды", "трафик",
    "маркетинг", "продвижение", "конверсия", "метрика", "объявления", "бюджет",
    "кампания", "кампании", "cpa", "cpl", "roi", "romi", "seo",
}


def sha256_file(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_dirs():
    for path in (SOURCES, RAW, PROCESSED, REPORTS):
        path.mkdir(parents=True, exist_ok=True)


def clean_text(value: object):
    return str(value or "").replace("\u2014", "-").replace("\u2013", "-").replace("\u2011", "-").replace("\u2192", " ").replace(chr(45) + chr(62), " ").replace(chr(96), '"')


def write_csv(path: Path, fields: list[str], rows: list[dict]):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: clean_text(row.get(field, "")) for field in fields})


def write_json(path: Path, data: object):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_csv(path: Path):
    raw = path.read_bytes()
    candidates = ["utf-8-sig", "utf-8", "cp1251"]
    text = next((raw.decode(encoding) for encoding in candidates if _can_decode(raw, encoding)), None)
    if text is None:
        raise ValueError(f"Не удалось определить кодировку: {path.name}")
    first_line = next((line for line in text.splitlines() if line.strip()), "")
    delimiter = ";" if first_line.count(";") >= first_line.count(",") else ","
    reader = csv.DictReader(text.splitlines(), delimiter=delimiter)
    rows = []
    for row in reader:
        rows.append({clean_header(key): (value or "").strip() for key, value in row.items() if key})
    return rows, text, delimiter


def _can_decode(raw: bytes, encoding: str):
    try:
        raw.decode(encoding)
        return True
    except UnicodeDecodeError:
        return False


def clean_header(value: str):
    return value.replace('"', "").strip()


def number(value: str):
    value = (value or "").replace("\u00a0", "").replace(" ", "").replace(",", ".")
    if not value:
        return ""
    try:
        numeric = float(value)
    except ValueError:
        return ""
    return str(int(numeric)) if numeric.is_integer() else str(numeric)


def normal_url(value: str):
    value = (value or "").strip().strip('"')
    if not value:
        return ""
    if not re.match(r"^[a-z]+://", value, re.I):
        value = "https://" + value
    parts = urlsplit(value)
    host = parts.netloc.lower().removeprefix("www.")
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), host, path, parts.query, ""))


def report_type(name: str, headers: set[str]):
    lowered = name.lower()
    if "organic.site_pages" in lowered or "в топ 10" in headers:
        return "organic-pages"
    if "ai-answers" in lowered or "ответ ии" in headers:
        return "alice-ai-answers"
    return "unknown"


def domain_from_name(name: str):
    for marker in (".organic.site_pages", ".ai-answers"):
        if marker in name:
            return name.split(marker, 1)[0].lower()
    matched = re.match(r"([a-z0-9.-]+)", name.lower())
    return matched.group(1).rstrip(".") if matched else ""


def metric(row: dict[str, str], label: str):
    for key, value in row.items():
        if clean_header(key).lower() == label.lower():
            return number(value)
    return ""


def extract_urls(value: str):
    urls = []
    for part in re.split(r"(?=https?://)", value or "", flags=re.I):
        urls.extend(re.findall(r'https?://[^\s\]\[\)\}"\'<>]+', part, flags=re.I))
    return sorted({normal_url(url.rstrip(".,;")) for url in urls if normal_url(url.rstrip(".,;"))})


def load_intake():
    if not INTAKE.exists():
        return {}
    return json.loads(INTAKE.read_text(encoding="utf-8"))


def store_raw(source: Path, original_name: str, origin: str, intake: dict[str, dict]):
    content_hash = sha256_file(source)
    target = RAW / f"{content_hash}.csv"
    if not target.exists():
        shutil.copy2(source, target)
    metadata = intake.setdefault(content_hash, {"original_names": [], "origins": [], "first_received": str(date.today())})
    metadata.setdefault("first_received", str(date.today()))
    if original_name not in metadata["original_names"]:
        metadata["original_names"].append(original_name)
    if origin not in metadata["origins"]:
        metadata["origins"].append(origin)
    return target


def stage_inputs(inputs: list[Path]):
    intake = load_intake()
    for source in inputs:
        if source.suffix.lower() == ".csv":
            store_raw(source, source.name, str(source), intake)
            continue
        if source.suffix.lower() != ".rar":
            raise ValueError(f"Поддерживаются CSV и RAR: {source}")
        archive_hash = sha256_file(source)
        archive_copy = SOURCES / f"{archive_hash}.rar"
        if not archive_copy.exists():
            shutil.copy2(source, archive_copy)
        temporary = Path(tempfile.mkdtemp(prefix="seo-competitors-"))
        try:
            subprocess.run(["tar", "-xf", str(source), "-C", str(temporary)], check=True, capture_output=True)
            for extracted in temporary.rglob("*.csv"):
                store_raw(extracted, extracted.name, str(source), intake)
        finally:
            shutil.rmtree(temporary, ignore_errors=True)
    write_json(INTAKE, intake)


def all_raw_files():
    return sorted(RAW.glob("*.csv"))


def build_target_pages():
    pages: dict[str, dict[str, str]] = {}
    if TARGET_SITEMAP.exists():
        for url in re.findall(r"<loc>(https?://[^<]+)</loc>", TARGET_SITEMAP.read_text(encoding="utf-8")):
            clean = normal_url(url)
            pages[clean] = {"url": clean, "title": "", "intent": "", "source": "sitemap"}
    if TARGET_INTENTS.exists():
        for line in TARGET_INTENTS.read_text(encoding="utf-8").splitlines():
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if len(cells) < 6 or not cells[0].isdigit() or not cells[-1].startswith("http"):
                continue
            clean = normal_url(cells[-1])
            pages[clean] = {"url": clean, "title": cells[3], "intent": cells[4], "source": "intent-map"}
    return sorted(pages.values(), key=lambda item: item["url"])


def content_type(url: str):
    lowered = url.lower()
    if any(part in lowered for part in ("case", "кей", "portfolio")):
        return "case"
    if any(part in lowered for part in ("uslug", "service", "price", "tarif")):
        return "service"
    if any(part in lowered for part in ("blog", "stati", "article", "post")):
        return "article"
    return "other"


def tokens(value: str):
    values = set()
    for token in re.findall(r"[a-zа-яё0-9]{3,}", value.lower()):
        if token in STOP_WORDS:
            continue
        values.add(token)
        if token.endswith("ы") and len(token) > 4:
            values.add(token[:-1])
        if token.endswith("и") and len(token) > 5:
            values.add(token[:-1])
        if token.endswith("ов") and len(token) > 5:
            values.add(token[:-2])
    return values


def topic_label(query: str):
    terms = tokens(query)
    if {"яндекс", "директ"} & terms:
        return "yandex-direct"
    if "реклама" in terms or "контекст" in terms:
        return "paid-advertising"
    if "лид" in terms or "лиды" in terms:
        return "lead-generation"
    if "аналитика" in terms or "метрика" in terms:
        return "analytics"
    if "seo" in terms or "продвижение" in terms:
        return "search-marketing"
    return "other"


def markdown_table(headers: list[str], rows: list[list[str]]):
    head = "| " + " | ".join(headers) + " |\n"
    divider = "| " + " | ".join(["---"] * len(headers)) + " |\n"
    body = "".join("| " + " | ".join(clean_text(cell).replace("|", "\\|").replace("\n", " ") for cell in row) + " |\n" for row in rows)
    return head + divider + body


def main():
    parser = argparse.ArgumentParser(description="Import Keys.so competitor CSV and RAR exports.")
    parser.add_argument("inputs", nargs="*", type=Path, help="CSV or RAR files to add")
    args = parser.parse_args()
    ensure_dirs()
    if args.inputs:
        missing = [str(path) for path in args.inputs if not path.exists()]
        if missing:
            raise FileNotFoundError("Не найдены: " + ", ".join(missing))
        stage_inputs(args.inputs)

    intake = load_intake()
    source_rows: list[dict] = []
    organic_rows: list[dict] = []
    ai_rows: list[dict] = []
    citation_rows: list[dict] = []
    for raw_path in all_raw_files():
        file_hash = sha256_file(raw_path)
        source_id = file_hash[:16]
        rows, raw_text, delimiter = read_csv(raw_path)
        headers = set(rows[0].keys()) if rows else set()
        metadata = intake.get(file_hash, {})
        source_names = metadata.get("original_names", [raw_path.name])
        inferred_name = source_names[0]
        kind = report_type(inferred_name, headers)
        domain = domain_from_name(inferred_name)
        source_rows.append({
            "source_id": source_id, "content_sha256": file_hash, "stored_file": raw_path.name,
            "original_name": " | ".join(source_names), "origin": " | ".join(metadata.get("origins", [])), "domain": domain, "report_type": kind,
            "encoding": "utf-8", "delimiter": delimiter, "received_date": metadata.get("first_received", str(date.today())),
            "region": "msk", "status": "duplicate-source" if len(source_names) > 1 else "imported",
            "duplicate_of": source_names[0] if len(source_names) > 1 else "", "row_count": len(rows), "schema": "; ".join(sorted(headers)),
        })
        if kind == "unknown":
            continue
        if kind == "organic-pages":
            for row in rows:
                url = normal_url(row.get("url", ""))
                if not url:
                    continue
                organic_rows.append({
                    "source_id": source_id, "domain": domain, "url": url,
                    "top_1": metric(row, "В топ 1"), "top_3": metric(row, "В топ 3"),
                    "top_5": metric(row, "В топ 5"), "top_10": metric(row, "В топ 10"),
                    "top_50": metric(row, "В топ 50"), "visibility": metric(row, "Ср. видимость"),
                    "content_type": content_type(url),
                })
        if kind == "alice-ai-answers":
            for row in rows:
                query = row.get("Запрос", "")
                answer = row.get("Ответ ИИ", "")
                listed_sources = row.get("Источники", "")
                record = {
                    "source_id": source_id, "domain": domain, "query": query,
                    "frequency": number(row.get("Частотность", "")),
                    "exact_frequency": number(row.get("!Частотность", "")),
                    "bracket_frequency": number(row.get("[!Частотность]", "")),
                    "response_date": row.get("Дата", ""), "answer_text": answer,
                    "sources_text": listed_sources,
                }
                ai_rows.append(record)
                for cited_url in extract_urls(answer + " " + listed_sources):
                    citation_rows.append({
                        "source_id": source_id, "observed_competitor": domain, "query": query,
                        "frequency": record["frequency"], "response_date": record["response_date"],
                        "cited_url": cited_url, "cited_domain": urlsplit(cited_url).netloc.removeprefix("www."),
                    })

    targets = build_target_pages()
    competitor_organic_rows = [row for row in organic_rows if row["domain"] in COMPETITORS]
    naklikay_organic_rows = [row for row in organic_rows if row["domain"] == OWN_DOMAIN]
    competitor_ai_rows = [row for row in ai_rows if row["domain"] in COMPETITORS]
    naklikay_ai_rows = [row for row in ai_rows if row["domain"] == OWN_DOMAIN]
    write_csv(PROCESSED / "source-manifest.csv", list(source_rows[0].keys()) if source_rows else ["source_id"], source_rows)
    write_json(PROCESSED / "source-manifest.json", source_rows)
    write_csv(PROCESSED / "organic-pages.csv", ["source_id", "domain", "url", "top_1", "top_3", "top_5", "top_10", "top_50", "visibility", "content_type"], organic_rows)
    write_csv(PROCESSED / "alice-ai-answers.csv", ["source_id", "domain", "query", "frequency", "exact_frequency", "bracket_frequency", "response_date", "answer_text", "sources_text"], ai_rows)
    write_csv(PROCESSED / "alice-citations.csv", ["source_id", "observed_competitor", "query", "frequency", "response_date", "cited_url", "cited_domain"], citation_rows)
    write_csv(PROCESSED / "naklikay-pages.csv", ["url", "title", "intent", "source"], targets)

    organic_sorted = sorted(competitor_organic_rows, key=lambda item: (float(item["top_10"] or 0), float(item["visibility"] or 0), float(item["top_50"] or 0)), reverse=True)
    organic_markdown = "# Успешные органические страницы конкурентов\n\n"
    organic_markdown += "Источник: нормализованные выгрузки Keys.so, Яндекс, Москва, глубина топ-50. Это наблюдение, а не рекомендация к копированию материала.\n\n"
    organic_markdown += markdown_table(["Домен", "URL", "Топ-10", "Видимость", "Тип"], [[row["domain"], row["url"], row["top_10"], row["visibility"], row["content_type"]] for row in organic_sorted[:100]])
    (REPORTS / "organic-top-pages.md").write_text(organic_markdown, encoding="utf-8")

    naklikay_organic_sorted = sorted(naklikay_organic_rows, key=lambda item: (float(item["top_10"] or 0), float(item["visibility"] or 0), float(item["top_50"] or 0)), reverse=True)
    naklikay_organic_markdown = "# Органические страницы naklikay.ru\n\n"
    naklikay_organic_markdown += "Источник: отдельная выгрузка Keys.so, Яндекс, Москва, глубина топ-50. Страницы без запросов в топ-10 сохранены как исходные данные, но не являются кандидатами для конкурентного анализа.\n\n"
    naklikay_organic_markdown += markdown_table(["URL", "Топ-10", "Видимость", "Тип"], [[row["url"], row["top_10"], row["visibility"], row["content_type"]] for row in naklikay_organic_sorted])
    (REPORTS / "naklikay-organic-pages.md").write_text(naklikay_organic_markdown, encoding="utf-8")

    citations_by_url: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in citation_rows:
        citations_by_url[(row["cited_domain"], row["cited_url"])].append(row)
    citation_summary = []
    for (domain, url), rows in citations_by_url.items():
        citation_summary.append({
            "cited_domain": domain, "cited_url": url, "mentions": len(rows),
            "unique_queries": len({row["query"] for row in rows}),
            "first_response_date": min((row["response_date"] for row in rows if row["response_date"]), default=""),
            "last_response_date": max((row["response_date"] for row in rows if row["response_date"]), default=""),
        })
    citation_summary.sort(key=lambda item: (item["mentions"], item["unique_queries"]), reverse=True)
    write_csv(REPORTS / "alice-citation-register.csv", ["cited_domain", "cited_url", "mentions", "unique_queries", "first_response_date", "last_response_date"], citation_summary)

    own_citations = [row for row in citation_rows if row["observed_competitor"] in COMPETITORS and row["cited_domain"] == row["observed_competitor"]]
    own_by_url: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in own_citations:
        own_by_url[(row["cited_domain"], row["cited_url"])].append(row)
    own_summary = []
    for (domain, url), rows in own_by_url.items():
        own_summary.append({
            "competitor": domain, "cited_url": url, "mentions": len(rows),
            "unique_queries": len({row["query"] for row in rows}),
            "first_response_date": min((row["response_date"] for row in rows if row["response_date"]), default=""),
            "last_response_date": max((row["response_date"] for row in rows if row["response_date"]), default=""),
        })
    own_summary.sort(key=lambda item: (item["mentions"], item["unique_queries"]), reverse=True)
    write_csv(REPORTS / "alice-competitor-citation-register.csv", ["competitor", "cited_url", "mentions", "unique_queries", "first_response_date", "last_response_date"], own_summary)

    naklikay_citations = [row for row in citation_rows if row["observed_competitor"] == OWN_DOMAIN and row["cited_domain"] == OWN_DOMAIN]
    naklikay_by_url: dict[str, list[dict]] = defaultdict(list)
    for row in naklikay_citations:
        naklikay_by_url[row["cited_url"]].append(row)
    naklikay_summary = []
    for url, rows in naklikay_by_url.items():
        naklikay_summary.append({
            "cited_url": url, "mentions": len(rows), "unique_queries": len({row["query"] for row in rows}),
            "first_response_date": min((row["response_date"] for row in rows if row["response_date"]), default=""),
            "last_response_date": max((row["response_date"] for row in rows if row["response_date"]), default=""),
        })
    naklikay_summary.sort(key=lambda item: (item["mentions"], item["unique_queries"]), reverse=True)
    write_csv(REPORTS / "naklikay-ai-citation-register.csv", ["cited_url", "mentions", "unique_queries", "first_response_date", "last_response_date"], naklikay_summary)

    target_terms = {page["url"]: tokens(page["title"] + " " + page["intent"] + " " + page["url"].replace("-", " ")) for page in targets}
    generic_terms = {"яндекс", "директ", "реклама", "контекст"}
    queries: dict[str, list[dict]] = defaultdict(list)
    for row in own_citations:
        if tokens(row["query"]) & RELEVANT_TERMS:
            queries[row["query"]].append(row)
    opportunities = []
    for query, rows in queries.items():
        query_terms = tokens(query)
        matches = []
        for url, page_terms in target_terms.items():
            shared = query_terms & page_terms
            if len(shared) >= 2 and len(shared - generic_terms) >= 1:
                matches.append((len(shared), url))
        matches.sort(reverse=True)
        cited_urls = sorted({row["cited_url"] for row in rows})
        opportunities.append({
            "query": query, "topic": topic_label(query), "mentions": len(rows),
            "observed_competitors": len({row["observed_competitor"] for row in rows}),
            "competitor_urls": " | ".join(cited_urls[:5]),
            "matching_naklikay_urls": " | ".join(url for _, url in matches[:3]),
            "status": "existing-page-review" if matches else "intent-review-before-new-content",
        })
    opportunities.sort(key=lambda item: (item["status"] != "existing-page-review", -item["observed_competitors"], -item["mentions"], item["query"]))
    write_csv(REPORTS / "topic-opportunities.csv", ["query", "topic", "mentions", "observed_competitors", "competitor_urls", "matching_naklikay_urls", "status"], opportunities)

    alice_markdown = "# Исследование ИИ-ответов Алисы\n\n"
    alice_markdown += "Источник: отдельные выгрузки Keys.so об ИИ-ответах. Органические метрики сюда не включены. Наличие URL в ответе подтверждается только строкой с этим URL в исходном ответе или поле источников.\n\n"
    alice_markdown += f"Обработано записей: {len(ai_rows)}. Извлечено URL-упоминаний: {len(citation_rows)}. Уникальных URL: {len(citation_summary)}. URL исследуемых конкурентов: {len(own_summary)}.\n\n"
    alice_markdown += "## Страницы исследуемых конкурентов\n\n"
    alice_markdown += markdown_table(["Конкурент", "URL", "Упоминания", "Запросы"], [[item["competitor"], item["cited_url"], str(item["mentions"]), str(item["unique_queries"])] for item in own_summary[:100]])
    alice_markdown += "\n## Все URL из ответов\n\n"
    alice_markdown += "Этот раздел включает внешние источники, которые не обязательно принадлежат исследуемому конкуренту.\n\n"
    alice_markdown += markdown_table(["Домен", "URL", "Упоминания", "Запросы"], [[item["cited_domain"], item["cited_url"], str(item["mentions"]), str(item["unique_queries"])] for item in citation_summary[:100]])
    (REPORTS / "alice-analysis.md").write_text(alice_markdown, encoding="utf-8")

    coverage = {domain: {"organic": 0, "alice": 0} for domain in COMPETITORS}
    for row in competitor_organic_rows:
        coverage.setdefault(row["domain"], {"organic": 0, "alice": 0})["organic"] += 1
    for row in competitor_ai_rows:
        coverage.setdefault(row["domain"], {"organic": 0, "alice": 0})["alice"] += 1
    coverage_rows = [[domain, str(values["organic"]), str(values["alice"]), "yes" if values["organic"] or values["alice"] else "no"] for domain, values in sorted(coverage.items())]
    duplicate_count = sum(max(0, len(intake.get(row["content_sha256"], {}).get("original_names", [])) - 1) for row in source_rows)
    present = [domain for domain, values in coverage.items() if values["organic"] or values["alice"]]
    absent = [domain for domain in COMPETITORS if domain not in present]
    (REPORTS / "competitor-coverage.md").write_text("# Покрытие конкурентов\n\n" + markdown_table(["Конкурент", "Органических строк", "Строк ИИ", "Есть данные"], coverage_rows), encoding="utf-8")

    comparison = "# Сравнение naklikay.ru и конкурентов\n\n"
    comparison += markdown_table(["Показатель", "naklikay.ru", "Конкуренты"], [
        ["Страницы в органической выгрузке", str(len(naklikay_organic_rows)), str(len(competitor_organic_rows))],
        ["Страницы с запросами в топ-10", str(sum(1 for row in naklikay_organic_rows if float(row["top_10"] or 0) > 0)), str(sum(1 for row in competitor_organic_rows if float(row["top_10"] or 0) > 0))],
        ["Страницы с 5 и более запросами в топ-10", str(sum(1 for row in naklikay_organic_rows if float(row["top_10"] or 0) >= 5)), str(sum(1 for row in competitor_organic_rows if float(row["top_10"] or 0) >= 5))],
        ["Записи ИИ-ответов", str(len(naklikay_ai_rows)), str(len(competitor_ai_rows))],
        ["Подтвержденные URL в ИИ-ответах", str(len(naklikay_summary)), str(len(own_summary))],
    ])
    comparison += "\nСравнение показывает присутствие в предоставленных выгрузках, а не клики, позиции или качество всех страниц.\n"
    (REPORTS / "naklikay-comparison.md").write_text(comparison, encoding="utf-8")

    initial_report = "# Краткий отчет первого импорта\n\n"
    initial_report += f"Покрытие: {len(present)} из {len(COMPETITORS)} конкурентов. Уникальных источников: {len(source_rows)}. Повторных загрузок с тем же содержимым: {duplicate_count}.\n\n"
    initial_report += f"Органические страницы конкурентов: {len(competitor_organic_rows)}. Строки ИИ-ответов конкурентов: {len(competitor_ai_rows)}. Подтвержденные URL исследуемых конкурентов в ответах Алисы: {len(own_summary)}.\n\n"
    initial_report += "## Наблюдения\n\n"
    initial_report += markdown_table(["Источник", "Наблюдение"], [
        ["Органика", f"Лидирующая страница по топ-10: {organic_sorted[0]['url']} - {organic_sorted[0]['top_10']} запросов." if organic_sorted else "Данные отсутствуют."],
        ["Алиса", f"Самый частый URL исследуемого конкурента: {own_summary[0]['cited_url']} - {own_summary[0]['mentions']} упоминаний." if own_summary else "Подтвержденных URL конкурентов нет."],
        ["naklikay.ru", f"Для сопоставления доступно {len(targets)} URL из sitemap и карты интентов."],
    ])
    initial_report += "\nОграничение: выгрузки Keys.so не содержат кликов, показов и позиций naklikay.ru. Пункты бэклога остаются waiting-data до проверки актуальных данных Яндекс Вебмастера и интента страниц.\n"
    (REPORTS / "initial-report.md").write_text(initial_report, encoding="utf-8")

    backlog = "# SEO-бэклог по данным конкурентов\n\n"
    backlog += "Статус всех пунктов: waiting-data. Это аналитические задачи, не разрешение на публикацию или изменение страниц.\n\n"
    backlog_rows = []
    for item in opportunities:
        category = "A. Оптимизация существующей страницы" if item["matching_naklikay_urls"] else "B. Проверка новой темы"
        target = item["matching_naklikay_urls"] or item["query"]
        evidence = f"ИИ: {item['mentions']} упоминаний, {item['observed_competitors']} конкурентов. {item['competitor_urls']}"
        action = "Проверить интент, полноту и данные Вебмастера до SEO-ТЗ" if item["matching_naklikay_urls"] else "Проверить существующие страницы, спрос и каннибализацию до решения о публикации"
        backlog_rows.append(["A" if item["matching_naklikay_urls"] else "B", category, target, evidence, action, item["status"]])
    backlog += markdown_table(["Приоритет", "Категория", "URL или тема", "Подтверждение", "Действие", "Статус"], backlog_rows)
    (BASE / "seo-backlog.md").write_text(backlog, encoding="utf-8")

    progress = "# Ход исследования\n\n"
    progress += f"Дата обновления: {date.today()}\n\n"
    progress += f"Получено файлов: {len(source_rows)}. Дубликатов по SHA-256: {duplicate_count}. Нормализовано органических страниц конкурентов: {len(competitor_organic_rows)}. Записей ИИ-ответов конкурентов: {len(competitor_ai_rows)}.\n\n"
    progress += f"Отдельно для naklikay.ru: органических страниц {len(naklikay_organic_rows)}, записей ИИ-ответов {len(naklikay_ai_rows)}, подтвержденных URL в ИИ-ответах {len(naklikay_summary)}.\n\n"
    progress += "## Покрытие\n\n"
    progress += f"Представлено конкурентов: {len(present)} из {len(COMPETITORS)}.\n\n"
    progress += "Отсутствуют: " + (", ".join(absent) if absent else "нет") + ".\n\n"
    progress += "## Следующее действие\n\n"
    progress += "При новой выгрузке запустить импорт с путями к CSV или RAR. Система пересоберет нормализованные таблицы и отчеты из всех сохраненных исходников.\n"
    (BASE / "progress.md").write_text(progress, encoding="utf-8")

    print(json.dumps({"sources": len(source_rows), "duplicates": duplicate_count, "competitor_organic_pages": len(competitor_organic_rows), "competitor_ai_records": len(competitor_ai_rows), "naklikay_organic_pages": len(naklikay_organic_rows), "naklikay_ai_records": len(naklikay_ai_rows), "competitor_citation_urls": len(own_summary), "naklikay_citation_urls": len(naklikay_summary), "competitors_present": len(present)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
