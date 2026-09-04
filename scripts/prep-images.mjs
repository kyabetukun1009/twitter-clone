// Downscale curated user art into wired filenames (run locally on demand).
// Usage: node scripts/prep-images.mjs
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');
const SRC = 'C:\\xampp\\htdocs\\yajuter-art-src';
const JOBS = [
  ['custom-face-smile-07.png', 'avatar.png', 512, 512],
  ['custom-logo-emblem-19.png', 'logo.png', 512, 512],
  ['custom-banner-gold-18.png', 'cover.png', 1600, 500],
  ['custom-empty-feed-37.png', 'empty-posts.png', 800, null],
  ['custom-empty-media-38.png', 'empty-media.png', 800, null],
  ['custom-notification-gold-39.png', 'notices.png', 400, 400],
  ['custom-post-night-window-27.png', 'header-quotes.png', 1200, 400],
  ['custom-post-stadium-26.png', 'header-anniv.png', 1200, 400],
  ['custom-post-concert-25.png', 'header-pilgrimage.png', 1200, 400],
  ['custom-funny-trophy-33.png', 'header-stats.png', 1200, 400],
  ['custom-reaction-proud-22.png', 'header-badges.png', 1200, 400]
];

for (const [src, dest, w, h] of JOBS) {
  const from = join(SRC, src);
  const to = join(DIR, dest);
  let pipe = sharp(from).resize(w, h, { fit: 'cover' });
  await pipe.png({ quality: 85 }).toFile(to);
  const meta = await sharp(to).metadata();
  console.log(`OK ${dest}: ${meta.width}x${meta.height}`);
}
