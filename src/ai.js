/**
 * ai.js — a small negamax opponent for DeepChess.
 *
 * Strength is deliberately capped: the character should play a recognizable
 * game, make human-looking mistakes at low levels and never stall the panel.
 * Four levels change depth, time budget, evaluation noise and blunder rate.
 */
import { BISHOP, BLACK, KING, KNIGHT, PAWN, QUEEN, ROOK, WHITE, colorOf, typeOf } from './engine.js';

export const LEVELS = {
  easy: {
    id: 'easy',
    title: '摸鱼',
    depth: 1,
    timeMs: 140,
    nodes: 40000,
    blunder: 0.34,
    noise: 90,
    quiesce: false,
  },
  normal: {
    id: 'normal',
    title: '陪练',
    depth: 2,
    timeMs: 450,
    nodes: 120000,
    blunder: 0.07,
    noise: 34,
    quiesce: true,
  },
  hard: {
    id: 'hard',
    title: '认真',
    depth: 5,
    timeMs: 1800,
    nodes: 550000,
    blunder: 0,
    noise: 8,
    quiesce: true,
  },
  whale: {
    id: 'whale',
    title: '鲸鱼',
    depth: 7,
    timeMs: 3200,
    nodes: 1200000,
    blunder: 0,
    noise: 0,
    quiesce: true,
  },
  master: {
    id: 'master',
    title: '深渊',
    depth: 9,
    timeMs: 5000,
    nodes: 2500000,
    blunder: 0,
    noise: 0,
    quiesce: true,
  },
};

export const LEVEL_ORDER = ['easy', 'normal', 'hard', 'whale', 'master'];

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

function moveScore(position, move, ply, killers, history) {
  if (move.captured) {
    return 2000 + PIECE_VALUE[typeOf(move.captured)] * 8 - PIECE_VALUE[typeOf(move.piece)];
  }
  if (move.promotion) return 1800 + PIECE_VALUE[move.promotion];
  if (killers[ply] && killers[ply].from === move.from && killers[ply].to === move.to) return 1200;
  return history[move.from * 128 + move.to] || 0;
}

function orderMoves(position, moves, ply, killers, history) {
  return moves
    .map((move) => ({ move, score: moveScore(position, move, ply, killers, history) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.move);
}

function quiesce(position, alpha, beta, ctx, depth) {
  ctx.nodes += 1;
  if (ctx.nodes > ctx.nodesCap || performance.now() > ctx.deadline) {
    ctx.aborted = true;
    return alpha;
  }
  const stand = evaluate(position);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (depth <= 0) return alpha;
  const inCheck = position.inCheck();
  const moves = position.generateLegal().filter((move) => inCheck || move.captured || move.promotion);
  const ordered = orderMoves(position, moves, 0, ctx.killers, ctx.history);
  for (const move of ordered) {
    const undo = position.make(move);
    const score = -quiesce(position, -beta, -alpha, ctx, depth - 1);
    position.unmake(undo);
    if (ctx.aborted) return alpha;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function hasNonPawnMaterial(position, color) {
  for (let sq = 0; sq < 128; sq += 1) {
    if ((sq & 0x88) !== 0) continue;
    const piece = position.board[sq];
    if (piece === 0 || colorOf(piece) !== color) continue;
    const type = typeOf(piece);
    if (type === KNIGHT || type === BISHOP || type === ROOK || type === QUEEN) return true;
  }
  return false;
}

function negamax(position, depth, alpha, beta, ply, ctx) {
  ctx.nodes += 1;
  if (ctx.nodes > ctx.nodesCap || ((ctx.nodes & 1023) === 0 && performance.now() > ctx.deadline)) {
    ctx.aborted = true;
    return 0;
  }
  if (depth <= 0) return quiesce(position, alpha, beta, ctx, 4);
  const inCheck = position.inCheck();
  let searchDepth = depth;
  if (inCheck && searchDepth < 8 && ply < 14) searchDepth += 1;
  const moves = position.generateLegal();
  if (moves.length === 0) return inCheck ? -MATE + ply : 0;

  if (!inCheck && searchDepth >= 3 && ply > 0 && hasNonPawnMaterial(position, position.turn)) {
    const nullUndo = position.makeNull();
    const nullScore = -negamax(position, searchDepth - 3, -beta, -beta + 1, ply + 1, ctx);
    position.unmakeNull(nullUndo);
    if (ctx.aborted) return 0;
    if (nullScore >= beta) return beta;
  }

  const ordered = orderMoves(position, moves, ply, ctx.killers, ctx.history);
  let best = -INF;
  let searched = 0;
  for (const move of ordered) {
    const quiet = !move.captured && !move.promotion;
    let reduction = 0;
    if (!inCheck && searchDepth >= 3 && quiet && searched >= 4 && !(move.flags & 4)) reduction = 1;
    const undo = position.make(move);
    let score = -negamax(position, searchDepth - 1 - reduction, -beta, -alpha, ply + 1, ctx);
    if (reduction && score > alpha && !ctx.aborted) {
      score = -negamax(position, searchDepth - 1, -beta, -alpha, ply + 1, ctx);
    }
    position.unmake(undo);
    if (ctx.aborted) return best === -INF ? 0 : best;
    searched += 1;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      if (quiet) {
        ctx.killers[ply] = move;
        ctx.history[move.from * 128 + move.to] = (ctx.history[move.from * 128 + move.to] || 0) + searchDepth * searchDepth;
      }
      break;
    }
  }
  return best;
}

/**
 * Pick a move for the given level. Synchronous: callers run it in a timer so
 * the panel can paint "thinking" first.
 */
export function chooseMove(position, levelId = 'normal', random = Math.random) {
  const level = LEVELS[levelId] || LEVELS.normal;
  const legal = position.generateLegal();
  if (!legal.length) return null;
  const started = performance.now();
  if (level.blunder > 0 && random() < level.blunder) {
    const move = legal[Math.floor(random() * legal.length)];
    return { move, score: 0, nodes: 0, depth: 0, ms: Math.round(performance.now() - started), blundered: true };
  }

  const ctx = {
    nodes: 0,
    nodesCap: level.nodes,
    deadline: started + level.timeMs,
    aborted: false,
    killers: new Array(16),
    history: new Int32Array(128 * 128),
  };
  let best = legal[0];
  let bestScore = -INF;
  let completed = 0;

  for (let depth = 1; depth <= level.depth; depth += 1) {
    let alpha = -INF;
    let localBest = null;
    let localScore = -INF;
    const ordered = orderMoves(position, legal, 0, ctx.killers, ctx.history);
    for (const move of ordered) {
      const undo = position.make(move);
      const score = -negamax(position, depth - 1, -INF, -alpha, 1, ctx);
      position.unmake(undo);
      if (ctx.aborted) break;
      const noisy = score + (level.noise ? (random() * 2 - 1) * level.noise : 0);
      if (noisy > localScore) {
        localScore = noisy;
        localBest = move;
      }
      if (noisy > alpha) alpha = noisy;
    }
    if (!ctx.aborted && localBest) {
      best = localBest;
      bestScore = localScore;
      completed = depth;
      const index = legal.indexOf(localBest);
      if (index > 0) {
        legal.splice(index, 1);
        legal.unshift(localBest);
      }
    }
    if (ctx.aborted) break;
  }

  return {
    move: best,
    score: bestScore,
    nodes: ctx.nodes,
    depth: completed,
    ms: Math.round(performance.now() - started),
    blundered: false,
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
