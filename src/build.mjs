// Build client.js: concatenate the plain-JS modules, embed portraits, pieces
// and the pixel font as data URLs, and wrap them in the Harness module-loader
// factory. Run with `node src/build.mjs`.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const assetRoot = join(root, 'assets');

function strip(source) {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/^export\s+/gm, '');
}

function dataUrl(file, mime) {
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

function portraitAssets() {
  const dir = join(assetRoot, 'portraits');
  const out = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.png')) continue;
    out[name.slice(0, -4)] = dataUrl(join(dir, name), 'image/png');
  }
  return out;
}

function pieceAssets() {
  const dir = join(assetRoot, 'pieces');
  const out = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.png')) continue;
    out[name.slice(0, -4)] = dataUrl(join(dir, name), 'image/png');
  }
  return out;
}

const fontPath = join(assetRoot, 'font', 'ark-pixel-12px.woff2');
if (!existsSync(fontPath)) {
  console.error('missing font:', fontPath);
  process.exit(1);
}

const modules = ['engine.js', 'ai.js', 'persona.js', 'i18n.js', 'styles.js', 'panel.js', 'apply.js'];
const body = modules.map((name) => strip(readFileSync(join(here, name), 'utf8'))).join('\n\n');

const assets = {
  font: dataUrl(fontPath, 'font/woff2'),
  portraits: portraitAssets(),
  pieces: pieceAssets(),
};

const bundle = `/* DeepChess client bundle — built from src/, do not edit directly. */
window.__ModuleLoader__.load({
  id: 'deepchess',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const ASSETS = ${JSON.stringify(assets)};

${body}

    return { inject: ['slots', 'locale', 'sidebarRightTabs'], apply: applyDeepChess };
  },
});
`;

writeFileSync(join(root, 'client.js'), bundle);
console.log('wrote client.js', (bundle.length / 1024).toFixed(1) + ' KiB');
console.log('portraits:', Object.keys(assets.portraits).length, 'pieces:', Object.keys(assets.pieces).length);
