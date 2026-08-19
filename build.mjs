// build.mjs — Assembles quote app dist + main site static files into root dist/
//
// Architecture: The quote React app is the PRIMARY deployment.
// Its dist/ becomes the root dist/. Main site pages are copied alongside as
// static files (showcase.html, design-ideas.html, etc.).

import fs from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist');

function copyRecursiveSync(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Step 1: Copy the entire grainedge-quote/dist → root dist/
// This makes the React SPA the primary index.html
const quoteDistDir = path.join(process.cwd(), 'grainedge-quote', 'dist');
if (fs.existsSync(quoteDistDir)) {
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  copyRecursiveSync(quoteDistDir, distDir);
  console.log('[build] Copied grainedge-quote/dist → dist/');
} else {
  console.error('[build] ERROR: grainedge-quote/dist does not exist. Did the Vite build fail?');
  process.exit(1);
}

// Step 2: Copy main site files as secondary static pages
// Rename index.html to showcase.html to avoid overwriting the React SPA's index.html
const mainSiteFiles = [
  { src: 'index.html', dest: 'showcase.html' },
  { src: 'design-ideas.html', dest: 'design-ideas.html' },
  { src: 'styles.css', dest: 'styles.css' },
];

for (const { src, dest } of mainSiteFiles) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, dest));
    console.log(`[build] Copied ${src} → dist/${dest}`);
  }
}

// Step 3: Copy images/ → dist/images/
const imgDir = path.join(process.cwd(), 'images');
const destImgDir = path.join(distDir, 'images');
if (fs.existsSync(imgDir)) {
  if (!fs.existsSync(destImgDir)) fs.mkdirSync(destImgDir, { recursive: true });
  for (const img of fs.readdirSync(imgDir)) {
    const srcPath = path.join(imgDir, img);
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, path.join(destImgDir, img));
    }
  }
  console.log('[build] Copied images/ → dist/images/');
}

console.log('[build] Build complete. Files assembled in dist/');
