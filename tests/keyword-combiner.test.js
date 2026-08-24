const test = require("node:test");
const assert = require("node:assert");
const { combineLists, transformPhrase } = require("../tools/kombinator-klyuchevyh-fraz/keyword-combiner.js");
test("перемножает непустые списки в исходном порядке", () => assert.deepStrictEqual(combineLists(["купить\nзаказать", "диван", "Москва\nСПб"]), ["купить диван Москва", "купить диван СПб", "заказать диван Москва", "заказать диван СПб"]));
test("добавляет операторы после очистки фразы", () => assert.strictEqual(transformPhrase("купить-диван!", { hyphens: true, clean: true, exact: true, brackets: true, quotes: true }), '"[!купить !диван]"'));
