import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Banter, MOODS, chooseMood, moveContext } from '../src/persona.js';

test('small pools rotate before repeating; rendered lines share one history', () => {
  const banter = new Banter('zh', () => 0.5);
  const ctx = { capturedKey: 'p', pieceKey: 'n', move: 'Nxd5' };
  const lines = Array.from({ length: 12 }, () => banter.pick('playerCapture', ctx, 'pout'));
  assert.equal(new Set(lines.slice(0, 7)).size, 7);
  lines.forEach((line, i) => { if (i) assert.notEqual(line, lines[i - 1]); });
  assert.ok(lines.every((line) => !/[{}]/.test(line)));
  assert.ok(banter.recent.includes(lines.at(-1)));
});

test('discarded or delayed dialogue does not enter spoken history', () => {
  const banter = new Banter('zh', () => 0);
  const line = banter.pick('herQuiet', { move: 'e5' }, 'smile', false);
  assert.deepEqual(banter.recent, []);
  banter.remember(line, 'herQuiet');
  assert.deepEqual(banter.recent, [line]);
});

test('both colors get the right start and promotion context', () => {
  for (const locale of ['zh', 'en']) {
    const banter = new Banter(locale, () => 0);
    const start = banter.pick('start', { playerColor: 'black' });
    assert.match(start, locale === 'zh' ? /你执黑|你拿黑棋/ : /black|play white/);
    const ctx = moveContext({ piece: 9, promotion: 4 }, 'a1=R', 22, { byPlayer: false });
    assert.equal(ctx.promotionKey, 'r');
    assert.equal(ctx.n, 11);
    const line = banter.pick('promotion', ctx);
    assert.match(line, locale === 'zh' ? /我的兵.*车|我.*车/ : /My pawn.*rook/);
    assert.doesNotMatch(line, /马|knight/);
  }
});

test('special moves and every event stay in the selected language', () => {
  const events = ['start', 'resume', 'playerQuiet', 'herQuiet', 'playerCapture', 'herCapture', 'playerCheck', 'herCheck', 'playerBlunder', 'herBlunder', 'playerGood', 'herGood', 'herThink', 'playerThinkLong', 'idle', 'lowMaterial', 'longGame', 'undo', 'resign', 'win', 'lose', 'draw', 'rematch', 'promotion', 'castle', 'enPassant', 'queenCapture', 'herQueenCapture', 'drawOffer', 'drawRefuse', 'poke', 'firstCapture', 'herFirstCapture', 'firstCheck', 'herFirstCheck', 'queenTrade', 'underpromotion', 'herUnderpromotion', 'comeback', 'herComeback', 'blunderStreak', 'longGameSpecial', 'lowMaterialSpecial', 'threefold', 'fiftyMove', 'checkmateWin', 'checkmateLose', 'callback', 'difficulty', 'opening'];
  for (const locale of ['zh', 'en']) {
    const banter = new Banter(locale);
    for (const event of events) for (const mood of MOODS) for (const byPlayer of [true, false]) {
      const line = banter.pick(event, { move: 'Nxd5', pieceKey: 'n', capturedKey: 'p', promotionKey: 'b', undos: 2, blunders: 3, byPlayer, difficulty: 'master', opening: locale === 'en' ? 'Italian Game' : '意大利开局', verdict: locale === 'en' ? 'a good move' : '好棋' }, mood);
      assert.ok(line.length > 0, event);
      assert.doesNotMatch(line, /undefined|\{|\}/, event);
      if (locale === 'en') assert.doesNotMatch(line, /[\u4e00-\u9fff]/, event);
      assert.doesNotMatch(line, /你烦不烦|你怕了|笨蛋|负样本|你能不能快点/, event);
    }
  }
});

test('queen capture, castling and en passant distinguish the mover', () => {
  const banter = new Banter('zh', () => 0);
  assert.match(banter.pick('queenCapture'), /我的后|后没了/);
  assert.match(banter.pick('herQueenCapture'), /你的后|吃到后/);
  assert.match(banter.pick('castle', { byPlayer: false }), /我易位|王和车/);
  assert.match(banter.pick('enPassant', { byPlayer: false }), /我收下|我走/);
});

test('moods use her perspective, are contextual, and avoid consecutive repeats', () => {
  for (const playerColor of ['white', 'black']) {
    const herLead = playerColor === 'white' ? -500 : 500;
    assert.ok(['smile', 'smug', 'wink'].includes(chooseMood({ playerColor, evalWhite: herLead, event: 'herQuiet' })));
    assert.ok(['thinking', 'determined'].includes(chooseMood({ playerColor, evalWhite: -herLead, event: 'herQuiet' })));
    assert.ok(['sad', 'cry', 'pout'].includes(chooseMood({ playerColor, status: { state: 'checkmate', winner: playerColor } })));
    assert.ok(['smug', 'laugh', 'wink'].includes(chooseMood({ playerColor, status: { state: 'resign', winner: playerColor === 'white' ? 'black' : 'white' } })));
  }
  assert.equal(chooseMood({ event: 'playerCheck', recentMoods: ['surprised', 'panic', 'determined'] }, () => 0), 'surprised');
  assert.notEqual(chooseMood({ event: 'playerCheck', recentMoods: ['panic', 'determined', 'surprised'] }, () => 0), 'surprised');
  for (let i = 0; i < 100; i++) {
    assert.ok(!['sleepy', 'tired'].includes(chooseMood({ event: 'playerQuiet', moveCount: 1 })));
  }
});

test('analysis lines name the opening and react to good and bad moves', () => {
  const banter = new Banter('zh', () => 0);
  assert.match(banter.pick('opening', { opening: '意大利开局' }, 'thinking'), /意大利开局/);
  assert.match(banter.pick('playerGood', {}, 'panic'), /慌|怕|心跳/);
  assert.match(banter.pick('playerBlunder', { move: 'Nf3', verdict: '臭棋' }, 'laugh'), /臭|礼物|走神/);
  assert.match(banter.pick('herBlunder', {}, 'sad'), /臭棋|怎么会/);
  assert.match(banter.pick('herGood', {}, 'smug'), /好棋|算到/);
});
