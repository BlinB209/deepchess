/**
 * AI smoke test: legal self-play plus per-level timing. Run with
 * `node test/ai.mjs`.
 */
import { ChessGame, Position, START_FEN } from '../src/engine.js';
import { LEVEL_ORDER, chooseMove, findMateInOne, LEVELS } from '../src/ai.js';

let failed = 0;

for (const level of LEVEL_ORDER) {
  const position = new Position(START_FEN);
  const pick = chooseMove(position, level);
  if (!pick || !pick.move) {
    console.error(`FAIL ${level}: no move`);
    failed += 1;
    continue;
  }
  const legal = position.generateLegal().some((move) => (
    move.from === pick.move.from && move.to === pick.move.to && move.promotion === pick.move.promotion
  ));
  if (!legal) {
    console.error(`FAIL ${level}: chose an illegal move`);
    failed += 1;
  }
  console.log(`ok   ${level}: ${pick.move.from}->${pick.move.to} depth ${pick.depth} nodes ${pick.nodes} ${pick.ms}ms`);
  if (pick.ms > 5500) {
    console.error(`FAIL ${level}: too slow (${pick.ms}ms)`);
    failed += 1;
  }
}

// Self-play 40 plies at normal, asserting every move is legal.
const game = new ChessGame();
for (let ply = 0; ply < 40; ply += 1) {
  const status = game.status();
  if (status.state !== 'playing') break;
  const pick = chooseMove(game.position, 'normal');
  if (!pick) break;
  const result = game.play(pick.move);
  if (!result) {
    console.error('FAIL self-play: illegal AI move at ply', ply);
    failed += 1;
    break;
  }
}
console.log('self-play:', game.history.length, 'plies,', game.status().state);

// Mate in one: back-rank mate with a rook.
const mate = new Position('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
const mateMove = findMateInOne(mate);
if (!mateMove) {
  console.error('FAIL mate-in-one not found');
  failed += 1;
} else {
  console.log('mate-in-one:', mateMove.from, '->', mateMove.to);
}

console.log(failed === 0 ? 'AI OK' : `AI FAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
