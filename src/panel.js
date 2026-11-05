/**
 * panel.js — the right-sidebar game panel.
 *
 * Everything is client-side: rules engine, AI, dialogue, save file and the
 * pixel UI. The Host half is intentionally empty.
 */

import { SpeechDirector, acceptsDraw, classifyDialogueMove, describeQuality, detectOpening, selectSpecial, shouldOfferDraw } from './dialogue.js';
import { Banter, MOOD_LABEL, chooseMood, moveContext } from './persona.js';
import { SearchClient } from './search-client.js';
import { Modal } from './modal.js';

const PIECE_KEY = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
const BUILD_VERSION = '0.7.1';
const SAVE_KEY = 'deepchess.save.v1';
const SETTINGS_KEY = 'deepchess.settings.v2';
const STATS_KEY = 'deepchess.stats.v1';
const KEY_EVENTS = new Set([
  'start', 'win', 'lose', 'draw', 'resign', 'undo', 'playerBlunder', 'herBlunder',
  'queenCapture', 'herQueenCapture', 'promotion', 'playerCheck', 'herCheck',
]);

const DEFAULT_SETTINGS = {
  difficulty: 'l5',
  playerColor: 'white',
  banter: 'normal',
  sound: true,
  flip: false,
  hints: true,
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: the game still works in memory */
  }
}

const LEGACY_DIFFICULTY = {
  easy: 'l1', normal: 'l2', hard: 'l5', sharp: 'l6', whale: 'l7', master: 'l8',
};

function loadSettings() {
  const value = readJSON(SETTINGS_KEY, {});
  const next = { ...DEFAULT_SETTINGS, ...(value && typeof value === 'object' ? value : {}) };
  if (!LEVELS[next.difficulty]) next.difficulty = LEGACY_DIFFICULTY[next.difficulty] || 'l4';
  return next;
}

function loadStats() {
  const value = readJSON(STATS_KEY, {});
  return {
    wins: Number(value?.wins) || 0,
    losses: Number(value?.losses) || 0,
    draws: Number(value?.draws) || 0,
    streak: Number(value?.streak) || 0,
    best: Number(value?.best) || 0,
  };
}

function colorIndex(color) {
  return color === 'white' ? 0 : 1;
}

function pieceSide(piece) {
  return colorOf(piece) === 0 ? 'w' : 'b';
}

export function Typewriter({ text, onDone }) {
  const [shown, setShown] = React.useState(0);
  const timerRef = React.useRef(null);
  const doneRef = React.useRef(false);
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;
  const chars = [...text];
  function complete() {
    clearTimeout(timerRef.current);
    setShown(chars.length);
    if (!doneRef.current) {
      doneRef.current = true;
      onDoneRef.current?.();
    }
  }
  React.useEffect(() => {
    setShown(0);
    doneRef.current = false;
    const letters = [...text];
    let index = 0;
    const step = () => {
      index += 1;
      setShown(index);
      if (index < letters.length) {
        const delay = /[，。！？…,.!?]/.test(letters[index - 1]) ? 130 : 22;
        timerRef.current = setTimeout(step, delay);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onDoneRef.current?.();
      }
    };
    if (letters.length) timerRef.current = setTimeout(step, 60);
    else complete();
    return () => clearTimeout(timerRef.current);
  }, [text]);
  const done = shown >= chars.length;
  return React.createElement(
    'div',
    { className: 'dc-speech', onClick: complete },
    chars.slice(0, shown).join(''),
    !done ? React.createElement('span', { className: 'dc-caret' }) : null,
  );
}

function PixelGlyph({ name }) {
  const common = { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true, style: { display: 'block' } };
  if (name === 'gear') {
    const teeth = [
      [6, 0, 4, 2], [6, 14, 4, 2], [0, 6, 2, 4], [14, 6, 2, 4],
      [3, 3, 3, 3], [10, 3, 3, 3], [3, 10, 3, 3], [10, 10, 3, 3],
      [5, 5, 6, 6],
    ];
    return React.createElement('svg', common,
      teeth.map((box, index) => React.createElement('rect', {
        key: index, x: box[0], y: box[1], width: box[2], height: box[3], fill: 'currentColor',
      })),
      React.createElement('rect', { x: 7, y: 7, width: 2, height: 2, fill: 'var(--dc-bg)' }));
  }
  if (name === 'chat') {
    return React.createElement('svg', common,
      React.createElement('path', { d: 'M2 2h12v9H7l-3 3v-3H2V2zm2 2v5h8V4H4z', fill: 'currentColor' }));
  }
  if (name === 'sound' || name === 'muted') {
    return React.createElement('svg', common,
      React.createElement('path', { d: 'M2 6h3l4-3v10l-4-3H2V6z', fill: 'currentColor' }),
      name === 'muted'
        ? React.createElement('path', { d: 'M11 6l4 4m0-4l-4 4', stroke: 'currentColor', strokeWidth: 2, fill: 'none' })
        : React.createElement('path', { d: 'M11 5l2 3-2 3M13 3l3 5-3 5', stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }));
  }
  return React.createElement('svg', common,
    React.createElement('path', { d: 'M2 2h3v3H2V2zm4 0h3v3H6V2zm4 0h4v3h-4V2zM2 6h12v2H2V6zm0 4h12v2H2v-2zm0 4h8v2H2v-2z', fill: 'currentColor' }));
}

function ChessWhaleGlyph(props) {
  const size = typeof props.size === 'number' ? props.size : 22;
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    className: props.className, 'aria-hidden': true, style: { display: 'block' },
  },
  React.createElement('path', { d: 'M5 7h8v3h3v3h-3v4H5v-4H2v-3h3V7z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M16 5l4-2v4l4 2-4 2V9l-4 2V5z', fill: 'currentColor' }),
  React.createElement('rect', { x: 7, y: 9, width: 2, height: 2, fill: 'var(--dc-bg)' }),
  React.createElement('rect', { x: 5, y: 18, width: 10, height: 2, fill: 'currentColor' }));
}

function Board({ game, selected, onSquare, settings, hints, disabled, playerColor, checkSquare, lastMove, boardRef, anim, boardShake }) {
  const initialFocus = selected != null
    ? selected
    : lastMove?.to ?? game.position.kings[colorIndex(playerColor)] ?? 0;
  const [focusSq, setFocusSq] = React.useState(initialFocus);
  const squareRefs = React.useRef({});
  const rankStep = settings.flip ? -1 : 1;
  const fileStep = settings.flip ? 1 : -1;
  function focusSquare(sq) {
    setFocusSq(sq);
    // Focusing immediately also works for a square whose tabIndex is still -1;
    // the state update promotes it to the single roving tab stop.
    squareRefs.current[sq]?.focus();
  }
  function onSquareKey(event, sq) {
    let next = null;
    const rank = sq >> 4;
    const file = sq & 15;
    if (event.key === 'ArrowUp') next = (rank + rankStep) * 16 + file;
    else if (event.key === 'ArrowDown') next = (rank - rankStep) * 16 + file;
    else if (event.key === 'ArrowLeft') next = rank * 16 + file + fileStep;
    else if (event.key === 'ArrowRight') next = rank * 16 + file - fileStep;
    if (next != null) {
      event.preventDefault();
      const nextRank = next >> 4;
      const nextFile = next & 15;
      if (nextRank >= 0 && nextRank < 8 && nextFile >= 0 && nextFile < 8) focusSquare(next);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!disabled) onSquare(sq);
    }
  }
  const cells = [];
  const ranks = settings.flip ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = settings.flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const targets = new Map();
  if (hints && selected != null) {
    for (const move of game.legalMoves()) {
      if (move.from !== selected) continue;
      const previous = targets.get(move.to);
      targets.set(move.to, { capture: Boolean(move.captured) || Boolean(previous?.capture) });
    }
  }
  for (const rank of ranks) {
    for (const file of files) {
      const sq = rank * 16 + file;
      const piece = game.position.at(sq);
      const isLight = (rank + file) % 2 === 1;
      const target = targets.get(sq);
      const classes = ['dc-sq', isLight ? 'light' : 'dark'];
      if (selected === sq) classes.push('sel');
      if (lastMove && (lastMove.from === sq || lastMove.to === sq)) classes.push('last');
      if (checkSquare === sq) classes.push('check');
      if (target) classes.push('dc-target');
      cells.push(React.createElement('button', {
        key: sq,
        type: 'button',
        className: classes.join(' '),
        'aria-label': squareName(sq),
        'aria-disabled': disabled ? 'true' : undefined,
        onClick: () => { if (!disabled) onSquare(sq); },
        onFocus: () => setFocusSq(sq),
        onKeyDown: (event) => onSquareKey(event, sq),
        ref: (element) => { squareRefs.current[sq] = element; },
        tabIndex: focusSq === sq ? 0 : -1,
      },
      piece
        ? React.createElement('img', {
          className: 'dc-piece',
          src: ASSETS.pieces[`${pieceSide(piece)}-${PIECE_KEY[typeOf(piece)]}`],
          alt: '',
          draggable: false,
          style: anim && anim.toSq === sq ? {
            position: 'relative',
            zIndex: 5,
            transform: anim.go ? 'translate(0,0)' : `translate(${anim.dx}px,${anim.dy}px)`,
            transition: anim.go ? 'transform .16s ease-out' : 'none',
          } : undefined,
        })
        : null,
      target
        ? React.createElement('span', { className: target.capture ? 'dc-ring' : 'dc-dot' })
        : null));
    }
  }
  return React.createElement('div', {
    className: `dc-board${boardShake ? ' dc-board-shake' : ''}`,
    role: 'grid',
    'aria-label': 'chess board',
    ref: boardRef,
  },
  cells);
}

export function DeepChessPanel(props) {
  const t = props.t;
  const locale = props.locale === 'en' ? 'en' : 'zh';

  const bootRef = React.useRef(null);
  if (bootRef.current === null) {
    const save = readJSON(SAVE_KEY, null);
    const game = new ChessGame();
    if (save && Array.isArray(save.ucis)) {
      for (const uci of save.ucis) {
        const parsed = parseUci(uci);
        if (parsed) game.playUci(parsed.from, parsed.to, parsed.promotion);
      }
    }
    bootRef.current = {
      game,
      save,
      color: (save?.playerColor || loadSettings().playerColor) === 'black' ? 'black' : 'white',
    };
  }
  const game = bootRef.current.game;
  const boot = bootRef.current;

  const [tick, bump] = React.useReducer((value) => value + 1, 0);
  const [settings, setSettings] = React.useState(loadSettings);
  const [stats, setStats] = React.useState(loadStats);
  const [gameColor, setGameColor] = React.useState(boot.color);
  const [manual, setManual] = React.useState(boot.save?.manual || null);
  const [mood, setMood] = React.useState('calm');
  const [speech, setSpeech] = React.useState('');
  const [speechKey, setSpeechKey] = React.useState(0);
  const [thinking, setThinking] = React.useState(false);
  const [searchError, setSearchError] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [pendingPromo, setPendingPromo] = React.useState(null);
  const [menu, setMenu] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);
  const [toast, setToast] = React.useState('');
  const [log, setLog] = React.useState([]);
  const [shaking, setShaking] = React.useState(false);
  const [anim, setAnim] = React.useState(null);
  const [boardShake, setBoardShake] = React.useState(false);
  const [drawPending, setDrawPending] = React.useState(false);
  const [incomingDraw, setIncomingDraw] = React.useState(false);
  const boardRef = React.useRef(null);
  const animTimer = React.useRef(null);
  const drawTimer = React.useRef(null);
  const searchRef = React.useRef(null);
  if (!searchRef.current) searchRef.current = new SearchClient();
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  const uiRef = React.useRef(null);
  uiRef.current = { menu, confirm, pendingPromo, incomingDraw, drawPending };

  const banterRef = React.useRef(null);
  if (!banterRef.current) banterRef.current = new Banter(locale);
  const settledRef = React.useRef(false);
  const aiRef = React.useRef(false);
  const startedRef = React.useRef(false);
  const toastTimer = React.useRef(null);
  const shakeTimer = React.useRef(null);
  const audioRef = React.useRef(null);
  const factsRef = React.useRef({ blunders: 0, blunderStreak: 0, undos: 0, ...boot.save?.facts });
  const specialRef = React.useRef(new Set(Array.isArray(boot.save?.specials) ? boot.save.specials : []));
  const turnStartRef = React.useRef(Date.now());
  const slowSaidRef = React.useRef(false);
  const moodHistoryRef = React.useRef([]);
  const lastActivityRef = React.useRef(Date.now());
  const idleSaidRef = React.useRef(false);
  const speechDirectorRef = React.useRef(null);
  const drawOfferedRef = React.useRef(false);
  const showSpeechRef = React.useRef(null);
  showSpeechRef.current = showSpeech;
  if (!speechDirectorRef.current) speechDirectorRef.current = new SpeechDirector((line) => showSpeechRef.current(line));

  const playerColor = gameColor;
  const herColor = playerColor === 'white' ? 'black' : 'white';
  const playerTurn = playerColor === 'white' ? 0 : 1;
  const outcome = React.useMemo(() => manual || game.status(), [tick, manual]);
  const over = outcome.state !== 'playing';
  const lastMove = game.lastMove?.move || null;
  const checkSquare = game.inCheck() ? game.position.kings[game.turn] : -1;

  React.useEffect(() => {
    banterRef.current.setLocale(locale);
    speechDirectorRef.current.reset();
  }, [locale]);

  React.useEffect(() => () => {
    searchRef.current.cancel();
    speechDirectorRef.current.reset();
    clearTimeout(drawTimer.current);
    clearTimeout(toastTimer.current);
    clearTimeout(shakeTimer.current);
    clearTimeout(animTimer.current);
  }, []);

  function showToast(text) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1600);
  }

  function maybeOpening(ctx, event) {
    if (event !== 'playerQuiet' && event !== 'herQuiet') return false;
    if (game.history.length < 4 || game.history.length > 14) return false;
    const opening = detectOpening(game.history);
    if (!opening || opening.generic) return false;
    return saySpecial(`opening:${opening.key}`, {
      ...ctx,
      openingKey: opening.key,
      opening: locale === 'en' ? opening.en : opening.zh,
    }, 'thinking', 'opening');
  }

  function maybeStateComment() {
    if (over) return;
    let pieces = 0;
    for (let sq = 0; sq < 128; sq += 1) {
      if ((sq & 0x88) !== 0 || !game.position.at(sq)) continue;
      if (typeOf(game.position.at(sq)) !== 6) pieces += 1;
    }
    if (pieces <= 6) {
      saySpecial('lowMaterialSpecial', {}, 'determined');
    } else if (game.history.length >= 100) {
      saySpecial('longGameSpecial', {}, 'tired');
    }
  }

  function saySpecial(key, ctx, mood, event = key) {
    if (specialRef.current.has(key)) return false;
    if (speechDirectorRef.current.hasPending(key)) return true;
    return say(event, ctx, mood, true, key);
  }

  function poke() {
    if (pendingPromo || menu || confirm || incomingDraw || drawPending) return;
    let nextMood = mood;
    if (game.inCheck() && game.turn !== playerTurn && !over) nextMood = 'panic';
    else if (thinking) nextMood = 'annoyed';
    else if (!over) nextMood = ['love', 'embarrassed', 'pout', 'laugh'][Math.floor(Math.random() * 4)];
    say('poke', { herInCheck: game.inCheck() && game.turn !== playerTurn && !over, thinking, over }, nextMood, true);
    lastActivityRef.current = Date.now();
    idleSaidRef.current = false;
  }

  function changeDifficulty(id) {
    if (id === settings.difficulty) return;
    setSettings((value) => ({ ...value, difficulty: id }));
    if (!over) say('difficulty', { difficulty: id }, id === 'l7' || id === 'l8' ? 'determined' : 'smile', true);
    showToast(`${t('set.difficulty')} · ${t(`diff.${id}`)} · ${LEVELS[id]?.rating || ''}`);
  }

  function triggerShake() {
    setShaking(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShaking(false), 320);
  }

  function animateMove(move, captured, check) {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    if (!rect.width) return;
    const cell = rect.width / 8;
    const place = (sq) => {
      const file = sq & 15;
      const rank = sq >> 4;
      return settingsRef.current.flip ? [7 - file, rank] : [file, 7 - rank];
    };
    const [fx, fy] = place(move.from);
    const [tx, ty] = place(move.to);
    if (animTimer.current) clearTimeout(animTimer.current);
    // FLIP: the final piece is already at the target square; offset it back to
    // the source, then transition to identity. No duplicate ghost piece.
    setAnim({
      key: Date.now(),
      toSq: move.to,
      dx: (fx - tx) * cell,
      dy: (fy - ty) * cell,
      go: false,
    });
    requestAnimationFrame(() => setAnim((value) => (value ? { ...value, go: true } : value)));
    animTimer.current = setTimeout(() => setAnim(null), 220);
    if (check) {
      setBoardShake(true);
      setTimeout(() => setBoardShake(false), 320);
    }
  }

  function rememberMood(next) {
    setMood(next);
    const history = moodHistoryRef.current;
    history.push(next);
    if (history.length > 6) history.shift();
  }

  function persist(nextManual = manual, nextColor = gameColor) {
    writeJSON(SAVE_KEY, {
      v: 1,
      ucis: game.history.map((entry) => entry.uci),
      manual: nextManual,
      playerColor: nextColor,
      facts: factsRef.current,
      specials: [...specialRef.current],
      savedAt: Date.now(),
    });
  }

  function playSound(kind) {
    if (!settingsRef.current.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const table = {
        move: [520, 0.04, 'square'],
        capture: [220, 0.07, 'square'],
        check: [760, 0.08, 'square'],
        win: [660, 0.12, 'triangle'],
        lose: [180, 0.16, 'triangle'],
      };
      const [freq, duration, type] = table[kind] || table.move;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (kind === 'capture') osc.frequency.exponentialRampToValueAtTime(140, now + duration);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      /* audio is optional */
    }
  }

  function toggleSound() {
    const next = !settings.sound;
    setSettings((value) => ({ ...value, sound: next }));
    showToast(t(next ? 'toast.soundOn' : 'toast.soundOff'));
  }

  function pushLog(who, text) {
    setLog((items) => [...items.slice(-79), { who, text }]);
  }

  function showSpeech(line) {
    if (line.onceKey) {
      specialRef.current.add(line.onceKey);
      persist();
    }
    banterRef.current.remember(line.text, line.event);
    rememberMood(line.mood);
    setSpeech(line.text);
    setSpeechKey((key) => key + 1);
    pushLog('her', line.text);
    if (line.mood === 'angry' || line.mood === 'panic') triggerShake();
  }

  function say(event, ctx = {}, nextMood, force = false, onceKey = null) {
    const ambient = ['idle', 'playerThinkLong', 'herThink'].includes(event);
    const probability = settingsRef.current.banter === 'quiet' ? 0.08 : settingsRef.current.banter === 'chatty' ? 0.9 : event === 'playerQuiet' ? 0.55 : 0.72;
    if (!force && !KEY_EVENTS.has(event) && Math.random() > probability) return false;
    const flavour = nextMood || chooseMood({
      status: manual || game.status(),
      evalWhite: evaluateWhite(game.position),
      event,
      playerColor,
      inCheck: game.inCheck(),
      herTurn: game.turn !== playerTurn,
      moveCount: game.history.length,
      recentMoods: moodHistoryRef.current,
    });
    const picked = banterRef.current.pickDetailed(event, ctx, flavour, false);
    const lineMood = nextMood || picked.mood || flavour;
    return speechDirectorRef.current.speak({
      event, text: picked.text, mood: lineMood, onceKey,
      priority: ambient ? 0 : ['win', 'lose', 'draw', 'resign', 'checkmateWin', 'checkmateLose', 'threefold', 'fiftyMove'].includes(event) ? 3 : force || KEY_EVENTS.has(event) ? 2 : 1,
    });
  }

  function finish(status, source) {
    if (settledRef.current) return;
    settledRef.current = true;
    searchRef.current.cancel();
    speechDirectorRef.current.reset();
    setConfirm(null);
    setMenu(null);
    setPendingPromo(null);
    setSelected(null);
    setIncomingDraw(false);
    setSearchError(false);
    clearTimeout(drawTimer.current);
    setDrawPending(false);
    const draw = !status.winner;
    const playerWon = status.winner === playerColor;
    setManual(status);
    persist(status);
    const next = { ...stats };
    if (draw) next.draws += 1;
    else if (playerWon) {
      next.wins += 1;
      next.streak += 1;
      next.best = Math.max(next.best, next.streak);
    } else {
      next.losses += 1;
      next.streak = 0;
    }
    setStats(next);
    writeJSON(STATS_KEY, next);
    setThinking(false);
    aiRef.current = false;
    const event = source === 'resign' ? 'resign'
      : status.state === 'checkmate' ? playerWon ? 'checkmateLose' : 'checkmateWin'
        : status.reason === 'repetition' ? 'threefold'
          : status.reason === 'fifty-move' ? 'fiftyMove'
            : draw ? 'draw' : playerWon ? 'lose' : 'win';
    const finalMood = chooseMood({ status, playerColor, recentMoods: moodHistoryRef.current });
    say(event, {}, source === 'resign' ? 'smile' : finalMood, true);
    playSound(draw ? 'move' : playerWon ? 'lose' : 'win');
  }

  function reactToMove(move, result, before, loss, byPlayer) {
    const after = evaluateWhite(game.position);
    const gain = (after - before) * ((playerColor === 'white') === byPlayer ? 1 : -1);
    const event = classifyDialogueMove(move, result.san, loss, byPlayer, gain);
    const verdict = describeQuality(loss, move.captured || move.promotion ? 0 : gain, locale);
    const ctx = moveContext(move, result.san, game.history.length, { byPlayer, loss, gain, verdict });
    if (byPlayer) {
      if (loss >= 180) factsRef.current.blunders += 1;
      factsRef.current.blunderStreak = loss >= 180 ? factsRef.current.blunderStreak + 1 : 0;
    }
    const special = event.endsWith('Blunder') ? null : selectSpecial(game, move, result.san, before, after, playerColor, factsRef.current, specialRef.current);
    const fullCtx = { ...ctx, blunders: factsRef.current.blunders, undos: factsRef.current.undos };
    if (!special || !saySpecial(special, fullCtx)) {
      if (!maybeOpening(fullCtx, event)) say(event, fullCtx);
    }
    maybeStateComment();
    persist();
  }

  function afterPlayerMove(move, result, before) {
    speechDirectorRef.current.beginTurn();
    lastActivityRef.current = Date.now();
    idleSaidRef.current = false;
    animateMove(move, Boolean(move.captured), /[+#]/.test(result.san));
    bump();
    playSound(/[+#]/.test(result.san) ? 'check' : move.captured ? 'capture' : 'move');
    if (result.status.state !== 'playing') {
      finish(result.status, 'engine');
      return;
    }
    setSelected(null);
    persist();
    const fen = game.fen();
    searchRef.current.request('analyze', { fen: game.lastMove.before, move }).then(({ loss }) => {
      if (bootRef.current.game !== game || game.fen() !== fen || settledRef.current) return;
      reactToMove(move, result, before, loss, true);
    }).catch((error) => {
      if (error.name !== 'AbortError' && bootRef.current.game === game && game.fen() === fen && !settledRef.current) {
        // Preserve event feedback even if optional analysis is unavailable.
        reactToMove(move, result, before, 0, true);
      }
    });
  }

  function playMove(from, to, promotion = 0) {
    if (over || settledRef.current || thinking || drawPending || incomingDraw || confirm || menu || (pendingPromo && !promotion) || game.turn !== playerTurn) return;
    const before = evaluateWhite(game.position);
    const result = game.playUci(from, to, promotion);
    if (!result) return;
    afterPlayerMove(game.lastMove.move, result, before);
  }

  function onSquare(sq) {
    if (over || settledRef.current || thinking || drawPending || incomingDraw || confirm || menu || pendingPromo || game.turn !== playerTurn) return;
    const piece = game.position.at(sq);
    const own = piece !== 0 && colorOf(piece) === playerTurn;
    if (selected == null) {
      if (own) setSelected(sq);
      return;
    }
    if (own) {
      setSelected(sq);
      return;
    }
    const matches = game.legalMoves().filter((move) => move.from === selected && move.to === sq);
    if (!matches.length) {
      setSelected(null);
      return;
    }
    if (matches.some((move) => move.promotion)) {
      setPendingPromo({ from: selected, to: sq });
      return;
    }
    playMove(selected, sq);
  }

  function choosePromotion(piece) {
    if (!pendingPromo) return;
    const pending = pendingPromo;
    setPendingPromo(null);
    playMove(pending.from, pending.to, piece);
  }

  function undo() {
    if (thinking || over || drawPending || incomingDraw || pendingPromo || confirm || menu) return;
    searchRef.current.cancel();
    if (!game.history.length) {
      showToast(t('toast.noUndo'));
      return;
    }
    game.undo();
    if (game.history.length && game.turn !== playerTurn) game.undo();
    setSelected(null);
    factsRef.current.undos += 1;
    factsRef.current.blunderStreak = 0;
    speechDirectorRef.current.reset();
    lastActivityRef.current = Date.now();
    idleSaidRef.current = false;
    bump();
    persist();
    playSound('move');
    say('undo', { undos: factsRef.current.undos, n: Math.ceil(game.history.length / 2) || 1 }, undefined, true);
  }

  function startNew() {
    const rematch = over;
    searchRef.current.cancel();
    setSearchError(false);
    setConfirm(null);
    setMenu(null);
    if (drawTimer.current) clearTimeout(drawTimer.current);
    setDrawPending(false);
    bootRef.current.game = new ChessGame();
    aiRef.current = false;
    settledRef.current = false;
    factsRef.current = { blunders: 0, blunderStreak: 0, undos: 0 };
    specialRef.current = new Set();
    drawOfferedRef.current = false;
    setIncomingDraw(false);
    speechDirectorRef.current.reset();
    setManual(null);
    setGameColor(settings.playerColor);
    setSelected(null);
    setPendingPromo(null);
    setThinking(false);
    lastActivityRef.current = Date.now();
    idleSaidRef.current = false;
    moodHistoryRef.current = [];
    writeJSON(SAVE_KEY, { v: 1, ucis: [], manual: null, playerColor: settings.playerColor, savedAt: Date.now() });
    bump();
    const startEvent = rematch ? 'rematch' : 'start';
    speechDirectorRef.current.speak({ event: startEvent, mood: 'smile', priority: 2,
      text: banterRef.current.pick(startEvent, { playerColor: settings.playerColor }, 'smile', false) });
    showToast(t('toast.new'));
  }

  function resign() {
    setConfirm(null);
    finish({ state: 'resign', winner: herColor, reason: 'resign' }, 'resign');
  }

  function resolveDraw() {
    if (settledRef.current || game.status().state !== 'playing') {
      setDrawPending(false);
      return;
    }
    const accept = acceptsDraw(evaluateWhite(game.position), playerColor, Math.random, game.position);
    if (accept) {
      finish({ state: 'draw', winner: null, reason: 'agreement' }, 'agreement');
    } else {
      say('drawRefuse', {}, undefined, true);
      showToast(t('toast.drawRefused'));
    }
  }

  function offerDraw() {
    setConfirm(null);
    if (over || thinking || drawPending || incomingDraw) return;
    setDrawPending(true);
    speechDirectorRef.current.reset();
    say('drawOffer', {}, 'thinking', true);
    if (drawTimer.current) clearTimeout(drawTimer.current);
    drawTimer.current = setTimeout(() => {
      setDrawPending(false);
      resolveDraw();
    }, 760);
  }

  function acceptIncomingDraw() {
    setIncomingDraw(false);
    if (over) return;
    finish({ state: 'draw', winner: null, reason: 'agreement' }, 'agreement');
  }

  function declineIncomingDraw() {
    setIncomingDraw(false);
    say('drawDecline', {}, 'pout', true);
    showToast(t('toast.drawDeclined'));
  }

  function maybeOfferDraw() {
    if (settledRef.current || Object.values(uiRef.current).some(Boolean) || drawOfferedRef.current) return;
    if (game.turn !== playerTurn || game.inCheck()) return;
    if (!shouldOfferDraw(game.position, evaluateWhite(game.position), playerColor, game.history.length)) return;
    drawOfferedRef.current = true;
    setIncomingDraw(true);
    say('drawAsk', {}, 'thinking', true);
  }

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (over) {
      settledRef.current = true;
      const won = outcome.winner === gameColor;
      const event = !outcome.winner ? 'draw' : won ? 'lose' : 'win';
      say(event, {}, chooseMood({ status: outcome, playerColor: gameColor }), true);
      persist(outcome, gameColor);
      return;
    }
    if (game.history.length) {
      say('resume', {}, 'smile', true);
    } else {
      say('start', { playerColor: gameColor }, 'smile', true);
    }
    persist(boot.save?.manual || null, gameColor);
  }, []);

  React.useEffect(() => {
    if (over) return;
    const isHerTurn = game.turn !== playerTurn;
    if (!isHerTurn) return;
    if (aiRef.current) return;
    aiRef.current = true;
    setThinking(true);
    setSearchError(false);
    let active = true;
    const fen = game.fen();
    if (Math.random() < 0.24) say('herThink', {}, 'thinking');
    const timer = setTimeout(async () => {
      if (!active || !aiRef.current) return;
      try {
        const before = evaluateWhite(game.position);
        const pick = await searchRef.current.request('choose', {
          fen, difficulty: settings.difficulty, ucis: game.history.map((entry) => entry.uci),
        });
        if (!active || !aiRef.current || settledRef.current || bootRef.current.game !== game || game.fen() !== fen) return;
        if (!pick?.move) throw new Error('No move from search');
        const result = game.playUci(pick.move.from, pick.move.to, pick.move.promotion);
        if (!result) throw new Error('Invalid move from search');
        const move = game.lastMove.move;
        lastActivityRef.current = Date.now();
        idleSaidRef.current = false;
        animateMove(move, Boolean(move.captured), /[+#]/.test(result.san));
        bump();
        setThinking(false);
        aiRef.current = false;
        playSound(/[+#]/.test(result.san) ? 'check' : move.captured ? 'capture' : 'move');
        if (result.status.state !== 'playing') {
          finish(result.status, 'engine');
          return;
        }
        reactToMove(move, result, before, Number.isFinite(pick.loss) ? pick.loss : 0, false);
        maybeOfferDraw();
        persist();
      } catch (error) {
        if (!active || error.name === 'AbortError') return;
        searchRef.current.cancel();
        setThinking(false);
        aiRef.current = false;
        setSearchError(true);
      }
    }, 280);
    return () => {
      clearTimeout(timer);
      active = false;
      aiRef.current = false;
      searchRef.current.cancel();
    };
  }, [tick, over, playerColor, settings.difficulty, locale]);

  React.useEffect(() => {
    writeJSON(SETTINGS_KEY, settings);
  }, [settings]);

  React.useEffect(() => {
    turnStartRef.current = Date.now();
    slowSaidRef.current = false;
  }, [tick]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (over || thinking || menu || confirm || pendingPromo || incomingDraw || drawPending || slowSaidRef.current || settings.banter === 'quiet') return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (game.turn !== playerTurn) return;
      if (Date.now() - turnStartRef.current < 45000) return;
      slowSaidRef.current = true;
      say('playerThinkLong');
    }, 5000);
    return () => clearInterval(timer);
  }, [over, thinking, menu, confirm, pendingPromo, incomingDraw, drawPending, gameColor, tick, settings.banter]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (over || thinking || menu || confirm || pendingPromo || incomingDraw || drawPending || idleSaidRef.current || settings.banter === 'quiet') return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (game.turn !== playerTurn) return;
      if (Date.now() - lastActivityRef.current < 75000) return;
      idleSaidRef.current = true;
      say('idle');
    }, 10000);
    return () => clearInterval(timer);
  }, [over, thinking, menu, confirm, pendingPromo, incomingDraw, drawPending, gameColor, tick, settings.banter]);

  const moodLabel = MOOD_LABEL[locale][mood] || mood;
  const movePairs = [];
  for (let i = 0; i < game.history.length; i += 2) {
    movePairs.push({
      n: i / 2 + 1,
      white: game.history[i]?.san || '',
      black: game.history[i + 1]?.san || '',
    });
  }
  const recentPairs = movePairs.slice(-2);
  const lastPair = movePairs[movePairs.length - 1];
  const currentMoveText = lastPair
    ? `${lastPair.n}. ${lastPair.white}${lastPair.black ? ` ${lastPair.black}` : ''}`
    : t('moves.empty');
  const capturer = { you: [], her: [] };
  for (const entry of game.history) {
    if (!entry.move.captured) continue;
    const key = `${pieceSide(entry.move.captured)}-${PIECE_KEY[typeOf(entry.move.captured)]}`;
    if (colorOf(entry.move.piece) === colorIndex(gameColor)) capturer.you.push(key);
    else capturer.her.push(key);
  }
  let resultTitle = '';
  if (over) {
    const final = manual || outcome;
    if (final.state === 'stalemate') resultTitle = t('result.stalemate');
    else if (final.state === 'draw') {
      resultTitle = final.reason === 'agreement'
        ? t('result.drawAgreement')
        : final.reason === 'repetition'
          ? t('result.drawRepetition')
          : final.reason === 'fifty-move'
            ? t('result.drawFifty')
            : final.reason === 'material'
              ? t('result.drawMaterial')
              : t('result.draw');
    }
    else if (final.reason === 'resign') resultTitle = t('result.resign');
    else resultTitle = final.winner === playerColor ? t('result.win') : t('result.lose');
  }

  const confirmMeta = confirm === 'new'
    ? {
      mark: '新', tone: 'new', title: t('confirm.new'), desc: t('confirm.newDesc'), note: t('confirm.newNote'),
      button: t('btn.restart'), action: () => { setConfirm(null); startNew(); },
    }
    : confirm === 'resign'
      ? {
        mark: '认', tone: 'resign', title: t('confirm.resign'), desc: t('confirm.resignDesc'), note: t('confirm.resignNote'),
        button: t('btn.resignNow'), action: resign,
      }
      : confirm === 'draw'
        ? {
          mark: '和', tone: 'draw', title: t('confirm.draw'), desc: t('confirm.drawNote'), note: t('confirm.drawHint'),
          button: t('btn.offerDraw'), action: offerDraw,
        }
        : null;

  const modal = incomingDraw ? 'incoming' : pendingPromo ? 'promotion' : confirmMeta ? 'confirm' : menu ? 'menu' : over ? 'result' : null;

  return React.createElement('div', { className: 'dc-root' },
    React.createElement('div', { className: 'dc-head' },
      React.createElement('div', { className: 'dc-title' }, t('tab.title')),
      React.createElement('div', { className: 'dc-title-en' }, 'DeepChess'),
      React.createElement('div', { className: 'dc-head-actions' },
        React.createElement('button', { type: 'button', className: 'dc-icon-btn', onClick: () => setMenu(menu === 'moves' ? null : 'moves'), 'aria-label': t('moves.title'), title: t('moves.title') }, React.createElement(PixelGlyph, { name: 'moves' })),
        React.createElement('button', { type: 'button', className: 'dc-icon-btn', onClick: () => setMenu(menu === 'log' ? null : 'log'), 'aria-label': t('chat.title'), title: t('chat.title') }, React.createElement(PixelGlyph, { name: 'chat' })),
        React.createElement('button', {
          type: 'button',
          className: `dc-icon-btn${settings.sound ? ' on' : ''}`,
          onClick: toggleSound,
          'aria-label': t(settings.sound ? 'sound.toggleOff' : 'sound.toggleOn'),
          'aria-pressed': settings.sound,
          title: t(settings.sound ? 'sound.toggleOff' : 'sound.toggleOn'),
        }, React.createElement(PixelGlyph, { name: settings.sound ? 'sound' : 'muted' })),
        React.createElement('button', { type: 'button', className: 'dc-icon-btn', onClick: () => setMenu('settings'), 'aria-label': t('btn.settings'), title: t('btn.settings') }, React.createElement(PixelGlyph, { name: 'gear' })))),
    React.createElement('div', { className: 'dc-diffbar' },
      React.createElement('span', { className: 'dc-diffbar-label' }, t('set.difficulty')),
      LEVEL_ORDER.map((id) => React.createElement('button', {
        key: id,
        type: 'button',
        className: `dc-diff${settings.difficulty === id ? ' on' : ''}`,
        onClick: () => changeDifficulty(id),
        title: `${t(`diff.${id}`)} · ${LEVELS[id].rating}`,
        'aria-label': `${t(`diff.${id}`)} · ${LEVELS[id].rating}`,
      }, t(`diff.${id}`)))),
    React.createElement('div', { className: 'dc-scene' },
      React.createElement('div', {
        className: `dc-portrait-card${shaking ? ' dc-shake' : ''}`,
        key: `portrait-${mood}`,
        onClick: poke,
        role: 'button',
        tabIndex: 0,
        title: t('name'),
        'aria-label': `${t('name')} · ${t('subtitle')}`,
        onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); poke(); } },
      },
        React.createElement('div', { className: 'dc-portrait-stage' },
          React.createElement('img', {
            className: 'dc-portrait',
            src: ASSETS.portraits[mood] || ASSETS.portraits.calm,
            alt: moodLabel,
            draggable: false,
          })),
        React.createElement('div', { className: 'dc-portrait-name' },
          React.createElement('span', null, t('name')),
          React.createElement('span', null, t('subtitle')))),
      React.createElement('div', { className: 'dc-bubble' },
        React.createElement('div', { className: 'dc-bubble-name' },
          t('name'),
          React.createElement('span', { className: 'dc-mood-chip' }, moodLabel),
          thinking ? React.createElement('span', { className: 'dc-typing', 'aria-label': t('turn.thinking') }, React.createElement('i'), React.createElement('i'), React.createElement('i')) : null),
        React.createElement(Typewriter, { key: speechKey, text: speech || '……' }))),
    React.createElement('div', { className: 'dc-board-wrap' },
      React.createElement(Board, {
        game,
        selected,
        onSquare,
        settings,
        hints: settings.hints,
        disabled: over || thinking || drawPending || Boolean(modal) || game.turn !== playerTurn,
        playerColor,
        checkSquare,
        lastMove,
        boardRef,
        anim,
        boardShake,
      })),
    searchError ? React.createElement('div', { className: 'dc-search-error', role: 'alert' },
      React.createElement('span', null, t('search.failed')),
      React.createElement('button', { className: 'dc-btn', type: 'button', onClick: () => bump() }, t('search.retry'))) : null,
    React.createElement('div', { className: 'dc-status' },
      React.createElement('div', { className: 'dc-turn' },
        React.createElement('span', { className: 'dc-turn-dot' }),
        React.createElement('b', null, game.turn === playerTurn ? t('turn.you') : t('turn.her')),
        React.createElement('span', null, game.turn === playerTurn ? t('turn.your') : thinking ? t('turn.thinking') : t('turn.hers')),
        game.inCheck() ? React.createElement('span', { className: 'dc-check-tag' }, ` ${t('status.check')}`) : null),
      React.createElement('div', { className: 'dc-captured' },
        React.createElement('span', null, `${t('captured.you')} ${capturer.you.length} : ${capturer.her.length} ${t('captured.her')}`))),
    React.createElement('div', { className: 'dc-actions' },
      React.createElement('button', { type: 'button', className: 'dc-btn gold', onClick: () => setConfirm('new') }, t('btn.new')),
      React.createElement('button', { type: 'button', className: 'dc-btn', disabled: thinking || over || drawPending || !game.history.length, onClick: undo }, t('btn.undo')),
      React.createElement('button', { type: 'button', className: 'dc-btn', disabled: over, onClick: () => setConfirm('resign') }, t('btn.resign')),
      React.createElement('button', { type: 'button', className: 'dc-btn', disabled: over || thinking || drawPending, onClick: () => setConfirm('draw') }, t('btn.draw'))),
    React.createElement('div', { className: 'dc-moves', onClick: () => setMenu('moves'), role: 'button', tabIndex: 0 },
      React.createElement('span', { className: 'dc-moves-label' }, t('moves.title')),
      React.createElement('span', { className: 'dc-moves-text' },
        recentPairs.length
          ? recentPairs.map((pair) => `${pair.n}. ${pair.white} ${pair.black}`).join('   ')
          : t('moves.empty')),
      React.createElement('span', { className: 'dc-moves-now' }, currentMoveText),
      React.createElement('span', { className: 'dc-moves-more' }, '›')),
    React.createElement('div', { className: 'dc-foot' },
      React.createElement('span', null, `${t('set.difficulty')} ${t(`diff.${settings.difficulty}`)} · ${LEVELS[settings.difficulty]?.rating || ''} · v${BUILD_VERSION}`),
      React.createElement('span', null, t('set.stats.value')
        .replace('{wins}', stats.wins)
        .replace('{losses}', stats.losses)
        .replace('{draws}', stats.draws))),
    modal === 'confirm'
      ? React.createElement(Modal, { key: 'confirm', className: 'dc-overlay', style: { zIndex: 35 }, label: confirmMeta.title, onClose: () => setConfirm(null) },
        React.createElement('div', { className: 'dc-sheet-body' },
          React.createElement('div', { className: 'dc-confirm-wrap' },
            React.createElement('div', { className: `dc-confirm-card ${confirmMeta.tone}` },
              React.createElement('div', { className: 'dc-confirm-mark' }, confirmMeta.mark),
              React.createElement('div', { className: 'dc-confirm-copy' },
                React.createElement('div', { className: 'dc-confirm-title' }, confirmMeta.title),
                React.createElement('div', { className: 'dc-confirm-desc' }, confirmMeta.desc),
                React.createElement('div', { className: 'dc-confirm-note' }, confirmMeta.note))))),
        React.createElement('div', { className: 'dc-overlay-actions' },
          React.createElement('button', { type: 'button', className: 'dc-btn', onClick: () => setConfirm(null) }, t('btn.cancel')),
          React.createElement('button', {
            type: 'button',
            className: confirmMeta.tone === 'resign' ? 'dc-btn red' : 'dc-btn gold',
            onClick: confirmMeta.action,
          }, confirmMeta.button)))
      : null,
    modal === 'incoming'
      ? React.createElement(Modal, { key: 'incoming', className: 'dc-overlay', style: { zIndex: 36 }, label: t('draw.incomingTitle'), onClose: declineIncomingDraw },
        React.createElement('div', { className: 'dc-sheet-body' },
          React.createElement('div', { className: 'dc-confirm-wrap' },
            React.createElement('div', { className: 'dc-confirm-card draw' },
              React.createElement('div', { className: 'dc-confirm-mark' }, '和'),
              React.createElement('div', { className: 'dc-confirm-copy' },
                React.createElement('div', { className: 'dc-confirm-title' }, t('draw.incomingTitle')),
                React.createElement('div', { className: 'dc-confirm-desc' }, t('draw.incomingDesc')),
                React.createElement('div', { className: 'dc-confirm-note' }, t('draw.incomingNote')))))),
        React.createElement('div', { className: 'dc-overlay-actions' },
          React.createElement('button', { type: 'button', className: 'dc-btn', onClick: declineIncomingDraw }, t('btn.declineDraw')),
          React.createElement('button', { type: 'button', className: 'dc-btn gold', onClick: acceptIncomingDraw }, t('btn.acceptDraw'))))
      : null,
    modal === 'result'
      ? React.createElement(Modal, { key: 'result', className: 'dc-result', label: t('result.kicker') },
        React.createElement('div', { className: 'dc-result-sheet' },
          React.createElement('div', { className: 'dc-result-kicker' }, t('result.kicker')),
          React.createElement('div', { className: 'dc-result-title' }, resultTitle),
          React.createElement('div', { className: 'dc-result-sub' }, speech),
          React.createElement('div', { className: 'dc-result-meta' },
            `${t('result.moves').replace('{n}', Math.ceil(game.history.length / 2))} · ${t('set.stats.value')
              .replace('{wins}', stats.wins).replace('{losses}', stats.losses).replace('{draws}', stats.draws)}`),
          React.createElement('div', { className: 'dc-result-section' },
            React.createElement('div', { className: 'dc-result-section-title' }, t('result.settings')),
            React.createElement('div', { className: 'dc-result-diff' },
              LEVEL_ORDER.map((id) => React.createElement('button', {
                key: id,
                type: 'button',
                className: settings.difficulty === id ? 'on' : '',
                onClick: () => changeDifficulty(id),
                title: `${t(`diff.${id}`)} · ${LEVELS[id].rating}`,
              }, t(`diff.${id}`)))),
            React.createElement('div', { className: 'dc-result-row' },
              React.createElement('span', { className: 'dc-result-row-label' }, t('set.side')),
              React.createElement('div', { className: 'dc-result-seg' },
                ['white', 'black'].map((side) => React.createElement('button', {
                  key: side,
                  type: 'button',
                  className: settings.playerColor === side ? 'on' : '',
                  onClick: () => setSettings((value) => ({ ...value, playerColor: side, flip: side === 'black' })),
                }, t(`side.${side}`))))),
            React.createElement('div', { className: 'dc-result-row' },
              React.createElement('span', { className: 'dc-result-row-label' }, t('set.sound')),
              React.createElement('button', {
                type: 'button',
                className: `dc-btn${settings.sound ? ' gold' : ''}`,
                onClick: toggleSound,
              }, settings.sound ? 'ON' : 'OFF')),
            React.createElement('div', { className: 'dc-result-row' },
              React.createElement('span', { className: 'dc-result-row-label' }, t('set.banter')),
              React.createElement('div', { className: 'dc-result-seg' },
                ['quiet', 'normal', 'chatty'].map((mode) => React.createElement('button', {
                  key: mode,
                  type: 'button',
                  className: settings.banter === mode ? 'on' : '',
                  onClick: () => setSettings((value) => ({ ...value, banter: mode })),
                }, t(`banter.${mode}`)))))),
          React.createElement('div', { className: 'dc-result-actions' },
            React.createElement('button', { type: 'button', className: 'dc-btn gold', onClick: startNew }, t('btn.rematch')),
            React.createElement('button', { type: 'button', className: 'dc-btn', onClick: () => setMenu('moves') }, t('btn.review')))))
      : null,
    modal === 'promotion'
      ? React.createElement(Modal, { key: 'promotion', className: 'dc-promo', label: t('promo.title'), onClose: () => { setPendingPromo(null); setSelected(null); } },
        React.createElement('div', { className: 'dc-promo-card' },
          React.createElement('div', { className: 'dc-promo-title' }, t('promo.title')),
          React.createElement('div', { className: 'dc-promo-grid' },
            [['q', 5], ['r', 4], ['b', 3], ['n', 2]].map(([key, code]) => React.createElement('button', {
              key,
              type: 'button',
              onClick: () => choosePromotion(code),
            },
            React.createElement('img', { src: ASSETS.pieces[`${gameColor === 'white' ? 'w' : 'b'}-${key}`], alt: '' }),
            React.createElement('span', null, t(`promo.${key}`)))))))
      : null,
    modal === 'menu' && menu === 'settings'
      ? React.createElement(Modal, { key: 'settings', className: 'dc-overlay', label: t('set.title'), onClose: () => setMenu(null) },
        React.createElement('div', { className: 'dc-sheet-head' },
          React.createElement('div', { className: 'dc-sheet-title' }, t('set.title')),
          React.createElement('button', { type: 'button', className: 'dc-icon-btn', style: { marginLeft: 'auto' }, onClick: () => setMenu(null) }, '×')),
        React.createElement('div', { className: 'dc-sheet-body' },
          React.createElement('div', { className: 'dc-row' },
            React.createElement('span', { className: 'dc-row-label' }, t('set.difficulty')),
            React.createElement('div', { className: 'dc-seg' },
              LEVEL_ORDER.map((level) => React.createElement('button', {
                key: level,
                type: 'button',
                className: settings.difficulty === level ? 'on' : '',
                onClick: () => changeDifficulty(level),
                title: `${t(`diff.${level}`)} · ${LEVELS[level].rating}`,
              }, t(`diff.${level}`))))),
          React.createElement('div', { className: 'dc-row' },
            React.createElement('span', { className: 'dc-row-label' }, t('set.side')),
            React.createElement('div', { className: 'dc-seg' },
              ['white', 'black'].map((side) => React.createElement('button', {
                key: side,
                type: 'button',
                className: settings.playerColor === side ? 'on' : '',
                onClick: () => setSettings((value) => ({ ...value, playerColor: side, flip: side === 'black' })),
              }, t(`side.${side}`))))),
          React.createElement('div', { className: 'dc-hint' }, t('set.sideHint')),
          React.createElement('div', { className: 'dc-row' },
            React.createElement('span', { className: 'dc-row-label' }, t('set.banter')),
            React.createElement('div', { className: 'dc-seg' },
              ['quiet', 'normal', 'chatty'].map((mode) => React.createElement('button', {
                key: mode,
                type: 'button',
                className: settings.banter === mode ? 'on' : '',
                onClick: () => setSettings((value) => ({ ...value, banter: mode })),
              }, t(`banter.${mode}`))))),
          React.createElement('div', { className: 'dc-row' },
            React.createElement('span', { className: 'dc-row-label' }, t('set.sound')),
            React.createElement('button', {
              type: 'button',
              className: `dc-btn${settings.sound ? ' gold' : ''}`,
              onClick: () => setSettings((value) => ({ ...value, sound: !value.sound })),
            }, settings.sound ? 'ON' : 'OFF')),
          React.createElement('div', { className: 'dc-row' },
            React.createElement('span', { className: 'dc-row-label' }, t('set.flip')),
            React.createElement('button', {
              type: 'button',
              className: `dc-btn${settings.flip ? ' gold' : ''}`,
              onClick: () => setSettings((value) => ({ ...value, flip: !value.flip })),
            }, settings.flip ? 'ON' : 'OFF')),
          React.createElement('div', { className: 'dc-row' },
            React.createElement('span', { className: 'dc-row-label' }, t('set.hints')),
            React.createElement('button', {
              type: 'button',
              className: `dc-btn${settings.hints ? ' gold' : ''}`,
              onClick: () => setSettings((value) => ({ ...value, hints: !value.hints })),
            }, settings.hints ? 'ON' : 'OFF')),
          React.createElement('div', { className: 'dc-row' },
            React.createElement('span', { className: 'dc-row-label' }, t('set.stats')),
            React.createElement('span', null, t('set.stats.value').replace('{wins}', stats.wins).replace('{losses}', stats.losses).replace('{draws}', stats.draws))),
          React.createElement('div', { className: 'dc-hint' }, t('set.streak').replace('{n}', stats.streak)),
          React.createElement('div', { className: 'dc-row' },
            React.createElement('span', { className: 'dc-row-label' }, t('btn.reset')),
            React.createElement('button', {
              type: 'button',
              className: 'dc-btn',
              onClick: () => { const empty = { wins: 0, losses: 0, draws: 0, streak: 0, best: 0 }; setStats(empty); writeJSON(STATS_KEY, empty); },
            }, t('btn.reset')))))
      : null,
    modal === 'menu' && menu === 'moves'
      ? React.createElement(Modal, { key: 'moves', className: 'dc-overlay', label: t('moves.title'), onClose: () => setMenu(null) },
        React.createElement('div', { className: 'dc-sheet-head' },
          React.createElement('div', { className: 'dc-sheet-title' }, t('moves.title')),
          React.createElement('button', { type: 'button', className: 'dc-icon-btn', style: { marginLeft: 'auto' }, onClick: () => setMenu(null) }, '×')),
        React.createElement('div', { className: 'dc-sheet-body' },
          movePairs.length
            ? movePairs.map((pair) => React.createElement('div', { key: pair.n, className: 'dc-hint' }, `${pair.n}. ${pair.white}  ${pair.black}`))
            : React.createElement('div', { className: 'dc-hint' }, t('moves.empty'))))
      : null,
    modal === 'menu' && menu === 'log'
      ? React.createElement(Modal, { key: 'log', className: 'dc-log', label: t('chat.title'), onClose: () => setMenu(null) },
        React.createElement('div', { className: 'dc-sheet-head' },
          React.createElement('div', { className: 'dc-sheet-title' }, t('chat.title')),
          React.createElement('button', { type: 'button', className: 'dc-icon-btn', style: { marginLeft: 'auto' }, onClick: () => setMenu(null) }, '×')),
        React.createElement('div', { className: 'dc-log-list' },
          log.length
            ? log.map((item, index) => React.createElement('div', { key: index, className: `dc-log-item ${item.who}` }, item.text))
            : React.createElement('div', { className: 'dc-hint' }, '……')))
      : null,
    toast ? React.createElement('div', { className: 'dc-toast' }, toast) : null);
}

