import { PAWN, Position, typeOf } from './engine.js';
import { evaluateWhite } from './ai.js';

/** Compare a move with alternatives, including the opponent's immediate reply.
 * A static before/after score mistakes ordinary exchanges for brilliant moves
 * and cannot notice a hanging piece. This is deliberately only a quick estimate.
 */
export function estimateMoveLoss(fen, played) {
  const position = new Position(fen);
  const sign = position.turn === 0 ? 1 : -1;
  let best = -Infinity;
  let actual = null;
  for (const move of position.generateLegal()) {
    const undo = position.make(move);
    const replies = position.generateLegal();
    let score = replies.length ? Infinity : position.inCheck() ? 100000 : 0;
    for (const reply of replies) {
      const replyUndo = position.make(reply);
      score = Math.min(score, evaluateWhite(position) * sign);
      position.unmake(replyUndo);
    }
    position.unmake(undo);
    best = Math.max(best, score);
    if (move.from === played.from && move.to === played.to && move.promotion === played.promotion) actual = score;
  }
  return actual === null ? 0 : Math.max(0, best - actual);
}

export function classifyDialogueMove(move, san, loss, byPlayer, gain = 0) {
  const side = byPlayer ? 'player' : 'her';
  if (/[+#]/.test(san)) return `${side}Check`;
  if (move.promotion) return 'promotion';
  if (move.captured && typeOf(move.captured) === 5) return byPlayer ? 'queenCapture' : 'herQueenCapture';
  if (loss >= 180) return `${side}Blunder`;
  if (move.flags & 4) return 'castle';
  if (move.flags & 2) return 'enPassant';
  if (move.captured) return `${side}Capture`;
  if (loss < 60 && gain > 180) return `${side}Good`;
  return `${side}Quiet`;
}

const OPENINGS = [
  { key: 'italian', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], zh: '意大利开局', en: 'Italian Game' },
  { key: 'ruyLopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], zh: '西班牙开局', en: 'Ruy Lopez' },
  { key: 'sicilian', moves: ['e4', 'c5'], zh: '西西里防御', en: 'Sicilian Defence' },
  { key: 'french', moves: ['e4', 'e6'], zh: '法兰西防御', en: 'French Defence' },
  { key: 'caroKann', moves: ['e4', 'c6'], zh: '卡罗-卡恩防御', en: 'Caro-Kann Defence' },
  { key: 'scandinavian', moves: ['e4', 'd5'], zh: '斯堪的纳维亚防御', en: 'Scandinavian Defence' },
  { key: 'queensGambit', moves: ['d4', 'd5', 'c4'], zh: '后翼弃兵', en: "Queen's Gambit" },
  { key: 'london', moves: ['d4', 'd5', 'Bf4'], zh: '伦敦体系', en: 'London System' },
  { key: 'kingsIndian', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'], zh: '王翼印度防御', en: "King's Indian Defence" },
  { key: 'nimzoIndian', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], zh: '尼姆佐维奇防御', en: 'Nimzo-Indian Defence' },
  { key: 'indianGame', moves: ['d4', 'Nf6'], zh: '印度防御体系', en: 'Indian Game', generic: true },
  { key: 'english', moves: ['c4'], zh: '英国式开局', en: 'English Opening' },
  { key: 'reti', moves: ['Nf3'], zh: '列蒂开局', en: 'Réti Opening' },
  { key: 'openGame', moves: ['e4', 'e5'], zh: '开放局', en: 'Open Game', generic: true },
  { key: 'closedGame', moves: ['d4', 'd5'], zh: '封闭局', en: 'Closed Game', generic: true },
];

/** Recognise a named opening from a SAN prefix. Generic two-ply names are
 * marked so the panel can wait for a more specific line. */
export function detectOpening(history) {
  const sans = history.map((entry) => String(entry.san || '').replace(/[+#?!]/g, ''));
  const matches = OPENINGS
    .filter((opening) => opening.moves.every((move, index) => sans[index] === move))
    .sort((a, b) => b.moves.length - a.moves.length);
  return matches[0] || null;
}

/** Convert a centipawn loss/gain into a short, conversational grade. */
export function describeQuality(loss, gain, locale = 'zh') {
  const en = locale === 'en';
  if (loss >= 500) return en ? 'a blunder' : '大臭棋';
  if (loss >= 250) return en ? 'a bad move' : '臭棋';
  if (loss >= 180) return en ? 'a small mistake' : '小失误';
  // A shallow estimate cannot establish a brilliant move. Keep praise modest.
  if (gain >= 180) return en ? 'a nice move' : '不错的棋';
  return '';
}

export function selectSpecial(game, move, san, before, after, playerColor, facts, used) {
  const byPlayer = ((move.piece & 8) === 0) === (playerColor === 'white');
  const sign = playerColor === 'white' ? 1 : -1;
  const hasCheck = /[+#]/.test(san);
  const captures = game.history.filter((entry) => entry.move.captured).length;
  const checks = game.history.filter((entry) => /[+#]/.test(entry.san)).length;
  let queens = 0;
  let pieces = 0;
  for (const piece of game.position.board) {
    if (!piece) continue;
    if (typeOf(piece) === 5) queens += 1;
    if (typeOf(piece) !== 6) pieces += 1;
  }
  const candidates = [];
  if (hasCheck && checks === 1) candidates.push(byPlayer ? 'firstCheck' : 'herFirstCheck');
  // Never cover up a check or a lost queen with incidental chatter.
  if (hasCheck || (move.captured && typeOf(move.captured) === 5 && queens > 0)) {
    return candidates.find((key) => !used.has(key)) || null;
  }
  if (move.promotion && typeOf(move.promotion) !== 5) candidates.push(byPlayer ? 'underpromotion' : 'herUnderpromotion');
  if (queens === 0) candidates.push('queenTrade');
  if (captures === 1 && move.captured) candidates.push(byPlayer ? 'firstCapture' : 'herFirstCapture');
  if (before * sign < -250 && after * sign > 250) candidates.push('comeback');
  if (before * sign > 250 && after * sign < -250) candidates.push('herComeback');
  if (facts.blunderStreak >= 3) candidates.push('blunderStreak');
  if (pieces <= 6) candidates.push('lowMaterialSpecial');
  if (game.history.length >= 100) candidates.push('longGameSpecial');
  return candidates.find((key) => !used.has(key)) || null;
}

/** Closed-ish position: many pawns, few open files and at least two locked files. */
export function isClosedPosition(position) {
  const files = Array.from({ length: 8 }, () => ({ w: 0, b: 0, locked: false }));
  let pawns = 0;
  for (let sq = 0; sq < 128; sq += 1) {
    if (sq & 0x88) continue;
    const piece = position.board[sq];
    if (!piece || typeOf(piece) !== PAWN) continue;
    const file = sq & 15;
    if ((piece & 8) === 0) {
      files[file].w += 1;
      if (!((sq + 16) & 0x88) && position.board[sq + 16] === (PAWN | 8)) files[file].locked = true;
    }
    else files[file].b += 1;
    pawns += 1;
  }
  let openFiles = 0;
  let blockedFiles = 0;
  for (const file of files) {
    if (!file.w && !file.b) openFiles += 1;
    if (file.locked) blockedFiles += 1;
  }
  return pawns >= 10 && openFiles <= 3 && blockedFiles >= 2;
}

/** Her draw decision. Equal and closed positions are no longer an automatic no. */
export function acceptsDraw(evalWhite, playerColor, random = Math.random, position = null) {
  const herScore = evalWhite * (playerColor === 'white' ? -1 : 1);
  const closed = position ? isClosedPosition(position) : false;
  if (herScore < -280) return random() < 0.7;
  if (Math.abs(herScore) <= 120) return random() < (closed ? 0.38 : 0.28);
  if (herScore > 280) return random() < (closed ? 0.05 : 0.01);
  return random() < (closed ? 0.15 : 0.06);
}

/** Whether she should proactively offer a draw after her own move. */
export function shouldOfferDraw(position, evalWhite, playerColor, historyLength, random = Math.random) {
  if (historyLength < 20) return false;
  const herScore = evalWhite * (playerColor === 'white' ? -1 : 1);
  if (herScore < -160 || herScore > 180) return false;
  const chance = isClosedPosition(position) ? 0.16 : 0.09;
  return random() < chance;
}

/** Keep a line and its portrait together until the reader has time to read it.
 * Results interrupt immediately; ambient chatter never displaces game events.
 */
export class SpeechDirector {
  constructor(emit, {
    now = Date.now,
    // Browser timer functions must be called with the window receiver; a
    // detached `setTimeout` throws "Illegal invocation" in Chromium.
    schedule = (fn, delay) => setTimeout(fn, delay),
    cancel = (id) => clearTimeout(id),
  } = {}) {
    this.emit = emit;
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.reset();
  }

  reset() {
    if (this.timer != null) this.cancel(this.timer);
    this.timer = null;
    this.queue = [];
    this.until = 0;
    this.lastAmbient = -Infinity;
    this.lastPoke = -Infinity;
    this.priority = -1;
  }

  beginTurn() {
    // A new board action makes queued reactions to the old position obsolete.
    if (this.timer != null) this.cancel(this.timer);
    this.timer = null;
    this.queue = [];
    this.until = 0;
    this.priority = -1;
  }

  hasPending(key) {
    return this.queue.some((line) => line.onceKey === key);
  }

  deferFor(blockedMs) {
    // The synchronous chess search also pauses the typewriter. Preserve its
    // remaining reading time when the browser becomes responsive again.
    if (this.until <= this.now() - blockedMs) return;
    this.until += blockedMs;
    this.arm();
  }

  speak(line) {
    const now = this.now();
    if (line.event === 'poke') {
      if (now - this.lastPoke < 2000 || this.queue.length || (this.until > now && this.priority >= 1 && this.event !== 'poke')) return false;
      this.lastPoke = now;
    }
    if (line.priority === 0) {
      if (now < this.until || this.queue.length || now - this.lastAmbient < 12000) return false;
      this.lastAmbient = now;
    }
    if (line.priority >= 3) {
      this.reset();
      this.show(line);
    } else if (now >= this.until || this.priority === 0 || line.event === 'poke') {
      this.queue = [];
      this.show(line);
    } else {
      // Keep up to two short reactions; beginTurn still drops ones that no
      // longer fit the board, but an analysis line can follow the current one.
      const pending = this.queue[0];
      if (pending && line.priority < pending.priority) return false;
      this.queue = [...this.queue, line].slice(-2);
    }
    return true;
  }

  show(line) {
    this.priority = line.priority;
    this.event = line.event;
    this.until = this.now() + Math.min(5200, Math.max(2200, [...line.text].length * 85 + 900));
    this.emit(line);
    this.arm();
  }

  arm() {
    if (this.timer != null) this.cancel(this.timer);
    this.timer = this.schedule(() => {
      this.timer = null;
      const next = this.queue.shift();
      if (next) this.show(next);
    }, this.until - this.now());
  }
}
