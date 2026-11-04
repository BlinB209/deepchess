import assert from 'node:assert/strict';
import { test } from 'node:test';
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

test('black startup respects settings; thinking keeps the speech visible and records the actual line', () => {
  const h = panelHarness({ [settingsKey]: { playerColor: 'black', sound: false } });
  h.mount();
  assert.match(speech(h).text, /你执黑|你拿黑棋/);
  assert.equal(board(h).disabled, true);
  assert.ok(h.nodes().some((n) => n.props.className === 'dc-typing'));
  h.advance(300);
  assert.equal(gameSave(h).ucis.length, 1);
  assert.equal(board(h).disabled, false);
  h.unmount();
  assert.equal(h.clock.pending(), 0);
});

test('thinking and her reply do not overwrite the player reaction mid-read', () => {
  const h = panelHarness({ [settingsKey]: { sound: false, banter: 'chatty' } }, 0);
  h.mount();
  board(h).onSquare(0x14); h.flush(); // e2
  board(h).onSquare(0x34); h.flush(); // e4
  const line = speech(h).text;
  assert.notEqual(line, '……');
  assert.ok(h.nodes().some((n) => n.type?.name === 'Typewriter'));
  h.advance(300);
  assert.equal(gameSave(h).ucis.length, 2);
  assert.equal(speech(h).text, line); // AI did not overwrite a line mid-read.
  h.advance(6000);
  assert.notEqual(speech(h).text, line);
  h.unmount();
});

test('first capture shows the matching portrait and persists its one-time event', () => {
  const h = panelHarness({ [settingsKey]: { sound: false, banter: 'chatty' },
    [saveKey]: { ucis: ['e2e4', 'd7d5'], playerColor: 'white' } }, 0);
  h.mount();
  board(h).onSquare(0x34); h.flush(); // e4
  board(h).onSquare(0x43); h.flush(); // d5
  assert.match(speech(h).text, /第一次吃子|第一个被吃/);
  const portrait = h.nodes().find((n) => n.props.className === 'dc-portrait');
  assert.equal(portrait.props.alt, '惊讶');
  assert.ok(gameSave(h).specials.includes('firstCapture'));
  h.advance(300);
  assert.equal(portrait.props.alt, h.nodes().find((n) => n.props.className === 'dc-portrait').props.alt);
  h.unmount();
});

test('new game cancels queued reactions and logs the displayed opening', () => {
  const h = panelHarness({ [settingsKey]: { sound: false, banter: 'chatty' } }, 0);
  h.mount();
  board(h).onSquare(0x14); h.flush(); board(h).onSquare(0x34); h.flush();
  h.advance(300);
  button(h, 'btn.new').props.onClick(); h.flush();
  button(h, 'btn.confirm').props.onClick(); h.flush();
  const opening = speech(h).text;
  assert.equal(gameSave(h).ucis.length, 0);
  h.advance(10000);
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
  button(h, 'btn.confirm').props.onClick(); h.flush();
  const farewell = speech(h).text;
  h.advance(10000);
  assert.equal(speech(h).text, farewell);
  assert.equal(gameSave(h).manual.state, 'resign');
  h.unmount();
  assert.equal(h.clock.pending(), 0);
});

test('quiet mode avoids long-think and idle interruptions', () => {
  const h = panelHarness({ [settingsKey]: { sound: false, banter: 'quiet' } }, 0);
  h.mount(); const opening = speech(h).text;
  h.advance(120000);
  assert.equal(speech(h).text, opening);
  h.unmount();
});
