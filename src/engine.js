/**
 * engine.js — a dependency-free 0x88 chess rules engine.
 *
 * The public surface is `Position` (mutable, make/unmake, used by search and
 * perft) and `ChessGame` (snapshot stack, SAN history, repetition and result).
 * Nothing here touches the DOM, React or storage, so it also runs under Node
 * for the perft suite in `test/perft.mjs`.
 */

export const WHITE = 0;
export const BLACK = 1;

export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Castling-right bits. */
const WK = 1;
const WQ = 2;
const BK = 4;
const BQ = 8;

/** Move flags. */
const F_CAPTURE = 1;
const F_EP = 2;
const F_CASTLE = 4;
const F_DOUBLE = 8;
const F_PROMO = 16;

const KNIGHT_OFFSETS = [-33, -31, -18, -14, 14, 18, 31, 33];
const BISHOP_OFFSETS = [-17, -15, 15, 17];
const ROOK_OFFSETS = [-16, -1, 1, 16];
const KING_OFFSETS = [-17, -16, -15, -1, 1, 15, 16, 17];

const PIECE_LETTER = { 1: 'P', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K' };
const LETTER_PIECE = { p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING };

/** True when a 0x88 index is on the board. */
export function onBoard(sq) {
  return (sq & 0x88) === 0;
}

/** Square index from algebraic text, e.g. "e4" → 0x34. */
export function parseSquare(text) {
  const file = 'abcdefgh'.indexOf(text[0]);
  const rank = Number(text[1]) - 1;
  if (file < 0 || rank < 0 || rank > 7) return -1;
  return rank * 16 + file;
}

/** Algebraic text from a square index. */
export function squareName(sq) {
  return 'abcdefgh'[sq & 15] + (1 + (sq >> 4));
}

/** Piece color. Empty squares are not meaningful input. */
export function colorOf(piece) {
  return (piece & 8) !== 0 ? BLACK : WHITE;
}

/** Piece type without its color bit. */
export function typeOf(piece) {
  return piece & 7;
}

/** FEN char for a piece code. */
export function pieceChar(piece) {
  const letter = PIECE_LETTER[piece & 7] || '';
  return colorOf(piece) === BLACK ? letter.toLowerCase() : letter;
}

/** Position: a mutable 0x88 board with make/unmake. */
export class Position {
  constructor(fen = START_FEN) {
    this.board = new Uint8Array(128);
    this.turn = WHITE;
    this.castling = 0;
    this.ep = -1;
    this.halfmove = 0;
    this.fullmove = 1;
    this.kings = [-1, -1];
    this.load(fen);
  }

  /** Replace every field from a FEN string. */
  load(fen) {
    const parts = String(fen).trim().split(/\s+/);
    if (parts.length < 4) throw new Error(`bad fen: ${fen}`);
    this.board.fill(0);
    const rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error(`bad fen board: ${fen}`);
    for (let r = 0; r < 8; r += 1) {
      let file = 0;
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') {
          file += Number(ch);
          continue;
        }
        const lower = ch.toLowerCase();
        const type = LETTER_PIECE[lower];
        if (!type) throw new Error(`bad fen piece: ${ch}`);
        const black = ch === lower;
        const sq = (7 - r) * 16 + file;
        this.board[sq] = type | (black ? 8 : 0);
        if (type === KING) this.kings[black ? BLACK : WHITE] = sq;
        file += 1;
      }
      if (file !== 8) throw new Error(`bad fen rank: ${rows[r]}`);
    }
    this.turn = parts[1] === 'b' ? BLACK : WHITE;
    this.castling = 0;
    if (parts[2].includes('K')) this.castling |= WK;
    if (parts[2].includes('Q')) this.castling |= WQ;
    if (parts[2].includes('k')) this.castling |= BK;
    if (parts[2].includes('q')) this.castling |= BQ;
    this.ep = parts[3] === '-' ? -1 : parseSquare(parts[3]);
    this.halfmove = Number(parts[4] || 0) || 0;
    this.fullmove = Number(parts[5] || 1) || 1;
    return this;
  }

  /** A detached copy, safe to mutate independently. */
  clone() {
    const copy = Object.create(Position.prototype);
    copy.board = this.board.slice();
    copy.turn = this.turn;
    copy.castling = this.castling;
    copy.ep = this.ep;
    copy.halfmove = this.halfmove;
    copy.fullmove = this.fullmove;
    copy.kings = this.kings.slice();
    return copy;
  }

  /** Serialize to FEN. */
  fen() {
    const rows = [];
    for (let r = 7; r >= 0; r -= 1) {
      let row = '';
      let empty = 0;
      for (let f = 0; f < 8; f += 1) {
        const piece = this.board[r * 16 + f];
        if (piece === 0) {
          empty += 1;
        } else {
          if (empty) row += empty;
          empty = 0;
          row += pieceChar(piece);
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    let rights = '';
    if (this.castling & WK) rights += 'K';
    if (this.castling & WQ) rights += 'Q';
    if (this.castling & BK) rights += 'k';
    if (this.castling & BQ) rights += 'q';
    return [
      rows.join('/'),
      this.turn === WHITE ? 'w' : 'b',
      rights || '-',
      this.ep >= 0 ? squareName(this.ep) : '-',
      this.halfmove,
      this.fullmove,
    ].join(' ');
  }

  /** Piece at a 0x88 square, or 0. */
  at(sq) {
    return this.board[sq];
  }

  /** Whether the given color's king is attacked right now. */
  inCheck(color = this.turn) {
    const king = this.kings[color];
    return king >= 0 && this.isAttacked(king, color ^ 1);
  }

  /** Whether `by` attacks `sq`. */
  isAttacked(sq, by) {
    if (!onBoard(sq)) return false;
    const board = this.board;
    if (by === WHITE) {
      if (onBoard(sq - 15) && board[sq - 15] === PAWN) return true;
      if (onBoard(sq - 17) && board[sq - 17] === PAWN) return true;
    } else {
      if (onBoard(sq + 15) && board[sq + 15] === (PAWN | 8)) return true;
      if (onBoard(sq + 17) && board[sq + 17] === (PAWN | 8)) return true;
    }
    for (const offset of KNIGHT_OFFSETS) {
      const to = sq + offset;
      if (onBoard(to) && board[to] === ((KNIGHT | (by === BLACK ? 8 : 0)))) return true;
    }
    for (const offset of KING_OFFSETS) {
      const to = sq + offset;
      if (onBoard(to) && board[to] === ((KING | (by === BLACK ? 8 : 0)))) return true;
    }
    const bishop = BISHOP | (by === BLACK ? 8 : 0);
    const rook = ROOK | (by === BLACK ? 8 : 0);
    const queen = QUEEN | (by === BLACK ? 8 : 0);
    for (const offset of BISHOP_OFFSETS) {
      let to = sq + offset;
      while (onBoard(to)) {
        const piece = board[to];
        if (piece !== 0) {
          if (piece === bishop || piece === queen) return true;
          break;
        }
        to += offset;
      }
    }
    for (const offset of ROOK_OFFSETS) {
      let to = sq + offset;
      while (onBoard(to)) {
        const piece = board[to];
        if (piece !== 0) {
          if (piece === rook || piece === queen) return true;
          break;
        }
        to += offset;
      }
    }
    return false;
  }

  /** Every pseudo-legal move for the side to move. */
  generatePseudo() {
    const moves = [];
    const us = this.turn;
    const them = us ^ 1;
    const board = this.board;
    for (let from = 0; from < 128; from += 1) {
      if (!onBoard(from)) continue;
      const piece = board[from];
      if (piece === 0 || colorOf(piece) !== us) continue;
      const type = typeOf(piece);
      if (type === PAWN) {
        const dir = us === WHITE ? 16 : -16;
        const startRank = us === WHITE ? 1 : 6;
        const promoRank = us === WHITE ? 7 : 0;
        const one = from + dir;
        if (onBoard(one) && board[one] === 0) {
          if ((one >> 4) === promoRank) {
            for (const promotion of [QUEEN, ROOK, BISHOP, KNIGHT]) {
              moves.push(makeMove(from, one, piece, 0, one, promotion, F_PROMO));
            }
          } else {
            moves.push(makeMove(from, one, piece, 0, one, 0, 0));
            const two = one + dir;
            if ((from >> 4) === startRank && board[two] === 0) {
              moves.push(makeMove(from, two, piece, 0, two, 0, F_DOUBLE));
            }
          }
        }
        for (const side of [-1, 1]) {
          const to = from + dir + side;
          if (!onBoard(to)) continue;
          const target = board[to];
          if (target !== 0 && colorOf(target) === them) {
            if ((to >> 4) === promoRank) {
              for (const promotion of [QUEEN, ROOK, BISHOP, KNIGHT]) {
                moves.push(makeMove(from, to, piece, target, to, promotion, F_PROMO | F_CAPTURE));
              }
            } else {
              moves.push(makeMove(from, to, piece, target, to, 0, F_CAPTURE));
            }
          } else if (target === 0 && to === this.ep) {
            const capturedSq = to - dir;
            moves.push(makeMove(from, to, piece, board[capturedSq], capturedSq, 0, F_EP | F_CAPTURE));
          }
        }
      } else if (type === KNIGHT || type === KING) {
        const offsets = type === KNIGHT ? KNIGHT_OFFSETS : KING_OFFSETS;
        for (const offset of offsets) {
          const to = from + offset;
          if (!onBoard(to)) continue;
          const target = board[to];
          if (target === 0) {
            moves.push(makeMove(from, to, piece, 0, to, 0, 0));
          } else if (colorOf(target) === them) {
            moves.push(makeMove(from, to, piece, target, to, 0, F_CAPTURE));
          }
        }
      } else {
        const offsets = type === BISHOP ? BISHOP_OFFSETS : type === ROOK ? ROOK_OFFSETS : KING_OFFSETS;
        for (const offset of offsets) {
          let to = from + offset;
          while (onBoard(to)) {
            const target = board[to];
            if (target === 0) {
              moves.push(makeMove(from, to, piece, 0, to, 0, 0));
            } else {
              if (colorOf(target) === them) {
                moves.push(makeMove(from, to, piece, target, to, 0, F_CAPTURE));
              }
              break;
            }
            to += offset;
          }
        }
      }
    }
    this.addCastlingMoves(moves, us, them);
    return moves;
  }

  /** Append legal castling moves for `us`. */
  addCastlingMoves(moves, us, them) {
    const board = this.board;
    if (us === WHITE) {
      if ((this.castling & WK) && board[4] === KING && board[7] === ROOK
        && board[5] === 0 && board[6] === 0
        && !this.isAttacked(4, them) && !this.isAttacked(5, them) && !this.isAttacked(6, them)) {
        moves.push(makeMove(4, 6, KING, 0, 6, 0, F_CASTLE));
      }
      if ((this.castling & WQ) && board[4] === KING && board[0] === ROOK
        && board[1] === 0 && board[2] === 0 && board[3] === 0
        && !this.isAttacked(4, them) && !this.isAttacked(3, them) && !this.isAttacked(2, them)) {
        moves.push(makeMove(4, 2, KING, 0, 2, 0, F_CASTLE));
      }
    } else {
      if ((this.castling & BK) && board[116] === (KING | 8) && board[119] === (ROOK | 8)
        && board[117] === 0 && board[118] === 0
        && !this.isAttacked(116, them) && !this.isAttacked(117, them) && !this.isAttacked(118, them)) {
        moves.push(makeMove(116, 118, KING | 8, 0, 118, 0, F_CASTLE));
      }
      if ((this.castling & BQ) && board[116] === (KING | 8) && board[112] === (ROOK | 8)
        && board[113] === 0 && board[114] === 0 && board[115] === 0
        && !this.isAttacked(116, them) && !this.isAttacked(115, them) && !this.isAttacked(114, them)) {
        moves.push(makeMove(116, 114, KING | 8, 0, 114, 0, F_CASTLE));
      }
    }
  }

  /** Every fully legal move for the side to move. */
  generateLegal() {
    const us = this.turn;
    const legal = [];
    for (const move of this.generatePseudo()) {
      const undo = this.make(move);
      if (!this.isAttacked(this.kings[us], us ^ 1)) legal.push(move);
      this.unmake(undo);
    }
    return legal;
  }

  /** Apply a move; returns the undo record for `unmake`. */
  make(move) {
    const us = this.turn;
    const them = us ^ 1;
    const type = typeOf(move.piece);
    const undo = {
      move,
      captured: move.captured,
      capturedSq: move.capturedSq,
      castling: this.castling,
      ep: this.ep,
      halfmove: this.halfmove,
      fullmove: this.fullmove,
      kingFrom: this.kings[us],
      kingTo: this.kings[us],
    };
    this.board[move.from] = 0;
    this.board[move.to] = move.promotion ? (move.promotion | (us === BLACK ? 8 : 0)) : move.piece;
    if (move.flags & F_EP) this.board[move.capturedSq] = 0;

    if (type === KING) {
      this.kings[us] = move.to;
      undo.kingTo = move.to;
      if (move.flags & F_CASTLE) {
        const rookFrom = move.to > move.from ? move.from + 3 : move.from - 4;
        const rookTo = move.to > move.from ? move.from + 1 : move.from - 1;
        this.board[rookTo] = this.board[rookFrom];
        this.board[rookFrom] = 0;
        undo.rookFrom = rookFrom;
        undo.rookTo = rookTo;
      }
    }

    if (type === KING) {
      this.castling &= us === WHITE ? ~(WK | WQ) : ~(BK | BQ);
    }
    if (type === ROOK) {
      if (move.from === 0) this.castling &= ~WQ;
      else if (move.from === 7) this.castling &= ~WK;
      else if (move.from === 112) this.castling &= ~BQ;
      else if (move.from === 119) this.castling &= ~BK;
    }
    if (move.capturedSq === 0) this.castling &= ~WQ;
    else if (move.capturedSq === 7) this.castling &= ~WK;
    else if (move.capturedSq === 112) this.castling &= ~BQ;
    else if (move.capturedSq === 119) this.castling &= ~BK;

    this.ep = move.flags & F_DOUBLE ? (move.from + move.to) >> 1 : -1;
    this.halfmove = type === PAWN || move.captured ? 0 : this.halfmove + 1;
    this.turn = them;
    if (us === BLACK) this.fullmove += 1;
    return undo;
  }

  /** Restore the position captured by `make`. */
  unmake(undo) {
    const move = undo.move;
    const us = this.turn ^ 1;
    this.turn = us;
    this.board[move.from] = move.piece;
    this.board[move.to] = 0;
    if (move.captured) this.board[undo.capturedSq] = undo.captured;
    if (undo.rookFrom !== undefined) {
      this.board[undo.rookFrom] = this.board[undo.rookTo];
      this.board[undo.rookTo] = 0;
    }
    this.kings[us] = undo.kingFrom;
    this.castling = undo.castling;
    this.ep = undo.ep;
    this.halfmove = undo.halfmove;
    this.fullmove = undo.fullmove;
  }

  /** Make a null move (pass the turn) for search; no board change. */
  makeNull() {
    const undo = { turn: this.turn, ep: this.ep, halfmove: this.halfmove };
    this.turn ^= 1;
    this.ep = -1;
    this.halfmove += 1;
    return undo;
  }

  /** Restore a null move. */
  unmakeNull(undo) {
    this.turn = undo.turn;
    this.ep = undo.ep;
    this.halfmove = undo.halfmove;
  }

  /** Ep square only when an enemy pawn could actually capture there. */
  epKey() {
    if (this.ep < 0) return '-';
    const us = this.turn;
    const dir = us === WHITE ? 16 : -16;
    for (const side of [-1, 1]) {
      const from = this.ep - dir + side;
      if (onBoard(from) && this.board[from] === (PAWN | (us === BLACK ? 8 : 0))) return squareName(this.ep);
    }
    return '-';
  }

  /** Repetition key: placement, turn, castling rights, capturable ep. */
  key() {
    let body = '';
    for (let r = 7; r >= 0; r -= 1) {
      for (let f = 0; f < 8; f += 1) {
        const piece = this.board[r * 16 + f];
        body += piece === 0 ? '.' : pieceChar(piece);
      }
    }
    return `${body}|${this.turn}|${this.castling}|${this.epKey()}`;
  }

  /** SAN for a legal move in the current position. */
  san(move) {
    if (move.flags & F_CASTLE) {
      const base = move.to > move.from ? 'O-O' : 'O-O-O';
      return base + this.checkSuffix(move);
    }
    const type = typeOf(move.piece);
    const target = squareName(move.to);
    let text = '';
    if (type === PAWN) {
      if (move.captured) text += 'abcdefgh'[move.from & 15] + 'x';
      text += target;
      if (move.promotion) text += '=' + PIECE_LETTER[move.promotion];
    } else {
      text += PIECE_LETTER[type];
      const rivals = this.generateLegal().filter((other) => (
        other.to === move.to
        && other.from !== move.from
        && typeOf(other.piece) === type
      ));
      if (rivals.length) {
        const sameFile = rivals.some((other) => (other.from & 15) === (move.from & 15));
        const sameRank = rivals.some((other) => (other.from >> 4) === (move.from >> 4));
        if (!sameFile) text += 'abcdefgh'[move.from & 15];
        else if (!sameRank) text += String(1 + (move.from >> 4));
        else text += squareName(move.from);
      }
      if (move.captured) text += 'x';
      text += target;
    }
    return text + this.checkSuffix(move);
  }

  /** "+"/"#" for the move that produced the current position's SAN. */
  checkSuffix(move) {
    const undo = this.make(move);
    const them = this.turn;
    let suffix = '';
    if (this.isAttacked(this.kings[them], them ^ 1)) {
      suffix = this.generateLegal().length === 0 ? '#' : '+';
    }
    this.unmake(undo);
    return suffix;
  }

  /** Whether the position is a dead draw by insufficient material. */
  insufficientMaterial() {
    let minors = 0;
    let bishops = 0;
    let bishopColors = -1;
    for (let sq = 0; sq < 128; sq += 1) {
      if (!onBoard(sq)) continue;
      const piece = this.board[sq];
      if (piece === 0) continue;
      const type = typeOf(piece);
      if (type === PAWN || type === ROOK || type === QUEEN) return false;
      if (type === BISHOP) {
        minors += 1;
        bishops += 1;
        const shade = ((sq >> 4) + (sq & 15)) & 1;
        if (bishopColors === -1) bishopColors = shade;
        else if (bishopColors !== shade) return false;
      } else if (type === KNIGHT) {
        minors += 1;
      }
    }
    if (minors <= 1) return true;
    return bishops === minors && bishopColors !== -1;
  }

  /** Current result: playing, checkmate, stalemate or a draw reason. */
  status(repetitionCount = 1) {
    const legal = this.generateLegal();
    if (legal.length === 0) {
      if (this.inCheck()) {
        return {
          state: 'checkmate',
          winner: this.turn === WHITE ? 'black' : 'white',
          reason: 'checkmate',
        };
      }
      return { state: 'stalemate', winner: null, reason: 'stalemate' };
    }
    if (this.halfmove >= 100) return { state: 'draw', winner: null, reason: 'fifty-move' };
    if (repetitionCount >= 3) return { state: 'draw', winner: null, reason: 'repetition' };
    if (this.insufficientMaterial()) return { state: 'draw', winner: null, reason: 'material' };
    return { state: 'playing', winner: null, reason: null };
  }
}

/** Internal move factory. */
function makeMove(from, to, piece, captured, capturedSq, promotion, flags) {
  return {
    from,
    to,
    piece,
    captured: captured || 0,
    capturedSq,
    promotion: promotion || 0,
    flags: flags | (captured ? F_CAPTURE : 0),
  };
}

/** UCI text for a move ("e2e4", "e7e8q"). */
export function moveToUci(move) {
  return squareName(move.from) + squareName(move.to) + (move.promotion ? PIECE_LETTER[move.promotion].toLowerCase() : '');
}

/** Parse UCI text into coordinates. */
export function parseUci(text) {
  if (typeof text !== 'string' || text.length < 4) return null;
  const from = parseSquare(text.slice(0, 2));
  const to = parseSquare(text.slice(2, 4));
  if (from < 0 || to < 0) return null;
  const promotion = text.length > 4 ? LETTER_PIECE[text[4].toLowerCase()] || 0 : 0;
  return { from, to, promotion };
}

/** Find the legal move matching coordinates. */
export function findMove(position, from, to, promotion = 0) {
  const candidates = position.generateLegal().filter((move) => move.from === from && move.to === to);
  if (!candidates.length) return null;
  if (!promotion) return candidates[0];
  return candidates.find((move) => move.promotion === promotion) || null;
}

/** A full game: snapshot stack, SAN history, repetition bookkeeping. */
export class ChessGame {
  constructor(fen = START_FEN) {
    this.position = new Position(fen);
    this.keys = [this.position.key()];
    this.history = [];
  }

  get turn() {
    return this.position.turn;
  }

  legalMoves() {
    return this.position.generateLegal();
  }

  fen() {
    return this.position.fen();
  }

  inCheck() {
    return this.position.inCheck();
  }

  /** Play a legal move object; returns its SAN and the resulting status. */
  play(move) {
    const san = this.position.san(move);
    const before = this.position.fen();
    this.position.make(move);
    this.history.push({ before, san, move, uci: moveToUci(move) });
    this.keys.push(this.position.key());
    return { san, uci: moveToUci(move), status: this.status() };
  }

  /** Play by coordinates; returns null when the move is not legal. */
  playUci(from, to, promotion = 0) {
    const move = findMove(this.position, from, to, promotion);
    return move ? this.play(move) : null;
  }

  /** Undo the last move, restoring the snapshot. */
  undo() {
    const last = this.history.pop();
    if (!last) return false;
    this.position = new Position(last.before);
    this.keys.pop();
    return true;
  }

  /** Result with threefold repetition counted from this game's key stack. */
  status() {
    const current = this.keys[this.keys.length - 1];
    let repetitions = 0;
    for (const key of this.keys) if (key === current) repetitions += 1;
    return this.position.status(repetitions);
  }

  /** Last move, for highlighting and for the move list. */
  get lastMove() {
    return this.history.length ? this.history[this.history.length - 1] : null;
  }

  /** PGN-like move text: "1. e4 e5 2. Nf3". */
  pgnMoves() {
    const out = [];
    this.history.forEach((entry, index) => {
      if (index % 2 === 0) out.push(`${index / 2 + 1}.`);
      out.push(entry.san);
    });
    return out.join(' ');
  }
}

/** Perft node count; the engine's correctness gate. */
export function perft(position, depth) {
  if (depth === 0) return 1;
  const moves = position.generateLegal();
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) {
    const undo = position.make(move);
    nodes += perft(position, depth - 1);
    position.unmake(undo);
  }
  return nodes;
}
