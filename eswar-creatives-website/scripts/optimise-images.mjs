import sharp from 'sharp';
import { readdir, mkdir, stat } from 'fs/promises';
import { join, extname, basename, relative } from 'path';

const ASSETS_ROOT = 'public/assets';
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function findArtifactDirs(root) {
  const dirs = [];
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = join(root, entry.name);
    if (entry.name === 'artifacts') {
      dirs.push(full);
    } else {
      dirs.push(...await findArtifactDirs(full));
    }
  }
  return dirs;
}

const artifactDirs = await findArtifactDirs(ASSETS_ROOT);

if (artifactDirs.length === 0) {
  console.log('No artifacts/ directories found under', ASSETS_ROOT);
  process.exit(0);
}

let total = 0;

for (const artifactDir of artifactDirs) {
  const projectDir = join(artifactDir, '..');
  const previewDir = join(projectDir, 'preview');
  const fullDir    = join(projectDir, 'full');

  await mkdir(previewDir, { recursive: true });
  await mkdir(fullDir,    { recursive: true });

  const files = await readdir(artifactDir);
  const images = files.filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()));

  if (images.length === 0) continue;

  console.log(`\n📁 ${relative('.', artifactDir)} — ${images.length} image(s)`);

  for (const file of images) {
    const name  = basename(file, extname(file));
    const input = join(artifactDir, file);
    const { size: originalSize } = await stat(input);

    const previewPath = join(previewDir, name + '.webp');
    const fullPath    = join(fullDir,    name + '.webp');

    const { size: previewSize } = await sharp(input)
      .resize(800, null, { withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(previewPath)
      .then(() => stat(previewPath));

    const { size: fullSize } = await sharp(input)
      .resize(2400, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(fullPath)
      .then(() => stat(fullPath));

    const kb  = n => (n / 1024).toFixed(1) + ' KB';
    const pct = (a, b) => Math.round((1 - a / b) * 100) + '% smaller';
    console.log(`  ✓ ${name}`);
    console.log(`    original ${kb(originalSize)}  →  preview ${kb(previewSize)} (${pct(previewSize, originalSize)})  |  full ${kb(fullSize)} (${pct(fullSize, originalSize)})`);
    total++;
  }
}

console.log(`\nDone. ${total} image(s) optimised.`);
