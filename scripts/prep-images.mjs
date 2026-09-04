// Downscale curated user art into wired filenames (run locally on demand).
// Usage: node scripts/prep-images.mjs
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');
const JOBS = [
  ['custom-face-smile-07.png', 'avatar.png', 512, 512],
  ['custom-logo-emblem-19.png', 'logo.png', 512, 512],
  ['custom-banner-gold-18.png', 'cover.png', 1600, 500],
  ['custom-empty-feed-37.png', 'empty-posts.png', 800, null],
  ['custom-empty-media-38.png', 'empty-media.png', 800, null]
];

for (const [src, dest, w, h] of JOBS) {
  const from = join(DIR, src);
  const to = join(DIR, dest);
  let pipe = sharp(from).resize(w, h, { fit: 'cover' });
  await pipe.png({ quality: 85 }).toFile(to);
  const meta = await sharp(to).metadata();
  console.log(`OK ${dest}: ${meta.width}x${meta.height}`);
}
