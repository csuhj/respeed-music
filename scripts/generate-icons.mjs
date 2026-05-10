/**
 * Generates all PWA icon sizes and favicon.ico from public/favicon.svg.
 * Run with: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public', 'favicon.svg'));
const iconsDir = join(root, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const iconSizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const faviconSizes = [16, 32, 48];

console.log('Generating PWA icons...');
await Promise.all(
  iconSizes.map(async size => {
    const dest = join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(dest);
    console.log(`  icon-${size}x${size}.png`);
  })
);

console.log('Generating favicon.ico...');
const faviconPngs = await Promise.all(
  faviconSizes.map(size => sharp(svg).resize(size, size).png().toBuffer())
);
writeFileSync(join(root, 'public', 'favicon.ico'), buildIco(faviconPngs, faviconSizes));
console.log('  favicon.ico (16, 32, 48 px)');

console.log('Done.');

function buildIco(bufs, sizes) {
  const count = bufs.length;
  const dataStart = 6 + 16 * count;
  const total = dataStart + bufs.reduce((s, b) => s + b.length, 0);
  const out = Buffer.alloc(total);

  out.writeUInt16LE(0, 0);      // reserved
  out.writeUInt16LE(1, 2);      // type = ICO
  out.writeUInt16LE(count, 4);  // image count

  let offset = dataStart;
  for (let i = 0; i < count; i++) {
    const d = 6 + i * 16;
    const sz = sizes[i];
    out.writeUInt8(sz >= 256 ? 0 : sz, d);
    out.writeUInt8(sz >= 256 ? 0 : sz, d + 1);
    out.writeUInt8(0, d + 2);
    out.writeUInt8(0, d + 3);
    out.writeUInt16LE(1, d + 4);
    out.writeUInt16LE(32, d + 6);
    out.writeUInt32LE(bufs[i].length, d + 8);
    out.writeUInt32LE(offset, d + 12);
    offset += bufs[i].length;
  }

  let pos = dataStart;
  for (const buf of bufs) { buf.copy(out, pos); pos += buf.length; }
  return out;
}
