const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');
const { validateIllustration } = require('../scripts/validate-blog-illustration');

async function makeImage(filePath, width, height, background) {
  await sharp({ create: { width, height, channels: 3, background } }).png().toFile(filePath);
}

test('принимает светлый PNG 2896 x 2172', async function acceptsLightImage(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-illustration-'));
  t.after(function cleanup() { return fs.rm(directory, { recursive: true, force: true }); });
  const filePath = path.join(directory, 'light.png');
  await makeImage(filePath, 2896, 2172, '#FAFAF8');

  const result = await validateIllustration(filePath);
  assert.deepEqual(result.errors, []);
});

test('отклоняет тёмный фон', async function rejectsDarkImage(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-illustration-'));
  t.after(function cleanup() { return fs.rm(directory, { recursive: true, force: true }); });
  const filePath = path.join(directory, 'dark.png');
  await makeImage(filePath, 2896, 2172, '#151515');

  const result = await validateIllustration(filePath);
  assert.match(result.errors.join(' '), /тёмная|светлым/);
});

test('отклоняет неверный размер и пропорции', async function rejectsWrongDimensions(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-illustration-'));
  t.after(function cleanup() { return fs.rm(directory, { recursive: true, force: true }); });
  const filePath = path.join(directory, 'square.png');
  await makeImage(filePath, 1024, 1024, '#FAFAF8');

  const result = await validateIllustration(filePath);
  assert.match(result.errors.join(' '), /размер/);
  assert.match(result.errors.join(' '), /4:3/);
});

test('отклоняет прежний размер даже при точных пропорциях 4:3', async function rejectsOldSize() {
  const input = await sharp({ create: { width: 2096, height: 1572, channels: 3, background: '#F3F3F1' } }).png().toBuffer();
  const result = await validateIllustration(input);
  assert.deepEqual(result.errors, ['размер должен быть 2896 x 2172 px']);
});

test('проверяет реальный формат полноразмерного исходника', async function rejectsWebpSource() {
  const input = await sharp({ create: { width: 2896, height: 2172, channels: 3, background: '#F3F3F1' } }).webp().toBuffer();
  const result = await validateIllustration(input);
  assert.deepEqual(result.errors, ['формат должен быть PNG']);
});
