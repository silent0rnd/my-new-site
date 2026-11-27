# Инструкция по генерации и экспорту иллюстраций

## Режим
Работай с иллюстрациями **после SEO-анализа и подробных IMAGE-SPECS, но до написания полного текста**. В одном пользовательском ходе создавай только **одну** картинку и делай только один вызов генератора. После генерации остановись. Исключение: пользователь явно просит технический экспорт уже готового изображения без нового рисунка.

## До вызова генератора
1. Определи номер из команды пользователя и журнала IMAGE-STATUS. Слова «делай первую/вторую/третью» относятся к IMAGE-SPEC-1/2/3. Если команда «дальше», бери первый ещё не готовый номер. Не пропускай номера.
2. Прочитай **только текущий IMAGE-SPEC-N** и дизайн-систему. Закончи фразы «Читатель должен увидеть...» и «Без статьи читатель должен понять...». Составь карту самостоятельной инструкции: входные данные, действие или механизм, проверка или ограничение, видимый результат. Для каждого крупного элемента запиши функцию и короткую подпись, объясняющую эту функцию, а не только название предмета. Сформулируй внутреннюю проверку: главная мысль; главная учебная задача; тип информации и соответствующая композиция; основная смысловая структура; минимум 7 содержательных компонентов; 3 функциональные группы; 3 уровня изучения; выразительные смысловые передний, средний и задний планы; физическая связь; функция каждого экрана, документа, графика и календаря; итог; точные подписи/цифры; ракурс 4:3.
3. Выбери композицию по главной учебной задаче. Порядок, хронология и причинно-следственная цепочка всегда требуют последовательного процесса, даже если в сюжете много связанных объектов. Сравнение двух вариантов по одинаковым критериям требует двух параллельных областей. Система взаимосвязей используется только для устройства и связей без обязательного порядка. При смешанных признаках ориентируйся на заголовок, учебный вывод и действие читателя. F-паттерн не используй как универсальное правило.
4. До подготовки запроса запиши внутреннее обоснование: «Выбран тип ..., потому что читатель должен увидеть ...». Если обоснование не совпадает с траекторией просмотра, измени композицию.
5. Передай генератору единое конкретное визуальное ТЗ: сюжет текущей картинки плюс правила дизайн-системы. Не добавляй статью, остальные IMAGE-SPEC, историю неудачных попыток, сюжеты других картинок (даже как отрицания) или абстрактные советы «сделай красиво».
6. Референс использовать только если он утверждён для этой иллюстрации и помогает соблюсти стиль; перенимать качество, но не чужой сюжет.
7. Для всех статей и кейсов сохранять единый визуальный язык: спокойная редакционная настольная диорама из матовой бумаги, картона, дерева, керамики, ткани и пробки. Меняется сюжет, но не художественная подача.

8. Не начинай генерацию, если нельзя составить короткую легенду по самой картинке: какой элемент принимает данные, что с ними происходит, что проверяется, какое ограничение учитывается и какой результат получается. Наличие сложных предметов, красивых планов и подписей без этой легенды не считается достаточным.

## STYLE LOCK для текущего запроса
~~~text
Create exactly ONE complete premium editorial tabletop diorama, horizontal 4:3.
The image must look like a carefully art-directed photograph of a tactile physical model,
not like a glossy advertising render, a corporate slide or a full-size studio installation.
Warm light greige background #F3F3F1, graphite typography #2B2B2B,
restrained orange accent #FF9800 covering no more than 5-10% of the frame.
Use pale muted pastel blue #B8C3C6 for large information and metric plaques,
with a slightly darker soft edge around #AAB6BA. Keep this blue calm, light,
low-saturation and never bright or dark. Do not use pinkish-yellow, peach,
salmon, pale orange or apricot fills for metric plaques. Keep #FF9800 only for
small accents, markers, active actions and key connections, not as a large
metric plaque fill.
Use uncoated paper, cardboard, matte light wood, ceramic, linen, cork,
matte painted metal and small natural plants. All objects belong to one tabletop set.
Use soft diffused daylight, calm contact shadows, low contrast and moderate depth of field.
No glass gloss, chrome, mirror surfaces, neon, glowing rails, luminous halos,
dramatic lighting, oversaturated colors or large orange color fields.
One clear primary structure appropriate to the information: a left-to-right
numbered sequence for a process, two parallel equally weighted areas for a
comparison, or one central hub with connected elements for a relationship system.
Choose by the main teaching task, not by the number of connected objects.
Chronology and cause-and-effect always require a process composition, even when
many objects are connected. Use a hub only when no required order exists.
Never impose an F-pattern by default. Use it only when a text-rich mixed scene
naturally requires it. Include at least seven meaningful components in total,
and at least three distinct functional groups in one coherent spatial scene.
Build three levels of discovery: immediate main idea, secondary processes,
and small functional details that reward close study.
The image must work as a self-contained visual instruction without the article.
Show the input data, the action or mechanism, the check or constraint, and the
visible outcome as one coherent scene. Every major element must have a readable
label or an unambiguous visible action that explains its function, not only its
name. The foreground, middle ground and background must all contribute useful
instructional information as well as atmosphere.
Show connections as real physical parts of the set: textile cords, matte cables,
paper or wooden paths, shared bases, mechanical bands or repeated materials.
Rich, precise, readable Russian labels printed on physical cards, paper labels,
mechanical counters or matte device screens integrated into the scene.
Keep the scene visually rich, complex and multi-layered. Use many meaningful
objects and physical details. No microtext, tiny explanatory lists, footnotes
or labels that require zooming. Every meaningful line must be comfortably
readable at normal preview size. If text does not fit, enlarge its physical
panel, shorten the wording or replace the explanation with clear visual
objects. Never simplify the scene merely to reduce text.
Every screen, report, document, calendar, chart, folder and panel must have
a clear thematic function. No blank calendars, empty reports, meaningless
charts, repeated filler documents or decorative interface placeholders.
Small details must sort, connect, measure, compare, filter, verify, transfer
or display information. Decorative objects do not count toward complexity.
No flat corporate slide, no rows of identical UI cards, no decorative icon-only
scheme, no pseudotext, no invented facts or logos, no dark background.
Do not change the medium between images. Even buildings, interfaces, transport,
shops and industrial scenes must remain convincing tactile tabletop models.
Keep real brand colors and functional red, green or blue only as local accents.
Use ONLY this current IMAGE-SPEC-N's plot, facts and required numbers.
You may add short neutral functional labels, mechanisms and objects when they
clarify the plot without inventing metrics, prices, promises or results.
[CURRENT IMAGE-SPEC-N]
~~~
Указанный английский STYLE LOCK - ориентир для содержания генеративного запроса, не пользовательский видимый текст. Конкретный сюжет важнее общей фразы о стиле.

## Контроль после генерации
- Сначала проверь идентичность сюжета текущему номеру и корректность всех смысловых чисел.
- Затем проверь дизайн: тактильная настольная диорама, матовые натуральные материалы, выраженная глубина, подходящий тип композиции, минимум 7 содержательных компонентов, минимум 3 функциональные группы, 3 уровня изучения, физическая связь, итог, читаемый точный текст и светлый тёплый фон.
- Отдельно проверь траекторию просмотра: процесс читается слева направо, сравнение построено в двух параллельных областях, система раскрывается от центра к связанным элементам. Отклони механически применённый F-паттерн, если он не соответствует типу информации.
- Сверь результат с фразой «Читатель должен увидеть...». Если причинно-следственная история ошибочно превращена в систему взаимосвязей, результат отклоняется.
- Отдельно проверь функциональную плотность: нет пустых отчётов, календарей, документов, графиков, панелей и повторяющихся декоративных элементов. Каждый заметный предмет выполняет понятную роль в сюжете.
- Проверь самостоятельность инструкции без статьи: можно ли по одной картинке определить входные данные, действие или механизм, проверку или ограничение и результат. Если нет, результат отклоняется.
- Составь короткую легенду «элемент, его действие, его роль в результате» для всех крупных элементов. Если для элемента получается только название без функции, он не прошёл проверку.
- Проверь три плана отдельно: передний план показывает детали действия или проверки, средний план объясняет главную механику, задний план формирует тематический контекст и дополнительные связи. Каждый план должен быть выразительным и содержательно полезным.
- Проверь, что подписи отвечают на вопросы читателя и не только называют предметы. Основной смысл не должен зависеть от figcaption, текста статьи, микротекста или догадок.
- Отдельно проверь спокойствие подачи: оранжевый занимает не более 5-10% кадра, нет глянца, неона, ярких ореолов, стеклянных панелей, хрома, агрессивного контраста и чрезмерной насыщенности.
- Проверь всю картинку в обычном размере превью без увеличения. Каждая смысловая надпись должна читаться сразу. Если строка выглядит как микротекст, сливается или требует приближения, результат считается браком. При исправлении сохраняй сложность композиции и количество смысловых объектов. Изменяй размер панели, текст или способ визуальной передачи смысла.
- Затем проверь форму 4:3 и отсутствие обрезанных надписей/деталей.
- Если работа подходит, покажи её с подписью Картинка N из K и зафиксируй IMAGE-STATUS: готово: [номера]; следующий: [номер/нет].
- Если работа **не подходит**, не выдавай за готовую и не обещай PNG. Кратко скажи, какое требование нарушено; **не делай несколько новых генераций подряд в том же ходе**. Повтор только по явному «переделай №N».
- Если пользователь отклонил саму визуальную идею или попросил полностью переделать изображение, перед повторной генерацией обязательно изменить тип композиции, центральную предметную метафору, расположение объектов и ракурс. Сохранить только тему, факты, числа и обязательные надписи. Перестановка элементов прежней сцены не считается новой концепцией.
- Не делай программную плоскую инфографику вместо заказанного 3D-рендера. Не «спасай» брак обрезкой, полями, рамкой, пересборкой отдельных частей или вставкой фрагментов.

## Порядок и номера
IMAGE-SPEC-N навсегда соответствует картинке NN-tema.jpg и зафиксированному месту вставки. После утверждения №1 следующая команда «дальше» создаёт №2; после №2 - №3 и т.д. Для N=4-6 порядок аналогичный. Переделка меняет только явно указанный номер; остальные утверждённые картинки не затрагивать.

## Экспорт и сборка
- Для каждой статьи и кейса нужен мастер PNG с пропорциями 4:3, без искажения, обрезки или искусственной подмены композиции. Предпочтительный размер - 2896 x 2172 px. Если генератор не позволяет получить этот размер, допустим исходник 1448 x 1086 px.
- Фактический размер результата генератора проверять до экспорта. Принимать 2896 x 2172 px или, если такой размер недоступен, 1448 x 1086 px. Результат меньшего размера или с другими пропорциями отклонять. Запрещено увеличивать исходник 1448 x 1086 px до 2896 x 2172 px и выдавать его за нативный мастер.
- WebP 640 x 480, 1080 x 810 и 1720 x 1290 создавать из утверждённого PNG 2896 x 2172 px или допустимого PNG 1448 x 1086 px. Для исходника 1448 x 1086 px разрешено качественное пропорциональное увеличение только версии WebP 1720 x 1290 px; обрезка и изменение пропорций запрещены. Исходник подключать как fallback в `<img>`, WebP подключать через `srcset` в `<picture>`.
- Не сохранять дополнительные форматы в финальном ZIP. Не создавать несколько вариантов и не включать черновики.
- Имена: 01-tema.jpg, 02-tema.jpg и т.д. Темы и архив - латиницей в нижнем регистре, слова через дефис.
- При «дай архив»: взять последнюю согласованную статью, N утверждённых PNG, подготовить TXT/MD и точное ТЗ для внедрения (место, имя, Alt); объединить одним ZIP, проверить открытие и дать ссылку сразу.
- На сборке не исправлять и не регенерировать утверждённые изображения.
