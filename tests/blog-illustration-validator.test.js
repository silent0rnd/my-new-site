const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');
const { validateIllustration } = require('../scripts/validate-blog-illustration');

async function makeImage(filePath, width, height, background) {
  await sharp({ create: { width, height, channels: 3, background } }).jpeg().toFile(filePath);
}

test('принимает светлый JPG 2896 x 2172', async function acceptsLightImage(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-illustration-'));
  t.after(function cleanup() { return fs.rm(directory, { recursive: true, force: true }); });
  const filePath = path.join(directory, 'light.jpg');
  await makeImage(filePath, 2896, 2172, '#FAFAF8');

  const result = await validateIllustration(filePath);
  assert.deepEqual(result.errors, []);
});

test('отклоняет тёмный фон', async function rejectsDarkImage(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-illustration-'));
  t.after(function cleanup() { return fs.rm(directory, { recursive: true, force: true }); });
  const filePath = path.join(directory, 'dark.jpg');
  await makeImage(filePath, 2896, 2172, '#151515');

  const result = await validateIllustration(filePath);
  assert.match(result.errors.join(' '), /тёмная|светлым/);
});

test('отклоняет неверный размер и пропорции', async function rejectsWrongDimensions(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-illustration-'));
  t.after(function cleanup() { return fs.rm(directory, { recursive: true, force: true }); });
  const filePath = path.join(directory, 'square.jpg');
  await makeImage(filePath, 1024, 1024, '#FAFAF8');

  const result = await validateIllustration(filePath);
  assert.match(result.errors.join(' '), /размер/);
  assert.match(result.errors.join(' '), /4:3/);
});
