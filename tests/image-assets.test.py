from pathlib import Path
import re

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CASE_DATA = ROOT / "cases-data.js"
SITE_SCRIPT = ROOT / "script.js"
CASE_ASSETS = ROOT / "assets" / "cases"
REVIEW_ASSETS = ROOT / "images" / "reviews"

RETAINED_CASE_SOURCES = {
    "chef-live-streams-yandex-direct-1.jpg",
    "chef-live-streams-yandex-direct-3.jpg",
    "dental-prosthetics-moscow-yandex-direct-3.jpg",
    "dental-prosthetics-moscow-yandex-direct-4.jpg",
    "dental-prosthetics-moscow-yandex-direct-5.jpg",
    "dental-prosthetics-moscow-yandex-direct-6.jpg",
    "legal-consulting-yandex-direct-3.png",
    "vpn-telegram-ads-1.png",
}


def collect_case_sources(data: str) -> set[str]:
    direct_sources = set(
        re.findall(r"assets/cases/([A-Za-z0-9._-]+\.(?:png|jpe?g|webp))", data, flags=re.IGNORECASE)
    )
    call_pattern = re.compile(
        r'caseImages\(\s*"(?P<slug>[^"]+)"\s*,\s*(?P<count>\d+)\s*,\s*"(?P<extension>[^"]+)"\s*,\s*"[^"]*"(?:\s*,\s*\{(?P<overrides>[^}]*)\})?\s*\)',
        flags=re.DOTALL,
    )

    generated_sources = set()
    for match in call_pattern.finditer(data):
        overrides = {
            int(index): extension
            for index, extension in re.findall(r'(\d+)\s*:\s*"([^"]+)"', match.group("overrides") or "")
        }
        for index in range(1, int(match.group("count")) + 1):
            extension = overrides.get(index, match.group("extension"))
            generated_sources.add(f'{match.group("slug")}-{index}.{extension}')

    return direct_sources | generated_sources


def assert_decodes(path: Path, expected_format: str) -> None:
    with Image.open(path) as image:
        assert image.format == expected_format, f"unexpected format: {path}"
        assert image.width > 0 and image.height > 0, f"invalid image size: {path}"
        image.load()


def main() -> None:
    case_sources = collect_case_sources(CASE_DATA.read_text(encoding="utf-8"))
    case_files = {
        path.name
        for path in CASE_ASSETS.iterdir()
        if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    }

    assert len(case_sources) == 265, f"expected 265 case references, got {len(case_sources)}"
    assert case_files == case_sources, "case image files and case data references differ"
    assert {path.name for path in CASE_ASSETS.iterdir() if path.suffix.lower() != ".webp"} == RETAINED_CASE_SOURCES

    for name in sorted(case_sources):
        path = CASE_ASSETS / name
        expected_format = {
            ".webp": "WEBP",
            ".jpg": "JPEG",
            ".jpeg": "JPEG",
            ".png": "PNG",
        }[path.suffix.lower()]
        assert_decodes(path, expected_format)

    review_sources = set(re.findall(r"images/reviews/([A-Za-z0-9._-]+\.webp)", SITE_SCRIPT.read_text(encoding="utf-8")))
    review_files = {path.name for path in REVIEW_ASSETS.glob("*.webp")}
    assert len(review_sources) == 9, f"expected 9 review references, got {len(review_sources)}"
    assert review_files == review_sources, "review image files and script references differ"

    for name in sorted(review_sources):
        assert_decodes(REVIEW_ASSETS / name, "WEBP")

    print(f"image asset checks passed ({len(case_sources) + len(review_sources)} files)")


if __name__ == "__main__":
    main()
