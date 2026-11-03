/**
 * Perft gate for the 0x88 engine. Run with `node test/perft.mjs`.
 * Counts are the standard chessprogramming.org reference values.
 */
import { ChessGame, Position, perft, START_FEN } from '../src/engine.js';

const POSITIONS = [
  ['startpos', START_FEN, [20, 400, 8902, 197281]],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['position3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['position4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['position5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ['position6', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
];

let failed = 0;

for (const [name, fen, expected] of POSITIONS) {
  const position = new Position(fen);
  const roundTrip = position.fen();
  if (roundTrip !== fen) {
    console.error(`FEN round-trip failed for ${name}\n  in : ${fen}\n  out: ${roundTrip}`);
    failed += 1;
  }
  expected.forEach((want, index) => {
    const depth = index + 1;
    const started = performance.now();
    const got = perft(position, depth);
    const ms = Math.round(performance.now() - started);
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} depth ${depth}: ${got} (want ${want}) ${ms}ms`);
  });
}

// A short SAN / status smoke test.
const game = new ChessGame();
const moves = [
  ['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'],
  ['f1', 'b5'], ['a7', 'a6'], ['b5', 'a4'], ['g8', 'f6'],
  ['e1', 'g1'],
];
const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const sq = (text) => (Number(text[1]) - 1) * 16 + names.indexOf(text[0]);
for (const [from, to] of moves) {
  const result = game.playUci(sq(from), sq(to));
  if (!result) {
    console.error(`SAN smoke: illegal ${from}${to}`);
    failed += 1;
    break;
  }
}
if (game.history.length) {
  console.log('SAN smoke:', game.pgnMoves());
  if (!game.history.some((entry) => entry.san === 'O-O')) {
    console.error('SAN smoke: castling was not rendered as O-O');
    failed += 1;
  }
}

console.log(failed === 0 ? 'PERFT OK' : `PERFT FAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
