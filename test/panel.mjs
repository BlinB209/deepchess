import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { panelHarness } from './harness.mjs';
const saveKey = 'deepchess.save.v1';
const settingsKey = 'deepchess.settings.v2';
const speech = (h) => h.nodes().find((n) => n.type?.name === 'Typewriter').props;
const board = (h) => h.nodes().find((n) => n.type?.name === 'Board').props;
const button = (h, text) => h.nodes().find((n) => n.type === 'button' && n.children.includes(text));
const gameSave = (h) => JSON.parse(h.store.get(saveKey));

test('click-to-complete never rolls back, handles Unicode, and calls onDone once', () => {
  const h = panelHarness();
  let completed = 0;
  h.mount('Typewriter', { text: 'DeepSeek🐳在呢。', onDone: () => completed++ });
  h.advance(90);
  h.tree.props.onClick(); h.flush();
  assert.equal(h.tree.children[0], 'DeepSeek🐳在呢。');
  h.advance(3000);
  h.tree.props.onClick(); h.flush();
  assert.equal(h.tree.children[0], 'DeepSeek🐳在呢。');
  assert.equal(completed, 1);
  h.unmount();
  assert.equal(h.clock.pending(), 0);
});

test('black startup respects settings; thinking keeps the speech visible and records the actual line', async () => {
  const h = panelHarness({ [settingsKey]: { playerColor: 'black', sound: false } });
  h.mount();
  assert.match(speech(h).text, /你执黑|你拿黑棋/);
  assert.equal(board(h).disabled, true);
  assert.ok(h.nodes().some((n) => n.props.className === 'dc-typing'));
  await h.advanceAsync(300);
  assert.equal(gameSave(h).ucis.length, 1);
  assert.equal(board(h).disabled, false);
  h.unmount();
  assert.equal(h.clock.pending(), 0);
});

test('thinking and her reply do not overwrite the player reaction mid-read', async () => {
  const h = panelHarness({ [settingsKey]: { sound: false, banter: 'chatty' } }, 0);
  h.mount();
  board(h).onSquare(0x14); h.flush(); // e2
  board(h).onSquare(0x34); h.flush(); // e4
  await h.advanceAsync(0);
  const line = speech(h).text;
  assert.notEqual(line, '……');
  assert.ok(h.nodes().some((n) => n.type?.name === 'Typewriter'));
  await h.advanceAsync(300);
  assert.equal(gameSave(h).ucis.length, 2);
  assert.equal(speech(h).text, line); // AI did not overwrite a line mid-read.
  await h.advanceAsync(6000);
  assert.notEqual(speech(h).text, line);
  h.unmount();
});

test('first capture shows the matching portrait and persists its one-time event', async () => {
  const h = panelHarness({ [settingsKey]: { sound: false, banter: 'chatty' },
    [saveKey]: { ucis: ['e2e4', 'd7d5'], playerColor: 'white' } }, 0);
  h.mount();
  board(h).onSquare(0x34); h.flush(); // e4
  board(h).onSquare(0x43); h.flush(); // d5
  await h.advanceAsync(0);
  assert.match(speech(h).text, /第一次吃子|第一个被吃/);
  const portrait = h.nodes().find((n) => n.props.className === 'dc-portrait');
  assert.equal(portrait.props.alt, '惊讶');
  assert.ok(gameSave(h).specials.includes('firstCapture'));
  await h.advanceAsync(300);
  assert.equal(portrait.props.alt, h.nodes().find((n) => n.props.className === 'dc-portrait').props.alt);
  h.unmount();
});

test('new game cancels queued reactions and logs the displayed opening', async () => {
  const h = panelHarness({ [settingsKey]: { sound: false, banter: 'chatty' } }, 0);
  h.mount();
  board(h).onSquare(0x14); h.flush(); board(h).onSquare(0x34); h.flush();
  await h.advanceAsync(300);
  button(h, 'btn.new').props.onClick(); h.flush();
  button(h, 'btn.restart').props.onClick(); h.flush();
  const opening = speech(h).text;
  assert.equal(gameSave(h).ucis.length, 0);
  await h.advanceAsync(10000);
  assert.equal(speech(h).text, opening);
  const logButton = h.nodes().find((n) => n.props['aria-label'] === 'chat.title');
  logButton.props.onClick(); h.flush();
  assert.equal(h.nodes().filter((n) => n.props.className === 'dc-log-item her').at(-1).children[0], opening);
  h.unmount();
});

test('resignation during draw deliberation cancels its late reply', () => {
  const h = panelHarness({ [settingsKey]: { sound: false } });
  h.mount(); h.advance(6000);
  button(h, 'btn.draw').props.onClick(); h.flush();
  button(h, 'btn.offerDraw').props.onClick(); h.flush();
  assert.equal(board(h).disabled, true);
  button(h, 'btn.resign').props.onClick(); h.flush();
  button(h, 'btn.resignNow').props.onClick(); h.flush();
  const farewell = speech(h).text;
  h.advance(10000);
  assert.equal(speech(h).text, farewell);
  assert.equal(gameSave(h).manual.state, 'resign');
  h.unmount();
  assert.equal(h.clock.pending(), 0);
});

test('confirm cards and game-over result expose next-game settings', () => {
  const h = panelHarness({ [settingsKey]: { sound: false } }, 0);
  h.mount();
  button(h, 'btn.new').props.onClick(); h.flush();
  const card = h.nodes().find((n) => String(n.props.className || '').includes('dc-confirm-card'));
  assert.ok(card);
  assert.ok(button(h, 'btn.restart'));
  button(h, 'btn.cancel').props.onClick(); h.flush();
  button(h, 'btn.resign').props.onClick(); h.flush();
  button(h, 'btn.resignNow').props.onClick(); h.flush();
  assert.ok(h.nodes().some((n) => n.props.className === 'dc-result-sheet'));
  assert.equal(h.nodes().filter((n) => n.props.className === 'dc-result-row').length, 3);
  assert.equal(h.nodes().filter((n) => String(n.props.className || '') === 'dc-result-diff').length, 1);
  assert.ok(button(h, 'btn.rematch'));
  assert.ok(button(h, 'btn.review'));
  h.unmount();
});

test('quiet mode avoids long-think and idle interruptions', () => {
  const h = panelHarness({ [settingsKey]: { sound: false, banter: 'quiet' } }, 0);
  h.mount(); const opening = speech(h).text;
  h.advance(120000);
  assert.equal(speech(h).text, opening);
  h.unmount();
});

test('incoming draw blocks board input and ambient speech until declined', async () => {
  const ucis = 'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8 h2h3 c6b8 d2d4'.split(' ');
  const h = panelHarness({ [settingsKey]: { sound: false }, [saveKey]: { ucis, playerColor: 'white' } }, 0);
  h.mount(); await h.advanceAsync(300);
  assert.ok(button(h, 'btn.acceptDraw'));
  assert.equal(board(h).disabled, true);
  const before = gameSave(h).ucis.length;
  for (let sq = 0; sq < 128; sq++) { board(h).onSquare(sq); h.flush(); }
  assert.equal(gameSave(h).ucis.length, before);
  await h.advanceAsync(10000); const line = speech(h).text;
  await h.advanceAsync(90000); assert.equal(speech(h).text, line);
  button(h, 'btn.declineDraw').props.onClick(); h.flush();
  assert.equal(board(h).disabled, false);
  h.unmount(); assert.equal(h.clock.pending(), 0);
});

test('checkmate removes an open resignation confirmation and records the outcome once', async () => {
  const h = panelHarness({ [settingsKey]: { sound: false }, [saveKey]: { ucis: ['f2f3', 'e7e5', 'g2g4'], playerColor: 'white' } });
  vm.runInContext('chooseMove = position => ({move:findMateInOne(position)})', h.ctx);
  h.mount(); button(h, 'btn.resign').props.onClick(); h.flush();
  assert.ok(button(h, 'btn.resignNow'));
  await h.advanceAsync(300);
  assert.equal(gameSave(h).manual.state, 'checkmate');
  assert.equal(button(h, 'btn.resignNow'), undefined);
  assert.equal(h.nodes().filter((n) => n.type?.name === 'Modal').length, 1);
  assert.equal(JSON.parse(h.store.get('deepchess.stats.v1')).losses, 1);
  h.unmount();
});

test('queued one-time reaction is consumed only when displayed, not when canceled by a move', async () => {
  for (const cancel of [true, false]) {
    const h = panelHarness({ [settingsKey]: { sound: false, banter: 'chatty' }, [saveKey]: { ucis: ['e2e4', 'd7d5', 'g1f3'], playerColor: 'white' } }, 0);
    vm.runInContext('chooseMove = position => ({move:position.generateLegal().find(m=>m.from===0x43 && m.to===0x34)})', h.ctx);
    h.mount(); await h.advanceAsync(300);
    assert.equal(gameSave(h).specials.includes('herFirstCapture'), false);
    if (cancel) { board(h).onSquare(0x25); h.flush(); board(h).onSquare(0x46); h.flush(); }
    await h.advanceAsync(6000);
    assert.equal(gameSave(h).specials.includes('herFirstCapture'), !cancel);
    h.unmount();
  }
});

test('failed or illegal worker replies expose retry without modifying the game', async () => {
  for (const expression of ["(() => { throw new Error('worker failed'); })()", '({move:{from:0,to:0,promotion:0}})']) {
    const h = panelHarness({ [settingsKey]: { playerColor: 'black', sound: false } });
    vm.runInContext(`chooseMove = () => ${expression}`, h.ctx);
    h.mount(); await h.advanceAsync(300);
    assert.ok(button(h, 'search.retry'));
    assert.equal(gameSave(h).ucis.length, 0);
    vm.runInContext('chooseMove = position => ({move:position.generateLegal()[0]})', h.ctx);
    button(h, 'search.retry').props.onClick(); h.flush();
    await h.advanceAsync(300);
    assert.equal(gameSave(h).ucis.length, 1);
    assert.equal(button(h, 'search.retry'), undefined);
    h.unmount(); assert.equal(h.clock.pending(), 0);
  }
});

test('new game, resignation and unmount cancel a running background search', async () => {
  for (const action of ['new', 'resign', 'unmount']) {
    const h = panelHarness({ [settingsKey]: { sound: false }, [saveKey]: { ucis: ['e2e4'], playerColor: 'white' } });
    vm.runInContext(`Worker = class {
      constructor() { globalThis.activeWorker = this; }
      postMessage(message) { this.message = message; }
      terminate() { this.terminated = true; }
    }`, h.ctx);
    h.mount(); await h.advanceAsync(300);
    const worker = h.ctx.activeWorker;
    assert.ok(worker?.message);
    if (action === 'unmount') h.unmount();
    else {
      button(h, action === 'new' ? 'btn.new' : 'btn.resign').props.onClick(); h.flush();
      button(h, action === 'new' ? 'btn.restart' : 'btn.resignNow').props.onClick(); h.flush();
    }
    assert.equal(worker.terminated, true);
    const snapshot = h.store.get(saveKey);
    worker.onmessage({ data: { id: worker.message.id, result: { move: { from: 0x64, to: 0x44 } } } });
    await h.advanceAsync(0);
    assert.equal(h.store.get(saveKey), snapshot);
    if (action !== 'unmount') h.unmount();
    assert.equal(h.clock.pending(), 0);
  }
});

test('difficulty change cancels the old search and uses only the new reply', async () => {
  const h = panelHarness({ [settingsKey]: { playerColor: 'black', sound: false } });
  vm.runInContext(`globalThis.workers = []; Worker = class {
    constructor() { workers.push(this); }
    postMessage(message) { this.message = message; }
    terminate() { this.terminated = true; }
  }`, h.ctx);
  h.mount(); await h.advanceAsync(300);
  const old = h.ctx.workers[0];
  button(h, 'diff.l8').props.onClick(); h.flush();
  assert.equal(old.terminated, true);
  await h.advanceAsync(300);
  const latest = h.ctx.workers[1];
  assert.equal(latest.message.difficulty, 'l8');
  old.onmessage({ data: { id: old.message.id, result: { move: { from: 0x13, to: 0x33 } } } });
  latest.onmessage({ data: { id: latest.message.id, result: { move: { from: 0x14, to: 0x34 } } } });
  await h.advanceAsync(0);
  assert.deepEqual(gameSave(h).ucis, ['e2e4']);
  h.unmount(); assert.equal(h.clock.pending(), 0);
});

test('promotion blocks other board input and plays the explicitly selected piece', async () => {
  const h = panelHarness({ [settingsKey]: { sound: false }, [saveKey]: {
    ucis: 'a2a4 h7h5 a4a5 h5h4 a5a6 h4h3 a6b7 h3g2'.split(' '), playerColor: 'white',
  } });
  h.mount();
  board(h).onSquare(0x61); h.flush(); board(h).onSquare(0x70); h.flush();
  assert.equal(board(h).disabled, true);
  board(h).onSquare(0x06); h.flush(); board(h).onSquare(0x25); h.flush();
  assert.equal(gameSave(h).ucis.length, 8);
  const promote = h.nodes().find((n) => n.type === 'button' && n.children.some((c) => c?.children?.includes('promo.r')));
  assert.ok(promote); promote.props.onClick(); h.flush();
  assert.equal(gameSave(h).ucis.at(-1), 'b7a8r');
  await h.advanceAsync(0);
  h.unmount(); assert.equal(h.clock.pending(), 0);
});
