import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ChessGame, Position, parseUci } from '../src/engine.js';
import { LEVELS, chooseMove } from '../src/ai.js';
import { detectOpening, isClosedPosition } from '../src/dialogue.js';
import { Banter, MOODS } from '../src/persona.js';
import { SearchClient } from '../src/search-client.js';
import { processSearchRequest } from '../src/search-worker.js';

test('repetition ignores pinned en passant, preserves legal EP and position state', () => {
  for (const fen of ['k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', '8/8/8/r4pPK/8/8/8/k7 w - f6 0 2']) {
    const p = new Position(fen);
    assert.equal(p.epKey(), '-');
    assert.equal(p.fen(), fen);
  }
  const legal = new Position('k7/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
  assert.equal(legal.epKey(), 'd6');
  const game = new ChessGame('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
  for (const uci of Array(2).fill(['e1f1', 'a8b8', 'f1e1', 'b8a8']).flat()) {
    const m = parseUci(uci); assert.ok(game.playUci(m.from, m.to, m.promotion));
  }
  assert.equal(game.status().reason, 'repetition');
});

test('search horizon recognizes stalemate, mate and draws with quiescence on or off', () => {
  const source = ['engine.js', 'ai.js'].map((file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
    .replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '')).join('\n');
  const ctx = vm.createContext({ performance });
  vm.runInContext(source, ctx);
  for (const quiesce of [false, true]) for (const [fen, expected] of [
    ['7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', 0],
    ['7k/6Q1/6K1/8/8/8/8/8 b - - 0 1', -99997],
    ['7k/8/6K1/8/8/8/8/R7 b - - 100 70', 0],
    ['7k/8/6K1/8/8/8/8/8 b - - 0 1', 0],
  ]) {
    ctx.fen = fen; ctx.enabled = quiesce;
    assert.equal(vm.runInContext(`negamax(new Position(fen), 0, -1e9, 1e9, 3,
      {nodes:0,nodesCap:100000,deadline:Infinity,quiesce:enabled,killers:[],history:[]})`, ctx), expected);
  }
  // A queen hanging in the horizon must be seen only when captures extend it.
  ctx.fen = '6k1/8/3p4/4Q3/8/8/8/6K1 b - - 0 1';
  const horizon = (enabled) => {
    ctx.enabled = enabled;
    return vm.runInContext(`negamax(new Position(fen),0,-1e9,1e9,0,
      {nodes:0,nodesCap:100000,deadline:Infinity,quiesce:enabled,killers:[],history:[]})`, ctx);
  };
  assert.ok(horizon(true) > horizon(false) + 700);
});

test('root noise varies bounded near-equal moves while leaving evaluation and position intact', () => {
  const level = { ...LEVELS.l1 };
  const p = new Position(); const fen = p.fen();
  try {
    Object.assign(LEVELS.l1, { blunder: 0, noise: 0 });
    const best = chooseMove(p, 'l1', () => 0.5);
    LEVELS.l1.noise = 80;
    let seed = 7;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const picks = Array.from({ length: 30 }, () => chooseMove(p, 'l1', random));
    assert.ok(new Set(picks.map(({ move }) => `${move.from}:${move.to}`)).size > 1);
    assert.ok(picks.every(({ score }) => score <= best.score && best.score - score <= 160));
    assert.equal(p.fen(), fen);
  } finally { Object.assign(LEVELS.l1, level); }
});

test('opening names wait for defining moves and closed positions require actual pawn locks', () => {
  const opening = (line) => detectOpening(line.split(' ').map((san) => ({ san })));
  for (const line of ['d4 Nf6 c4 e6', 'd4 Nf6 c4 e6 Nf3', 'd4 Nf6 c4 g6 Nc3 d5']) assert.equal(opening(line).key, 'indianGame');
  assert.equal(opening('d4 Nf6 c4 e6 Nc3 Bb4').key, 'nimzoIndian');
  assert.equal(opening('d4 Nf6 c4 g6 Nc3 Bg7 e4 d6').key, 'kingsIndian');
  assert.equal(isClosedPosition(new Position()), false);
  assert.equal(isClosedPosition(new Position('4k3/8/pppppppp/8/PPPPPPPP/8/8/4K3 w - - 0 1')), false);
  assert.equal(isClosedPosition(new Position('4k3/8/8/pppppppp/PPPPPPPP/8/8/4K3 w - - 0 1')), true);
});

test('production dialogue picker keeps portraits consistent and filters factual poke lines', () => {
  for (const locale of ['zh', 'en']) for (const mood of MOODS) for (const thinking of [false, true]) for (const herInCheck of [false, true]) {
    const b = new Banter(locale, () => 0);
    for (let i = 0; i < 12; i++) {
      const line = b.pickDetailed('poke', { thinking, herInCheck }, mood);
      assert.ok(!line.mood || line.mood === mood);
      if (!herInCheck) assert.doesNotMatch(line.text, /王还被将|king.*check/i);
      if (!thinking) assert.doesNotMatch(line.text, /算到哪|thinking|calculat/i);
    }
  }
});

test('worker transport cancels, releases resources, ignores late replies and recovers after failure', async () => {
  const connections = [];
  const client = new SearchClient(() => {
    const worker = { postMessage(message) { this.message = message; }, terminate() { this.terminated = true; } };
    const connection = { worker, release() { this.released = true; } }; connections.push(connection); return connection;
  });
  const first = client.request('choose', {});
  const cancelled = assert.rejects(first, { name: 'AbortError' });
  client.cancel(); await cancelled;
  assert.ok(connections[0].worker.terminated && connections[0].released);
  const second = client.request('choose', {});
  connections[0].worker.onmessage({ data: { id: connections[1].worker.message.id, result: 'stale' } });
  assert.equal(client.pending.size, 1);
  connections[1].worker.onmessage({ data: { id: connections[1].worker.message.id, result: 'fresh' } });
  assert.equal(await second, 'fresh');
  const failed = client.request('choose', {});
  const rejected = assert.rejects(failed, /failed/);
  connections[1].worker.onerror(); await rejected;
  const retry = client.request('choose', {});
  connections[2].worker.onmessage({ data: { id: connections[2].worker.message.id, result: 'retry' } });
  assert.equal(await retry, 'retry'); client.cancel();
});

test('worker validates snapshot history and returns only legal moves', () => {
  const game = new ChessGame();
  assert.throws(() => processSearchRequest({ kind: 'choose', fen: game.fen(), ucis: ['e2e5'] }), /Invalid/);
  assert.throws(() => processSearchRequest({ kind: 'choose', fen: game.fen(), ucis: ['e2e4'] }), /mismatch/);
  const pick = processSearchRequest({ kind: 'choose', fen: game.fen(), ucis: [], difficulty: 'l1' });
  assert.ok(game.playUci(pick.move.from, pick.move.to, pick.move.promotion));
  assert.ok(Number.isFinite(pick.loss));
});
