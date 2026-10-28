const path = require('node:path');
const sharp = require('sharp');

const REQUIRED_WIDTH = 2896;
const REQUIRED_HEIGHT = 2172;
const SAMPLE_WIDTH = 400;
const SAMPLE_HEIGHT = 300;
const BORDER_SHARE = 0.1;

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function validateIllustration(filePath) {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const errors = [];

  if (metadata.format !== 'jpeg') {
    errors.push('формат должен быть JPG');
  }

  if (metadata.width !== REQUIRED_WIDTH || metadata.height !== REQUIRED_HEIGHT) {
    errors.push(`размер должен быть ${REQUIRED_WIDTH} x ${REQUIRED_HEIGHT} px`);
  }

  if (!metadata.width || !metadata.height || metadata.width * 3 !== metadata.height * 4) {
    errors.push('пропорции должны быть строго 4:3');
  }

  const { data, info } = await image
    .clone()
    .flatten({ background: '#FAFAF8' })
    .resize(SAMPLE_WIDTH, SAMPLE_HEIGHT, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const borderX = Math.round(info.width * BORDER_SHARE);
  const borderY = Math.round(info.height * BORDER_SHARE);
  let totalLuminance = 0;
  let totalDark = 0;
  let borderLuminance = 0;
  let borderLight = 0;
  let borderDark = 0;
  let borderPixels = 0;
  const totalPixels = info.width * info.height;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const value = luminance(data[offset], data[offset + 1], data[offset + 2]);
      totalLuminance += value;
      if (value < 80) totalDark += 1;

      const isBorder = x < borderX || x >= info.width - borderX || y < borderY || y >= info.height - borderY;
      if (isBorder) {
        borderPixels += 1;
        borderLuminance += value;
        if (value >= 185) borderLight += 1;
        if (value < 80) borderDark += 1;
      }
    }
  }

  const averageLuminance = totalLuminance / totalPixels;
  const darkShare = totalDark / totalPixels;
  const averageBorderLuminance = borderLuminance / borderPixels;
  const lightBorderShare = borderLight / borderPixels;
  const darkBorderShare = borderDark / borderPixels;

  if (averageLuminance < 150 || darkShare > 0.35) {
    errors.push('общая сцена слишком тёмная');
  }

  if (averageBorderLuminance < 200 || lightBorderShare < 0.7 || darkBorderShare > 0.12) {
    errors.push('фон не является преимущественно светлым');
  }

  return {
    filePath,
    errors,
    metrics: {
      averageLuminance: Math.round(averageLuminance),
      darkShare: Number(darkShare.toFixed(3)),
      averageBorderLuminance: Math.round(averageBorderLuminance),
      lightBorderShare: Number(lightBorderShare.toFixed(3)),
      darkBorderShare: Number(darkBorderShare.toFixed(3)),
    },
  };
}

async function main(args) {
  if (args.length === 0) {
    throw new Error('Укажите хотя бы один путь к JPG');
  }

  let failed = false;
  for (const filePath of args) {
    const result = await validateIllustration(path.resolve(filePath));
    if (result.errors.length > 0) {
      failed = true;
      console.error(`Брак: ${filePath} - ${result.errors.join('; ')}`);
    } else {
      console.log(`Готово: ${filePath} - 2896 x 2172, 4:3, светлый фон`);
    }
  }

  if (failed) process.exitCode = 1;
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(function handleError(error) {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { validateIllustration };
