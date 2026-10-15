# Промт для пакетной оптимизации готовых статей

Проверь и оптимизируй иллюстрации только в статьях из списка ниже. Эти статьи уже отредактированы и визуально утверждены. Не переписывай тексты, не перерисовывай изображения и не меняй структуру страниц.

## Разрешённый список

- https://naklikay.ru/blog/kak-izmenit-obekt-prodvizheniya-v-yandex-direkte/
- https://naklikay.ru/blog/prodvizhenie-gruzoperevozok-2026/
- https://naklikay.ru/blog/yandex-direct-slivaet-byudzhet/
- https://naklikay.ru/blog/bfl-bankrotstvo-fizicheskih-lits/
- https://naklikay.ru/blog/necelevye-lidy-yandex-direct/
- https://naklikay.ru/blog/prodvizhenie-kadrovogo-agentstva/
- https://naklikay.ru/blog/yandex-direct-dlya-stomatologii/
- https://naklikay.ru/blog/prodvizhenie-ustanovki-kondicionerov/
- https://naklikay.ru/blog/kontekstnaya-reklama-pod-klyuch/
- https://naklikay.ru/blog/prodvizhenie-agentstva-nedvizhimosti/
- https://naklikay.ru/blog/prodvizhenie-brenda-obuvi/
- https://naklikay.ru/blog/prodvizhenie-novostroek-v-2026-godu/
- https://naklikay.ru/blog/prodvizhenie-bureniya-skvazhin/
- https://naklikay.ru/blog/prodvizhenie-avtosalona-2026/
- https://naklikay.ru/blog/yandex-direct-dlya-agentstva-nedvizhimosti/
- https://naklikay.ru/blog/reklama-v-yandex-kartah/
- https://naklikay.ru/blog/offline-conversions-yandex-direct/
- https://naklikay.ru/blog/kombinatornye-obyavleniya-yandex-direct/
- https://naklikay.ru/blog/kak-proverit-tsel-v-yandex-metrike/
- https://naklikay.ru/blog/kak-dat-dostup-k-yandex-metrike/
- https://naklikay.ru/blog/prodvizhenie-fitnes-kluba/
- https://naklikay.ru/blog/seo-ili-kontekstnaya-reklama/
- https://naklikay.ru/blog/nastroyka-direkta-dlya-internet-magazina/
- https://naklikay.ru/blog/yandex-direct-dlya-internet-magazina/
- https://naklikay.ru/blog/reklama-stomatologii/
- https://naklikay.ru/blog/prodvizhenie-b2b-kompanii/
- https://naklikay.ru/blog/reklama-proizvodstvennoy-kompanii/
- https://naklikay.ru/blog/tseli-yandex-metriki-tilda/
- https://naklikay.ru/blog/konversiya-lida-v-prodazhu/
- https://naklikay.ru/blog/zakazat-kontekstnuyu-reklamu/
- https://naklikay.ru/blog/stoimost-kontekstnoy-reklamy/
- https://naklikay.ru/blog/direktolog-ili-agentstvo/
- https://naklikay.ru/blog/kak-vybrat-direktologa/
- https://naklikay.ru/blog/prodvizhenie-remonta-kvartir-v-2026-godu/
- https://naklikay.ru/blog/kontekstnaya-reklama-dlya-proizvodstva/
- https://naklikay.ru/blog/prodvizhenie-event-agentstva-yandex-direct/
- https://naklikay.ru/blog/prodvizhenie-otelya-bazy-otdyha/
- https://naklikay.ru/blog/prodvizhenie-plastikovyh-okon/
- https://naklikay.ru/blog/kreativy-yandex-direct/
- https://naklikay.ru/blog/yandex-direct-dlya-zastroyshchika/
- https://naklikay.ru/blog/celi-dlya-marquiza-v-yandex-metrike/
- https://naklikay.ru/blog/reklama-septikov/
- https://naklikay.ru/blog/obuchenie-strategii-yandex-direct/
- https://naklikay.ru/blog/prodvizhenie-metalloprokata-metalloobrabotki/
- https://naklikay.ru/blog/yandex-direct-stroitelstvo-domov/
- https://naklikay.ru/blog/prodvizhenie-ustanovki-lestnic-2026/
- https://naklikay.ru/blog/reklama-salona-krasoty-kosmetologii-yandex-direct/
- https://naklikay.ru/blog/pochemu-net-pokazov-v-yandex-direct/
- https://naklikay.ru/blog/reklama-psihologicheskogo-centra/
- https://naklikay.ru/blog/yandex-direct-dlya-yuridicheskih-uslug/
- https://naklikay.ru/blog/reklama-promyshlennogo-oborudovaniya/
- https://naklikay.ru/blog/kakaya-reklama-samaya-effektivnaya/
- https://naklikay.ru/blog/predstavitel-v-yandex-direct/
- https://naklikay.ru/blog/master-otchetov-yandex-direct/
- https://naklikay.ru/blog/prodvizhenie-detskih-centrov-kruzhkov-sekcij/

## Порядок работы

1. До изменений проверь наличие локального `blog/<slug>/index.html` для каждого URL. Если файл отсутствует, не создавай статью и не подменяй её похожей страницей - пропусти URL и укажи это в отчёте.
2. Работай только с изображениями внутри `<figure class="article-figure">`. Не обрабатывай аватар автора, логотипы, карточки похожих статей и служебную графику.
3. Сохрани исходные JPG и PNG без изменений и удаления.
4. Для каждой существующей статьи запусти `npm.cmd run optimize:blog-images -- --article <slug>`.
5. Для каждой иллюстрации создай WebP-версии шириной 640, 1080 и 1720 px с качеством 92. Не увеличивай изображение выше размера исходника.
6. В HTML используй `<picture>` с WebP `srcset` и `sizes="(max-width: 720px) calc(100vw - 36px), 860px"`. Исходный файл оставь резервным `src` в `<img>`.
7. Сохрани исходный `alt`. Установи правильные `width` и `height`, `loading="lazy"` и `decoding="async"`.
8. Не меняй тексты, заголовки, ссылки, метаданные, даты, JSON-LD, оглавление, стили, дизайн и другие статьи.
9. Проверь, что браузер выбирает один подходящий файл из `srcset`, а не загружает все версии одновременно.
10. Проверь существование, размеры и пропорции всех созданных файлов. Визуально сравни самую детальную иллюстрацию с оригиналом на ширине 860 и 390 px.
11. Повторный запуск не должен дублировать `<picture>` и не должен создавать новые изменения.
12. Выполни `npm.cmd run test:blog-images` и `git diff --check`. Не запускай массовую обработку остальных статей блога.

## Итоговый отчёт

Укажи:

- количество URL в списке;
- количество найденных и пропущенных статей;
- список пропущенных URL с причиной;
- количество обработанных иллюстраций;
- количество созданных WebP-файлов;
- результаты проверок;
- подтверждение, что исходники не удалялись и статьи вне списка не изменялись.
