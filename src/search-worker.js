import { ChessGame, Position, parseUci } from './engine.js';
import { chooseMove } from './ai.js';
import { estimateMoveLoss } from './dialogue.js';

/** Both expensive operations run in the worker. Messages contain snapshots,
 * never live UI objects. The caller also validates the returned move. */
export function processSearchRequest({ kind, fen, difficulty, move, ucis }) {
  if (kind === 'analyze') return { loss: estimateMoveLoss(fen, move) };
  if (kind !== 'choose') throw new Error('Unknown search request');
  let position;
  if (Array.isArray(ucis)) {
    const game = new ChessGame();
    for (const uci of ucis) {
      const parsed = parseUci(uci);
      if (!parsed || !game.playUci(parsed.from, parsed.to, parsed.promotion)) throw new Error('Invalid search history');
    }
    if (game.fen() !== fen) throw new Error('Search snapshot mismatch');
    if (game.status().state !== 'playing') return null;
    position = game.position;
  } else position = new Position(fen);
  const pick = chooseMove(position, difficulty);
  if (!pick) return null;
  return { ...pick, loss: estimateMoveLoss(fen, pick.move) };
}

// Also importable by tests without installing a window/worker global.
if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof document === 'undefined') {
  self.onmessage = ({ data }) => {
    try {
      self.postMessage({ id: data.id, result: processSearchRequest(data) });
    } catch (error) {
      self.postMessage({ id: data.id, error: String(error?.message || error) });
    }
  };
}
