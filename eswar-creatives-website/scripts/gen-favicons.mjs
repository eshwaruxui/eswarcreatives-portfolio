// One-off generator for favicon + OG assets (brand teal #0d9488).
// Run: node scripts/gen-favicons.mjs
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, '../public');

const TEAL = '#0d9488';

// Blocky, font-independent "E" mark on a rounded teal tile.
const mark = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${TEAL}"/>
  <g fill="#ffffff">
    <rect x="9"   y="8"    width="3.4" height="16"  rx="0.4"/>
    <rect x="9"   y="8"    width="14"  height="3.4" rx="0.4"/>
    <rect x="9"   y="14.3" width="11"  height="3.4" rx="0.4"/>
    <rect x="9"   y="20.6" width="14"  height="3.4" rx="0.4"/>
  </g>
</svg>`;

// Scalable favicon
writeFileSync(resolve(pub, 'favicon.svg'), mark(32).trim() + '\n');

// PNG renders
const png = (svg, px) => sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();

// Minimal ICO wrapping a single 32x32 PNG (PNG-in-ICO; supported by modern browsers).
function pngToIco(pngBuf, dim) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type: icon
  header.writeUInt16LE(1, 4);   // count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(dim % 256, 0);        // width (0 => 256)
  entry.writeUInt8(dim % 256, 1);        // height
  entry.writeUInt8(0, 2);                // palette
  entry.writeUInt8(0, 3);                // reserved
  entry.writeUInt16LE(1, 4);             // color planes
  entry.writeUInt16LE(32, 6);            // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8); // size
  entry.writeUInt32LE(6 + 16, 12);       // offset
  return Buffer.concat([header, entry, pngBuf]);
}

// OG image 1200x630 — light card with the mark + wordmark.
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#faf9f7"/>
  <rect x="0" y="0" width="1200" height="8" fill="${TEAL}"/>
  <g transform="translate(96,210) scale(5.0)">
    <rect width="32" height="32" rx="7" fill="${TEAL}"/>
    <g fill="#ffffff">
      <rect x="9" y="8" width="3.4" height="16" rx="0.4"/>
      <rect x="9" y="8" width="14" height="3.4" rx="0.4"/>
      <rect x="9" y="14.3" width="11" height="3.4" rx="0.4"/>
      <rect x="9" y="20.6" width="14" height="3.4" rx="0.4"/>
    </g>
  </g>
  <text x="300" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="600" fill="#181a19">Eswar Maheswaran</text>
  <text x="302" y="356" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#4b4f4e">Enterprise SaaS Design Systems Architect</text>
  <text x="302" y="406" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#0d9488">Web · iOS · Android  ·  HFI-CUA Certified</text>
</svg>`;

const [p32, apple, ogPng] = await Promise.all([
  png(mark(32), 32),
  png(mark(180), 180),
  sharp(Buffer.from(og)).png().toBuffer(),
]);

writeFileSync(resolve(pub, 'favicon.ico'), pngToIco(p32, 32));
writeFileSync(resolve(pub, 'apple-touch-icon.png'), apple);
writeFileSync(resolve(pub, 'og-image.png'), ogPng);

console.log('Generated: favicon.svg, favicon.ico, apple-touch-icon.png, og-image.png');
