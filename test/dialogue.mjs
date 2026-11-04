import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChessGame, parseUci } from '../src/engine.js';
import { SpeechDirector, acceptsDraw, classifyDialogueMove, describeQuality, detectOpening, estimateMoveLoss, selectSpecial, shouldOfferDraw } from '../src/dialogue.js';
import { fakeClock } from './harness.mjs';

function play(game, uci) {
  const m = parseUci(uci);
  const result = game.playUci(m.from, m.to, m.promotion);
  assert.ok(result, uci);
  return result;
}

test('ordinary replies wait for reading; ambient and repeated pokes cannot interrupt', () => {
  const clock = fakeClock();
  const said = [];
  const director = new SpeechDirector((line) => said.push(line), clock);
  director.speak({ event: 'playerCheck', text: '呀，将军了。让我找找应对。', mood: 'panic', priority: 2 });
  director.speak({ event: 'herQuiet', text: '我走好啦。轮到你。', mood: 'smile', priority: 1 });
  assert.equal(director.speak({ event: 'idle', text: 'hello', mood: 'calm', priority: 0 }), false);
  assert.equal(director.speak({ event: 'poke', text: 'hey', mood: 'love', priority: 2 }), false);
  assert.equal(said.length, 1);
  clock.advance(6000);
  assert.deepEqual(said.map((line) => line.mood), ['panic', 'smile']);
  director.speak({ event: 'poke', text: 'hi', mood: 'love', priority: 2 });
  assert.equal(director.speak({ event: 'poke', text: 'again', mood: 'pout', priority: 2 }), false);
  assert.equal(said.length, 3);
  director.reset();
  assert.equal(clock.pending(), 0);
});

test('results interrupt and discard queued lines; a new board action drops stale reactions', () => {
  const clock = fakeClock(), said = [];
  const director = new SpeechDirector((line) => said.push(line.event), clock);
  director.speak({ event: 'playerQuiet', text: 'Let me think about your move.', priority: 1 });
  director.speak({ event: 'herCheck', text: 'Check!', priority: 2 });
  director.speak({ event: 'checkmateLose', text: 'You won!', priority: 3 });
  clock.advance(10000);
  assert.deepEqual(said, ['playerQuiet', 'checkmateLose']);
  director.speak({ event: 'herQuiet', text: 'A move.', priority: 1 });
  director.speak({ event: 'herCheck', text: 'Old check.', priority: 2 });
  director.beginTurn();
  clock.advance(10000);
  assert.equal(said.at(-1), 'herQuiet');
});

test('ambient cooldown spans ambient event types', () => {
  const clock = fakeClock(), said = [];
  const director = new SpeechDirector((line) => said.push(line), clock);
  assert.equal(director.speak({ event: 'playerThinkLong', text: 'Take your time.', priority: 0 }), true);
  clock.advance(5000);
  assert.equal(director.speak({ event: 'idle', text: 'Still here.', priority: 0 }), false);
  clock.advance(7000);
  assert.equal(director.speak({ event: 'idle', text: 'Still here.', priority: 0 }), true);
});

test('long synchronous search preserves time to finish reading the current line', () => {
  const clock = fakeClock(), said = [];
  const director = new SpeechDirector((line) => said.push(line.event), clock);
  director.speak({ event: 'playerCheck', text: 'Check. Let me think.', priority: 2 });
  clock.advance(280);
  clock.elapse(5000); // Browser timers cannot run while a synchronous search runs.
  director.deferFor(5000);
  director.speak({ event: 'herQuiet', text: 'I moved.', priority: 1 });
  assert.deepEqual(said, ['playerCheck']);
  clock.advance(3000);
  assert.deepEqual(said, ['playerCheck', 'herQuiet']);
});

test('draw acceptance allows equal positions and still resists winning positions', () => {
  for (const color of ['white', 'black']) {
    const playerLead = color === 'white' ? 500 : -500;
    assert.equal(acceptsDraw(playerLead, color, () => 0), true);
    assert.equal(acceptsDraw(playerLead, color, () => 0.9), false);
    assert.equal(acceptsDraw(-playerLead, color, () => 0.9), false);
    assert.equal(acceptsDraw(0, color, () => 0), true);
    assert.equal(acceptsDraw(0, color, () => 0.9), false);
  }
});

test('she can offer a draw in a long, close game but not early or when clearly winning', () => {
  const position = new ChessGame().position;
  assert.equal(shouldOfferDraw(position, 0, 'white', 30, () => 0), true);
  assert.equal(shouldOfferDraw(position, 0, 'white', 30, () => 0.99), false);
  assert.equal(shouldOfferDraw(position, 0, 'white', 10, () => 0), false);
  assert.equal(shouldOfferDraw(position, 900, 'white', 30, () => 0), false);
});

test('first check has priority over first capture, and her first check has its own event', () => {
  const g = new ChessGame('4k3/8/8/8/8/8/4p3/4R1K1 w - - 0 1');
  const r = play(g, 'e1e2');
  assert.match(r.san, /\+/);
  assert.equal(selectSpecial(g, g.lastMove.move, r.san, 0, 0, 'white', {}, new Set()), 'firstCheck');
  assert.equal(selectSpecial(g, g.lastMove.move, r.san, 0, 0, 'black', {}, new Set()), 'herFirstCheck');
  assert.equal(selectSpecial(g, g.lastMove.move, r.san, 0, 0, 'white', {}, new Set(['firstCheck'])), null);
});

test('event classification distinguishes queens and respects check and promotion priority', () => {
  const queen = { captured: 5, flags: 1 };
  assert.equal(classifyDialogueMove(queen, 'Rxd1', 0, false), 'herQueenCapture');
  assert.equal(classifyDialogueMove(queen, 'Rxd1+', 0, false), 'herCheck');
  assert.equal(classifyDialogueMove({ promotion: 3 }, 'a8=B', 0, true), 'promotion');
  assert.equal(classifyDialogueMove({ captured: 1, flags: 1 }, 'Nxd5', 300, true), 'playerBlunder');
  assert.equal(classifyDialogueMove({ captured: 4, flags: 1 }, 'Bxa8', 0, true, 500), 'playerGood');
});

test('move assessment notices a hanging queen, allows a safe capture, and preserves the game', () => {
  const bad = new ChessGame('6k1/8/3p4/8/8/8/8/Q5K1 w - - 0 1');
  play(bad, 'a1e5');
  const fen = bad.fen();
  assert.ok(estimateMoveLoss(bad.lastMove.before, bad.lastMove.move) > 700);
  assert.equal(bad.fen(), fen);
  const good = new ChessGame('6k1/8/3p4/8/4r3/8/8/4Q1K1 w - - 0 1');
  play(good, 'e1e4');
  assert.ok(estimateMoveLoss(good.lastMove.before, good.lastMove.move) < 180);
});

test('opening detection picks the most specific known line', () => {
  const line = (sans) => sans.map((san) => ({ san }));
  assert.equal(detectOpening(line(['e4', 'c5'])).key, 'sicilian');
  assert.equal(detectOpening(line(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])).key, 'italian');
  assert.equal(detectOpening(line(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])).key, 'ruyLopez');
  assert.equal(detectOpening(line(['d4', 'd5', 'c4'])).key, 'queensGambit');
  assert.equal(detectOpening(line(['e4', 'e5'])).generic, true);
  assert.equal(detectOpening(line(['a3'])), null);
});

test('quality grading separates blunders, mistakes and good moves', () => {
  assert.equal(describeQuality(700, 0, 'zh'), '大臭棋');
  assert.equal(describeQuality(300, 0, 'zh'), '臭棋');
  assert.equal(describeQuality(190, 0, 'zh'), '小失误');
  assert.equal(describeQuality(0, 700, 'zh'), '妙棋');
  assert.equal(describeQuality(0, 300, 'zh'), '好棋');
  assert.equal(describeQuality(0, 0, 'zh'), '');
  assert.equal(describeQuality(300, 0, 'en'), 'a bad move');
});
