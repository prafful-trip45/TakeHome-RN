#!/usr/bin/env node
/**
 * Derives ALL app icon variations (task 5) from the single spec source
 * (assets/swag-logo-1024.png — white SWAG wordmark on black rounded square):
 *
 *  icon.png                     iOS app icon — 1024², flattened onto #000, NO alpha
 *  android-icon-background.png  adaptive icon background — solid #000
 *  android-icon-foreground.png  adaptive icon foreground — logo at 75% on transparent
 *                               (wordmark ~41% of canvas → inside the 61% OS safe zone)
 *  android-icon-monochrome.png  Android 13+ themed icon — white silhouette, safe-zone padded
 *  notification-icon.png        Android notification icon — 96², white-on-transparent
 *  favicon.png                  web/admin favicon — 48², flattened
 *
 * Run: npm run icons:gen  (re-run any time the source logo changes)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const assets = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const SRC = path.join(assets, 'swag-logo-1024.png');
const SIZE = 1024;
const out = (name) => path.join(assets, name);

/** White-on-transparent silhouette: luminance of the flattened logo becomes the
 *  alpha of a pure-white canvas (white wordmark -> opaque, black square -> transparent). */
async function whiteSilhouette() {
  const { data, info } = await sharp(SRC)
    .flatten({ background: '#000000' })
    .toColourspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp({
    create: { width: info.width, height: info.height, channels: 3, background: '#ffffff' },
  })
    .joinChannel(data, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png();
}

/** Center `image` at `scale` of a transparent SIZE² canvas (safe-zone padding). */
async function padOnTransparent(pngBuffer, scale) {
  const inner = Math.round(SIZE * scale);
  const margin = Math.round((SIZE - inner) / 2);
  const resized = await sharp(pngBuffer).resize(inner, inner).png().toBuffer();
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left: margin, top: margin }])
    .png();
}

async function main() {
  // iOS app icon — no transparency allowed.
  await sharp(SRC).flatten({ background: '#000000' }).removeAlpha().png().toFile(out('icon.png'));

  // Adaptive icon: solid black background layer + safe-zone-padded foreground.
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: '#000000' },
  })
    .png()
    .toFile(out('android-icon-background.png'));

  const srcBuffer = await sharp(SRC).png().toBuffer();
  await (await padOnTransparent(srcBuffer, 0.75)).toFile(out('android-icon-foreground.png'));

  // Monochrome (themed icon) — white silhouette, same safe-zone padding.
  const silhouette = await (await whiteSilhouette()).toBuffer();
  await (await padOnTransparent(silhouette, 0.75)).toFile(out('android-icon-monochrome.png'));

  // Notification icon — white-on-transparent, trimmed to the wordmark, 96².
  await sharp(await sharp(silhouette).trim().toBuffer())
    .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out('notification-icon.png'));

  // Favicon.
  await sharp(SRC).flatten({ background: '#000000' }).resize(48, 48).png().toFile(out('favicon.png'));

  console.log('icons generated from', SRC);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
