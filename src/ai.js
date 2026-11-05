/**
 * ai.js — a small negamax opponent for DeepChess.
 *
 * Strength is deliberately capped: the character should play a recognizable
 * game, make human-looking mistakes at low levels and never stall the panel.
 * The levels are spaced out so there is a practical step between "认真" and
 * "鲸鱼" instead of a single cliff.
 */
import { BISHOP, BLACK, KING, KNIGHT, PAWN, QUEEN, ROOK, WHITE, colorOf, typeOf } from './engine.js';

// Eight levels mirror Lichess's computer ladder. The ratings are targets,
// not a claim that this small JS engine is as strong as Stockfish at L8.
export const LEVELS = {
  l1: {
    id: 'l1', title: '摸鱼', rating: 800,
    depth: 1, timeMs: 160, nodes: 40000, blunder: 0.22, blunderLoss: 350, noise: 80, quiesce: false,
  },
  l2: {
    id: 'l2', title: '陪练', rating: 1100,
    depth: 2, timeMs: 500, nodes: 120000, blunder: 0.1, blunderLoss: 260, noise: 45, quiesce: true,
  },
  l3: {
    id: 'l3', title: '入门', rating: 1400,
    depth: 3, timeMs: 900, nodes: 260000, blunder: 0.04, blunderLoss: 180, noise: 20, quiesce: true,
  },
  l4: {
    id: 'l4', title: '认真', rating: 1700,
    depth: 4, timeMs: 1300, nodes: 450000, blunder: 0.015, blunderLoss: 120, noise: 10, quiesce: true,
  },
  l5: {
    id: 'l5', title: '进阶', rating: 2000,
    depth: 5, timeMs: 1800, nodes: 650000, blunder: 0, blunderLoss: 0, noise: 6, quiesce: true,
  },
  l6: {
    id: 'l6', title: '熟练', rating: 2200,
    depth: 6, timeMs: 2400, nodes: 900000, blunder: 0, blunderLoss: 0, noise: 3, quiesce: true,
  },
  l7: {
    id: 'l7', title: '鲸鱼', rating: 2500,
    depth: 7, timeMs: 3200, nodes: 1200000, blunder: 0, blunderLoss: 0, noise: 1, quiesce: true,
  },
  l8: {
    id: 'l8', title: '深渊', rating: 3000,
    depth: 9, timeMs: 5000, nodes: 2500000, blunder: 0, blunderLoss: 0, noise: 0, quiesce: true,
  },
};

export const LEVEL_ORDER = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'];

const MATE = 100000;
const INF = 1e9;
const PIECE_VALUE = { [PAWN]: 100, [KNIGHT]: 320, [BISHOP]: 335, [ROOK]: 500, [QUEEN]: 950, [KING]: 0 };

const PST = {
  [PAWN]: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  [KNIGHT]: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  [BISHOP]: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  [ROOK]: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  [QUEEN]: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  [KING]: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
  kingEnd: [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
  ],
};

/** Table index for a piece of `color` on a 0x88 square. */
function pstIndex(color, sq) {
  const file = sq & 15;
  const rank = sq >> 4;
  return (color === WHITE ? 7 - rank : rank) * 8 + file;
}

/** White-relative static evaluation in centipawns. */
export function evaluateWhite(position) {
  let phase = 0;
  for (let sq = 0; sq < 128; sq += 1) {
    if ((sq & 0x88) !== 0) continue;
    const piece = position.board[sq];
    if (piece === 0) continue;
    const type = typeOf(piece);
    if (type !== PAWN && type !== KING) phase += type === QUEEN ? 4 : type === ROOK ? 2 : 1;
  }
  const endgame = phase < 8;
  const midgame = phase >= 10;

  let score = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  const pawns = [[], []];
  const rooks = [[], []];
  const kings = [-1, -1];

  for (let sq = 0; sq < 128; sq += 1) {
    if ((sq & 0x88) !== 0) continue;
    const piece = position.board[sq];
    if (piece === 0) continue;
    const color = colorOf(piece);
    const type = typeOf(piece);
    if (type === BISHOP) {
      if (color === WHITE) whiteBishops += 1;
      else blackBishops += 1;
    }
    const table = type === KING && endgame ? PST.kingEnd : PST[type];
    const value = PIECE_VALUE[type] + table[pstIndex(color, sq)];
    score += color === WHITE ? value : -value;
    if (type === PAWN) pawns[color].push(sq);
    else if (type === ROOK) rooks[color].push(sq);
    else if (type === KING) kings[color] = sq;
  }

  if (whiteBishops >= 2) score += 28;
  if (blackBishops >= 2) score -= 28;

  // Pawn structure: doubled, isolated, passed; rook files; king shield.
  for (const color of [WHITE, BLACK]) {
    const sign = color === WHITE ? 1 : -1;
    const mine = pawns[color];
    const theirs = pawns[color ^ 1];
    const files = new Array(8).fill(0);
    for (const sq of mine) files[sq & 15] += 1;
    for (let file = 0; file < 8; file += 1) {
      if (files[file] > 1) score -= sign * 12 * (files[file] - 1);
      if (files[file] && (file === 0 || !files[file - 1]) && (file === 7 || !files[file + 1])) {
        score -= sign * 10;
      }
    }
    for (const sq of mine) {
      const file = sq & 15;
      const rank = sq >> 4;
      let passed = true;
      for (const enemy of theirs) {
        const efile = enemy & 15;
        const erank = enemy >> 4;
        if (Math.abs(efile - file) <= 1 && (color === WHITE ? erank > rank : erank < rank)) {
          passed = false;
          break;
        }
      }
      if (passed) {
        const advance = color === WHITE ? rank : 7 - rank;
        score += sign * (12 + advance * 10);
      }
    }
    for (const sq of rooks[color]) {
      const file = sq & 15;
      const friendlyPawn = mine.some((pawn) => (pawn & 15) === file);
      const enemyPawn = theirs.some((pawn) => (pawn & 15) === file);
      if (!friendlyPawn && !enemyPawn) score += sign * 16;
      else if (!friendlyPawn) score += sign * 8;
    }
    if (midgame && kings[color] >= 0) {
      const kingFile = kings[color] & 15;
      const kingRank = kings[color] >> 4;
      let shield = 0;
      for (let df = -1; df <= 1; df += 1) {
        const file = kingFile + df;
        if (file < 0 || file > 7) continue;
        const targetRank = color === WHITE ? kingRank + 1 : kingRank - 1;
        if (mine.some((pawn) => (pawn & 15) === file && (pawn >> 4) === targetRank)) shield += 1;
      }
      if (shield === 0) score -= sign * 22;
      else score += sign * shield * 6;
    }
  }

  // Small tempo bonus for the side to move.
  score += position.turn === WHITE ? 8 : -8;
  return score;
}

/** Evaluation relative to the side to move. */
export function evaluate(position) {
  const white = evaluateWhite(position);
  return position.turn === WHITE ? white : -white;
}

/** Material-only score for mood and quick UI labels. */
export function materialBalance(position) {
  return evaluateWhite(position);
}

function moveScore(move) {
  if (move.captured) return 2000 + PIECE_VALUE[typeOf(move.captured)] * 8 - PIECE_VALUE[typeOf(move.piece)];
  if (move.promotion) return 1800 + PIECE_VALUE[move.promotion];
  return 0;
}

function orderMoves(moves, ply, killers, history) {
  return moves
    .map((move) => {
      let score = moveScore(move);
      if (killers[ply] && killers[ply].from === move.from && killers[ply].to === move.to) score += 1200;
      score += history[move.from * 128 + move.to] || 0;
      return { move, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.move);
}

function quiesce(position, alpha, beta, ctx, depth, ply) {
  ctx.nodes += 1;
  if (ctx.nodes > ctx.nodesCap || performance.now() > ctx.deadline) {
    ctx.aborted = true;
    return alpha;
  }
  const inCheck = position.inCheck();
  const legal = position.generateLegal();
  if (!legal.length) return inCheck ? -MATE + ply : 0;
  if (position.halfmove >= 100 || position.insufficientMaterial()) return 0;
  if (!ctx.quiesce) return evaluate(position);
  if (!inCheck) {
    const stand = evaluate(position);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (depth <= 0) return alpha;
  }
  const moves = inCheck ? legal : legal.filter((move) => move.captured || move.promotion);
  if (!moves.length) return inCheck ? -MATE + ply : alpha;
  const ordered = orderMoves(moves, 0, ctx.killers, ctx.history);
  for (const move of ordered) {
    const undo = position.make(move);
    const score = -quiesce(position, -beta, -alpha, ctx, depth - 1, ply + 1);
    position.unmake(undo);
    if (ctx.aborted) return alpha;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(position, depth, alpha, beta, ply, ctx) {
  ctx.nodes += 1;
  if (ctx.nodes > ctx.nodesCap || ((ctx.nodes & 1023) === 0 && performance.now() > ctx.deadline)) {
    ctx.aborted = true;
    return 0;
  }
  if (depth <= 0) return quiesce(position, alpha, beta, ctx, 4, ply);
  const inCheck = position.inCheck();
  const moves = position.generateLegal();
  if (!moves.length) return inCheck ? -MATE + ply : 0;
  if (position.halfmove >= 100 || position.insufficientMaterial()) return 0;
  const ordered = orderMoves(moves, ply, ctx.killers, ctx.history);
  let best = -INF;
  for (const move of ordered) {
    const undo = position.make(move);
    const score = -negamax(position, depth - 1, -beta, -alpha, ply + 1, ctx);
    position.unmake(undo);
    if (ctx.aborted) return best === -INF ? 0 : best;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      if (!move.captured && !move.promotion) {
        ctx.killers[ply] = move;
        ctx.history[move.from * 128 + move.to] = (ctx.history[move.from * 128 + move.to] || 0) + depth * depth;
      }
      break;
    }
  }
  return best;
}

/**
 * Pick a move for the given level. The search is a plain, exact-window
 * alpha-beta at the root; legal move ordering only changes speed, never the
 * score. Low levels make bounded mistakes among the scored root moves, never
 * a uniform random legal move.
 */
export function chooseMove(position, levelId = 'l5', random = Math.random) {
  const level = LEVELS[levelId] || LEVELS.l5;
  const legal = position.generateLegal();
  if (!legal.length) return null;
  const started = performance.now();
  const ctx = {
    nodes: 0,
    nodesCap: level.nodes,
    deadline: started + level.timeMs,
    aborted: false,
    quiesce: level.quiesce,
    killers: new Array(16),
    history: new Int32Array(128 * 128),
  };
  let best = legal[0];
  let bestScore = -INF;
  let completed = 0;
  let rootScores = [];

  for (let depth = 1; depth <= level.depth; depth += 1) {
    const scored = [];
    let alpha = -INF;
    let localBest = null;
    let localScore = -INF;
    const ordered = orderMoves(legal, 0, ctx.killers, ctx.history);
    for (const move of ordered) {
      const undo = position.make(move);
      // Low levels need exact root scores to choose a bounded mistake.
      // High levels use the normal root alpha window and can search deeper.
      const score = -negamax(
        position,
        depth - 1,
        -INF,
        level.blunder > 0 || level.noise > 0 ? INF : -alpha,
        1,
        ctx,
      );
      position.unmake(undo);
      if (ctx.aborted) break;
      scored.push({ move, score });
      if (score > alpha) alpha = score;
      if (score > localScore) {
        localScore = score;
        localBest = move;
      }
    }
    if (!ctx.aborted && localBest) {
      best = localBest;
      bestScore = localScore;
      completed = depth;
      rootScores = scored.sort((a, b) => b.score - a.score);
      const index = legal.indexOf(localBest);
      if (index > 0) {
        legal.splice(index, 1);
        legal.unshift(localBest);
      }
    }
    if (ctx.aborted) break;
  }

  let blundered = false;
  if (completed && level.blunder > 0 && rootScores.length > 1 && random() < level.blunder) {
    const top = rootScores[0].score;
    const mistakes = rootScores.slice(1).filter((entry) => top - entry.score <= level.blunderLoss);
    if (mistakes.length) {
      const picked = mistakes[Math.floor(random() * mistakes.length)];
      blundered = picked.move !== best;
      best = picked.move;
      bestScore = picked.score;
    }
  }

  // Variation only affects completed root scores, never alpha/beta bounds.
  if (!blundered && completed && level.noise > 0 && Math.abs(bestScore) < MATE / 2) {
    const top = rootScores[0].score;
    let varied = -INF;
    for (const entry of rootScores) {
      if (top - entry.score > 2 * level.noise) continue;
      const score = entry.score + (random() * 2 - 1) * level.noise;
      if (score > varied) { varied = score; best = entry.move; bestScore = entry.score; }
    }
  }

  return {
    move: best,
    score: bestScore,
    nodes: ctx.nodes,
    depth: completed,
    ms: Math.round(performance.now() - started),
    blundered,
  };
}

/** Mate-in-one for the side to move, used by the "hint" line and tests. */
export function findMateInOne(position) {
  for (const move of position.generateLegal()) {
    const undo = position.make(move);
    const mate = position.generateLegal().length === 0 && position.inCheck();
    position.unmake(undo);
    if (mate) return move;
  }
  return null;
}
