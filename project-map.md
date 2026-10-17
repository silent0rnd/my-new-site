# Карта проекта Naklikay

Справочник путей для навигации. Использовать только нужный раздел; актуальное содержимое файлов проекта имеет приоритет.

## Главная и общие файлы
- `index.html` — главная страница.
- `styles.css` — общие стили главной, блога, кейсов и ряда служебных страниц.
- `script.js` — общая клиентская логика: меню, карточки, анимации, оглавления и прокрутка.
- `cases-data.js` — данные кейсов, используемые главной и архивом.
- `assets/` — общие изображения и шрифты; `images/reviews/`, `images/signature/` — отзывы и подпись.

## Блог
- `blog/index.html` — архив статей и источник карточек.
- `blog/<slug>/index.html` — HTML конкретной статьи.
- `blog/page/<номер>/index.html` — сгенерированная пагинация.
- `blog/` — обложки и иллюстрации (исходные JPG/PNG и адаптивные WebP).
- `scripts/generate-blog-archive.js` — генератор архива, пагинации, оглавлений, похожих статей и связанных записей в `sitemap.xml`.
- `scripts/blog-related-topics.json` — тематики для подбора похожих статей.
- `scripts/optimize-blog-images.js` — адаптивные WebP для иллюстраций `.article-figure` выбранной статьи.

Команды по необходимости: `npm.cmd run build:blog`, `npm.cmd run optimize:blog-images -- --article <slug>`, `npm.cmd run test:related-articles`, `npm.cmd run test:blog-toc`, `npm.cmd run test:blog-images`.

## Кейсы
- `cases-data.js` — основной источник данных.
- `scripts/generate-cases.js` — генерация архива и страниц.
- `cases/index.html` — архив; `cases/<slug>/index.html` — страницы кейсов.
- `case-page.js` — логика страницы кейса; `assets/cases/` — изображения.

Команды: `npm.cmd run build:cases`, `npm.cmd run test:cases`.

## Инструменты
- `tools/index.html` — каталог.
- `tools/<slug>/index.html` и `tools/<slug>/*.js` — интерфейс и логика инструмента.
- `tools/<slug>/vendor/` — локальные библиотеки; `data/` — справочники.
- Инструменты преимущественно изолированы. Проверяй общие `styles.css` и `script.js` только если конкретная страница их использует.

## SEO, служебные файлы и проверки
- `sitemap.xml`, `robots.txt`, `.htaccess`, `llms.txt` — индексирование и маршрутизация.
- `cookie-policy/`, `personal-data-consent/` — юридические страницы.
- `docs/` — редакционные, SEO- и графические правила.
- `package.json` — доступные команды; `tests/` — точечные проверки.
