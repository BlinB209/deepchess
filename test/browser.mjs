/** Real browser checks. Supply PLAYWRIGHT_MODULE if Playwright is not local.
 * Optional first argument points at an extracted npm package's client.js. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const bundle = readFileSync(process.argv[2] || new URL('../client.js', import.meta.url), 'utf8');
// Expose private components only in the test copy, retaining the shipped worker.
const testBundle = bundle.replace("return { inject: ['slots', 'locale', 'sidebarRightTabs'], apply: applyDeepChess };",
  'globalThis.testing = { SearchClient, Modal, ChessGame, processVersion: BUILD_VERSION }; return {};');
assert.notEqual(testBundle, bundle);
const server = createServer((req, res) => {
  res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src ${req.url === '/blocked' ? "'none'" : "'self' blob:"}`);
  if (req.url === '/client.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(testBundle); }
  else res.end('<!doctype html><meta charset="utf-8"><title>DeepChess browser regression</title><main id="panel"><button id="opener">Open</button><button id="background">Board</button><div id="pre-inert" inert></div></main>');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge', headless: true } : { headless: true });
  const page = await browser.newPage();
  const load = async (route = '/') => {
    await page.goto(url + route);
    await page.evaluate(() => {
      globalThis.effects = []; globalThis.cleanups = [];
      const React = {
        useRef: (current) => ({ current }),
        useEffect: (fn) => effects.push(fn),
        createElement(type, props, ...children) {
          const node = document.createElement(type);
          for (const [key, value] of Object.entries(props || {})) {
            if (key === 'ref') value.current = node;
            else if (key === 'tabIndex') node.tabIndex = value;
            else if (key === 'className') node.className = value;
            else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
            else if (key !== 'style') node.setAttribute(key, value);
          }
          node.append(...children.flat()); return node;
        },
      };
      window.__ModuleLoader__ = { load({ factory }) { factory((name) => { if (name === 'react') return React; throw new Error(name); }); } };
    });
    await page.addScriptTag({ url: url + '/client.js' });
  };
  await load();
  await page.evaluate(() => {
    document.querySelector('#opener').focus();
    const first = document.createElement('button'); first.id = 'first'; first.textContent = 'Cancel';
    const last = document.createElement('button'); last.id = 'last'; last.textContent = 'Accept';
    window.modal = testing.Modal({ label: 'Draw offer', onClose: () => { window.dialogClosed = true; }, children: [first, last] });
    document.querySelector('#panel').append(modal);
    effects.splice(0).forEach((fn) => cleanups.push(fn()));
  });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'first');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'last');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'first');
  assert.equal(await page.evaluate(() => { document.querySelector('#background').focus(); return document.activeElement.id; }), 'first');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.dialogClosed), true);
  await page.evaluate(() => { modal.remove(); cleanups.splice(0).forEach((fn) => fn()); });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'opener');
  assert.deepEqual(await page.evaluate(() => ['opener', 'background', 'pre-inert'].map((id) => document.getElementById(id).inert)), [false, false, true]);
  console.log('ok browser modal: initial focus, Tab cycle, inert board, Escape and focus restore');

  const search = await page.evaluate(async () => {
    const client = new testing.SearchClient();
    const game = new testing.ChessGame();
    let ticks = 0;
    const heartbeat = setInterval(() => ticks++, 10);
    const started = performance.now();
    try {
      const pick = await client.request('choose', { fen: game.fen(), ucis: [], difficulty: 'l8' });
      return { ticks, ms: Math.round(performance.now() - started), depth: pick.depth,
        legal: Boolean(game.playUci(pick.move.from, pick.move.to, pick.move.promotion)), loss: pick.loss };
    } finally { clearInterval(heartbeat); client.cancel(); }
  });
  assert.ok(search.legal && Number.isFinite(search.loss));
  assert.ok(search.ticks >= 3, JSON.stringify(search));
  console.log('ok browser L8 worker and main-thread heartbeat:', search);

  const lifecycle = await page.evaluate(async () => {
    const client = new testing.SearchClient(); const game = new testing.ChessGame();
    const pending = client.request('choose', { fen: game.fen(), ucis: [], difficulty: 'l8' }).then(() => 'unexpected', (e) => e.name);
    await new Promise((resolve) => setTimeout(resolve, 50));
    client.cancel(); const cancelled = await pending;
    const pick = await client.request('choose', { fen: game.fen(), ucis: [], difficulty: 'l1' });
    client.cancel();
    return { cancelled, legal: Boolean(game.playUci(pick.move.from, pick.move.to, pick.move.promotion)), pending: client.pending.size };
  });
  assert.deepEqual(lifecycle, { cancelled: 'AbortError', legal: true, pending: 0 });
  console.log('ok browser worker: cancellation and new connection');

  await load('/blocked');
  const blocked = await page.evaluate(async () => {
    const client = new testing.SearchClient();
    try { await client.request('choose', { fen: new testing.ChessGame().fen(), ucis: [], difficulty: 'l1' }); return false; }
    catch { return client.pending.size === 0 && client.connection === null; }
    finally { client.cancel(); }
  });
  assert.equal(blocked, true);
  console.log('ok browser CSP: blocked worker reports failure and cleans pending work');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
