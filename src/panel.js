/**
 * panel.js — the right-sidebar game panel.
 *
 * Everything is client-side: rules engine, AI, dialogue, save file and the
 * pixel UI. The Host half is intentionally empty.
 */

const PIECE_KEY = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
const QUEEN_TYPE = 5;
const SAVE_KEY = 'deepchess.save.v1';
const SETTINGS_KEY = 'deepchess.settings.v2';
const STATS_KEY = 'deepchess.stats.v1';
const KEY_EVENTS = new Set([
  'start', 'win', 'lose', 'draw', 'resign', 'undo', 'playerBlunder', 'herBlunder',
  'queenCapture', 'promotion', 'playerCheck', 'herCheck',
]);

const DEFAULT_SETTINGS = {
  difficulty: 'hard',
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

function loadSettings() {
  const value = readJSON(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...(value && typeof value === 'object' ? value : {}) };
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

function moveCtx(game, move, san) {
  return {
    move: san || '',
    pieceKey: PIECE_KEY[typeOf(move.piece)] || 'p',
    capturedKey: move.captured ? PIECE_KEY[typeOf(move.captured)] : '',
    n: Math.floor(game.history.length / 2) + 1,
  };
}

function classifyMove(game, move, san, delta, byPlayer) {
  if (move.promotion) return 'promotion';
  if (move.flags & 4) return 'castle';
  if (move.flags & 2) return 'enPassant';
  if (san.includes('+') || san.includes('#')) return byPlayer ? 'playerCheck' : 'herCheck';
  if (move.captured) {
    if (typeOf(move.captured) === QUEEN_TYPE) return 'queenCapture';
    return byPlayer ? 'playerCapture' : 'herCapture';
  }
  if (delta > 140) return byPlayer ? 'playerBlunder' : 'herBlunder';
  if (delta < -140) return byPlayer ? 'playerGood' : 'herGood';
  return byPlayer ? 'playerQuiet' : 'herQuiet';
}

function Typewriter({ text, onDone }) {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    setShown(0);
    let index = 0;
    let timer = null;
    const step = () => {
      index += 1;
      setShown(index);
      if (index < text.length) {
        const ch = text[index - 1];
    const delay = /[，。！？…,.!?]/.test(ch) ? 130 : 22;
        timer = setTimeout(step, delay);
      } else if (onDone) {
        onDone();
      }
    };
    timer = setTimeout(step, 60);
    return () => clearTimeout(timer);
  }, [text]);
  const done = shown >= text.length;
  return React.createElement(
    'div',
    { className: 'dc-speech', onClick: () => setShown(text.length) },
    text.slice(0, shown),
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
      React.createElement('rect', { x: 7, y: 7, width: 2, height: 2, fill: '#121a2a' }));
  }
  if (name === 'chat') {
    return React.createElement('svg', common,
      React.createElement('path', { d: 'M2 2h12v9H7l-3 3v-3H2V2zm2 2v5h8V4H4z', fill: 'currentColor' }));
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
  React.createElement('rect', { x: 7, y: 9, width: 2, height: 2, fill: '#121a2a' }),
  React.createElement('rect', { x: 5, y: 18, width: 10, height: 2, fill: 'currentColor' }));
}

function Board({ game, selected, onSquare, settings, hints, disabled, playerColor, checkSquare, lastMove, boardRef, anim, boardShake }) {
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
        onClick: () => onSquare(sq),
        disabled,
        tabIndex: 0,
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
      color: save?.playerColor === 'black' ? 'black' : 'white',
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
  const [selected, setSelected] = React.useState(null);
  const [pendingPromo, setPendingPromo] = React.useState(null);
  const [menu, setMenu] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);
  const [toast, setToast] = React.useState('');
  const [undoCount, setUndoCount] = React.useState(0);
  const [log, setLog] = React.useState([]);
  const [shaking, setShaking] = React.useState(false);
  const [anim, setAnim] = React.useState(null);
  const [boardShake, setBoardShake] = React.useState(false);
  const [drawPending, setDrawPending] = React.useState(false);
  const boardRef = React.useRef(null);
  const animTimer = React.useRef(null);
  const drawTimer = React.useRef(null);

  const banterRef = React.useRef(null);
  if (!banterRef.current) banterRef.current = new Banter(locale);
  const settledRef = React.useRef(false);
  const aiRef = React.useRef(false);
  const startedRef = React.useRef(false);
  const toastTimer = React.useRef(null);
  const shakeTimer = React.useRef(null);
  const audioRef = React.useRef(null);
  const factsRef = React.useRef({ blunders: 0, undos: 0 });
  const specialRef = React.useRef(new Set());
  const turnStartRef = React.useRef(Date.now());
  const slowSaidRef = React.useRef(false);
  const moodHistoryRef = React.useRef([]);
  const lastActivityRef = React.useRef(Date.now());
  const idleSaidRef = React.useRef(false);

  const playerColor = gameColor;
  const herColor = playerColor === 'white' ? 'black' : 'white';
  const playerTurn = playerColor === 'white' ? 0 : 1;
  const outcome = React.useMemo(() => manual || game.status(), [tick, manual]);
  const over = outcome.state !== 'playing';
  const lastMove = game.lastMove?.move || null;
  const checkSquare = game.inCheck() ? game.position.kings[game.turn] : -1;

  React.useEffect(() => {
    banterRef.current.setLocale(locale);
  }, [locale]);

  function showToast(text) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1600);
  }

  function saySpecial(key, ctx, mood) {
    if (specialRef.current.has(key)) return false;
    specialRef.current.add(key);
    say(key, ctx, mood, true);
    return true;
  }

  function specialFor(move, san, before, after) {
    const sign = playerColor === 'white' ? 1 : -1;
    const beforeP = before * sign;
    const afterP = after * sign;
    let captures = 0;
    let checks = 0;
    for (const entry of game.history) {
      if (entry.move.captured) captures += 1;
      if (/[+#]/.test(entry.san)) checks += 1;
    }
    let queens = 0;
    let pieces = 0;
    for (let sq = 0; sq < 128; sq += 1) {
      if ((sq & 0x88) !== 0) continue;
      const piece = game.position.at(sq);
      if (!piece) continue;
      const type = typeOf(piece);
      if (type === QUEEN_TYPE) queens += 1;
      if (type !== 6) pieces += 1;
    }
    const used = specialRef.current;
    if (move.promotion && typeOf(move.promotion) !== QUEEN_TYPE && !used.has('underpromotion')) {
      return { key: 'underpromotion', mood: 'surprised' };
    }
    if (captures === 1 && move.captured && !used.has('firstCapture')) {
      return { key: 'firstCapture', mood: 'surprised' };
    }
    if (checks === 1 && /[+#]/.test(san) && !used.has('firstCheck')) {
      return { key: 'firstCheck', mood: 'panic' };
    }
    if (queens === 0 && !used.has('queenTrade')) return { key: 'queenTrade', mood: 'surprised' };
    if (((beforeP < -250 && afterP > 250) || (beforeP > 250 && afterP < -250)) && !used.has('comeback')) {
      return { key: 'comeback', mood: 'panic' };
    }
    if (factsRef.current.blunders === 3 && !used.has('blunderStreak')) {
      return { key: 'blunderStreak', mood: 'laugh' };
    }
    if (game.history.length >= 60 && !used.has('longGameSpecial')) {
      return { key: 'longGameSpecial', mood: 'tired' };
    }
    if (pieces <= 6 && !used.has('lowMaterialSpecial')) {
      return { key: 'lowMaterialSpecial', mood: 'determined' };
    }
    return null;
  }

  function poke() {
    if (pendingPromo || menu) return;
    let nextMood = mood;
    if (!['angry', 'annoyed'].includes(mood) && Math.random() < 0.16) nextMood = 'love';
    else if (mood === 'calm' || mood === 'smile') nextMood = 'pout';
    else if (mood === 'thinking') nextMood = 'annoyed';
    rememberMood(nextMood);
    const line = banterRef.current.pick('poke', {}, nextMood);
    setSpeech(line);
    setSpeechKey((key) => key + 1);
    pushLog('her', line);
    if (nextMood === 'annoyed' || nextMood === 'angry' || nextMood === 'panic') triggerShake();
  }

  function changeDifficulty(id) {
    if (id === settings.difficulty) return;
    setSettings((value) => ({ ...value, difficulty: id }));
    const lines = {
      easy: '行，我摸鱼。',
      normal: '好，我放点水。',
      hard: '行，我认真了。',
      whale: '鲸鱼模式。你确定？',
      master: '深渊模式……输了别哭。',
    };
    const line = lines[id];
    rememberMood(id === 'master' || id === 'whale' ? 'determined' : 'smug');
    setSpeech(line);
    setSpeechKey((key) => key + 1);
    pushLog('her', line);
    showToast(`${t('set.difficulty')} · ${t(`diff.${id}`)}`);
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
      return settings.flip ? [7 - file, rank] : [file, 7 - rank];
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
      savedAt: Date.now(),
    });
  }

  function playSound(kind) {
    if (!settings.sound) return;
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
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      /* audio is optional */
    }
  }

  function pushLog(who, text) {
    setLog((items) => [...items.slice(-79), { who, text }]);
  }

  function say(event, ctx, nextMood, force = false) {
    const flavour = nextMood || chooseMood({
      status: outcome,
      evalWhite: evaluateWhite(game.position),
      event,
      playerColor,
      inCheck: game.inCheck(),
      herTurn: game.turn !== playerTurn,
      moveCount: game.history.length,
      recentMoods: moodHistoryRef.current,
    });
    rememberMood(flavour);
    const probability = settings.banter === 'quiet' ? 0.1 : settings.banter === 'chatty' ? 0.92 : 0.52;
    if (!force && !KEY_EVENTS.has(event) && Math.random() > probability) return;
    let text = banterRef.current.pick(event, ctx, flavour);
    if (event === 'start') {
      if (settings.difficulty === 'master') {
        text = '深渊模式。输了别哭。';
        rememberMood('determined');
      } else if (settings.difficulty === 'whale') {
        text = '鲸鱼模式。你确定？';
        rememberMood('determined');
      }
    }
    if (event === 'playerBlunder' && factsRef.current.blunders >= 2 && Math.random() < 0.18) {
      text = banterRef.current.pick('callback', ctx, flavour);
    }
    setSpeech(text);
    setSpeechKey((key) => key + 1);
    pushLog('her', text);
    if (flavour === 'angry' || flavour === 'panic' || flavour === 'annoyed') triggerShake();
  }

  function finish(status, source) {
    if (settledRef.current) return;
    settledRef.current = true;
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
    if (source === 'resign') {
      const line = banterRef.current.pick('resign', {}, 'smug');
      rememberMood('smug');
      setSpeech(line);
      pushLog('her', line);
      playSound('win');
      return;
    }
    if (source === 'agreement') {
      const line = banterRef.current.pick('draw', {}, 'calm');
      rememberMood('calm');
      setSpeech(line);
      pushLog('her', line);
      return;
    }
    let specialKey = null;
    let specialMood = 'calm';
    if (status.state === 'checkmate') {
      specialKey = playerWon ? 'checkmateLose' : 'checkmateWin';
      specialMood = playerWon ? 'cry' : 'smug';
    } else if (status.reason === 'repetition') {
      specialKey = 'threefold';
    } else if (status.reason === 'fifty-move') {
      specialKey = 'fiftyMove';
    }
    if (specialKey && !specialRef.current.has(specialKey)) {
      specialRef.current.add(specialKey);
      const line = banterRef.current.pick(specialKey, {}, specialMood);
      rememberMood(specialMood);
      setSpeech(line);
      pushLog('her', line);
      playSound(playerWon ? 'lose' : 'win');
      return;
    }
    if (draw) {
      const line = banterRef.current.pick('draw', {}, 'calm');
      rememberMood('calm');
      setSpeech(line);
      pushLog('her', line);
      playSound('move');
    } else if (playerWon) {
      const line = banterRef.current.pick('lose', {}, stats.streak > 2 ? 'cry' : 'sad');
      rememberMood(stats.streak > 2 ? 'cry' : 'sad');
      setSpeech(line);
      pushLog('her', line);
      playSound('lose');
    } else {
      const winMood = Math.random() < 0.3 ? 'love' : Math.random() < 0.5 ? 'wink' : 'smug';
      const line = banterRef.current.pick('win', {}, winMood);
      rememberMood(winMood);
      setSpeech(line);
      pushLog('her', line);
      playSound('win');
    }
  }

  function afterPlayerMove(move, result, before) {
    const after = evaluateWhite(game.position);
    const delta = (before - after) * (playerColor === 'white' ? 1 : -1);
    const event = classifyMove(game, move, result.san, delta, true);
    const ctx = moveCtx(game, move, result.san);
    lastActivityRef.current = Date.now();
    idleSaidRef.current = false;
    animateMove(move, Boolean(move.captured), /[+#]/.test(result.san));
    bump();
    persist();
    playSound(move.captured ? 'capture' : 'move');
    if (result.status.state !== 'playing') {
      finish(result.status, 'engine');
      return;
    }
    setSelected(null);
    if (event === 'playerBlunder') factsRef.current.blunders += 1;
    const special = specialFor(move, result.san, before, after);
    if (!special || !saySpecial(special.key, { ...ctx, blunders: factsRef.current.blunders, undos: factsRef.current.undos }, special.mood)) {
      say(event, { ...ctx, blunders: factsRef.current.blunders, undos: factsRef.current.undos });
    }
    if (event === 'playerBlunder') {
      rememberMood('laugh');
      triggerShake();
    }
  }

  function playMove(from, to, promotion = 0) {
    if (over || thinking) return;
    const before = evaluateWhite(game.position);
    const result = game.playUci(from, to, promotion);
    if (!result) return;
    afterPlayerMove(game.lastMove.move, result, before);
  }

  function onSquare(sq) {
    if (over || thinking) return;
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
    if (thinking || over) return;
    if (!game.history.length) {
      showToast(t('toast.noUndo'));
      return;
    }
    game.undo();
    if (game.history.length && game.turn !== playerTurn) game.undo();
    setSelected(null);
    setUndoCount((n) => n + 1);
    factsRef.current.undos += 1;
    lastActivityRef.current = Date.now();
    idleSaidRef.current = false;
    bump();
    persist();
    playSound('move');
    say('undo', { undos: factsRef.current.undos, n: Math.floor(game.history.length / 2) + 1 }, 'annoyed', true);
  }

  function startNew() {
    if (drawTimer.current) clearTimeout(drawTimer.current);
    setDrawPending(false);
    bootRef.current.game = new ChessGame();
    aiRef.current = false;
    settledRef.current = false;
    factsRef.current = { blunders: 0, undos: 0 };
    specialRef.current = new Set();
    setManual(null);
    setGameColor(settings.playerColor);
    setSelected(null);
    setPendingPromo(null);
    setUndoCount(0);
    setThinking(false);
    lastActivityRef.current = Date.now();
    idleSaidRef.current = false;
    moodHistoryRef.current = [];
    rememberMood(settings.difficulty === 'master' || settings.difficulty === 'whale' ? 'determined' : 'smile');
    setSpeech('');
    writeJSON(SAVE_KEY, { v: 1, ucis: [], manual: null, playerColor: settings.playerColor, savedAt: Date.now() });
    bump();
    const startLine = settings.difficulty === 'master'
      ? '深渊模式。输了别哭。'
      : settings.difficulty === 'whale'
        ? '鲸鱼模式。你确定？'
        : banterRef.current.pick('start', {}, 'smile');
    setSpeech(startLine);
    setSpeechKey((key) => key + 1);
    pushLog('her', '新的一局。');
    showToast(t('toast.new'));
  }

  function resign() {
    setConfirm(null);
    finish({ state: 'resign', winner: herColor, reason: 'resign' }, 'resign');
  }

  function resolveDraw() {
    if (game.status().state !== 'playing') {
      setDrawPending(false);
      return;
    }
    const perspective = (evaluateWhite(game.position)) * (playerColor === 'white' ? 1 : -1);
    const accept = perspective < -280 ? Math.random() < 0.7 : Math.abs(perspective) < 80 ? Math.random() < 0.35 : false;
    if (accept) {
      finish({ state: 'draw', winner: null, reason: 'agreement' }, 'agreement');
    } else {
      const mood = perspective > 120 ? 'smug' : 'pout';
      rememberMood(mood);
      const line = banterRef.current.pick('drawRefuse', {}, mood);
      setSpeech(line);
      setSpeechKey((key) => key + 1);
      pushLog('her', line);
      showToast(t('toast.drawRefused'));
    }
  }

  function offerDraw() {
    setConfirm(null);
    if (over || thinking || drawPending) return;
    setDrawPending(true);
    rememberMood('thinking');
    setSpeech(t('draw.thinking'));
    setSpeechKey((key) => key + 1);
    if (drawTimer.current) clearTimeout(drawTimer.current);
    drawTimer.current = setTimeout(() => {
      setDrawPending(false);
      resolveDraw();
    }, 760);
  }

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (boot.save?.manual) {
      settledRef.current = true;
      const won = boot.save.manual.winner === gameColor;
      const event = !boot.save.manual.winner ? 'draw' : won ? 'lose' : 'win';
      rememberMood(event === 'draw' ? 'calm' : won ? 'sad' : 'smug');
      setSpeech(banterRef.current.pick(event, {}, event === 'win' ? 'smug' : 'calm'));
      persist(boot.save.manual, gameColor);
      return;
    }
    if (game.history.length) {
      rememberMood('calm');
      setSpeech('接着下？');
      pushLog('her', '接着下？');
    } else {
      setSpeech(banterRef.current.pick('start', {}, 'smile'));
      rememberMood('smile');
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
    rememberMood('thinking');
    if (Math.random() < 0.24) say('herThink', {}, 'thinking');
    const timer = setTimeout(() => {
      if (!aiRef.current) return;
      try {
        const before = evaluateWhite(game.position);
        const pick = chooseMove(game.position, settings.difficulty);
        if (!pick || !pick.move) {
          setThinking(false);
          aiRef.current = false;
          return;
        }
        const move = pick.move;
        const result = game.play(move);
        const after = evaluateWhite(game.position);
        const delta = (after - before) * (playerColor === 'white' ? 1 : -1);
        lastActivityRef.current = Date.now();
        idleSaidRef.current = false;
        animateMove(move, Boolean(move.captured), /[+#]/.test(result.san));
        bump();
        persist();
        setThinking(false);
        aiRef.current = false;
        playSound(move.captured ? 'capture' : 'move');
        if (result.status.state !== 'playing') {
          finish(result.status, 'engine');
          return;
        }
        const event = classifyMove(game, move, result.san, delta, false);
        const ctx = moveCtx(game, move, result.san);
        const special = specialFor(move, result.san, before, after);
        if (!special || !saySpecial(special.key, ctx, special.mood)) say(event, ctx);
        if (event === 'herBlunder') triggerShake();
      } catch (error) {
        setThinking(false);
        aiRef.current = false;
      }
    }, 280);
    return () => {
      clearTimeout(timer);
      aiRef.current = false;
    };
  }, [tick, over, playerColor, settings.difficulty]);

  React.useEffect(() => {
    writeJSON(SETTINGS_KEY, settings);
  }, [settings]);

  React.useEffect(() => {
    turnStartRef.current = Date.now();
    slowSaidRef.current = false;
  }, [tick]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (over || thinking || slowSaidRef.current) return;
      if (game.turn !== playerTurn) return;
      if (Date.now() - turnStartRef.current < 45000) return;
      slowSaidRef.current = true;
      say('playerThinkLong', {}, 'tired');
    }, 5000);
    return () => clearInterval(timer);
  }, [over, thinking, gameColor, tick]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (over || thinking || menu || idleSaidRef.current) return;
      if (game.turn !== playerTurn) return;
      if (Date.now() - lastActivityRef.current < 75000) return;
      idleSaidRef.current = true;
      say('idle', {}, game.history.length > 50 ? 'sleepy' : 'calm');
    }, 10000);
    return () => clearInterval(timer);
  }, [over, thinking, menu, gameColor, tick]);

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

  return React.createElement('div', { className: 'dc-root' },
    React.createElement('div', { className: 'dc-head' },
      React.createElement('div', { className: 'dc-title' }, t('tab.title')),
      React.createElement('div', { className: 'dc-title-en' }, 'DeepChess'),
      React.createElement('div', { className: 'dc-head-actions' },
        React.createElement('button', { type: 'button', className: 'dc-icon-btn', onClick: () => setMenu(menu === 'moves' ? null : 'moves'), 'aria-label': t('moves.title'), title: t('moves.title') }, React.createElement(PixelGlyph, { name: 'moves' })),
        React.createElement('button', { type: 'button', className: 'dc-icon-btn', onClick: () => setMenu(menu === 'log' ? null : 'log'), 'aria-label': t('chat.title'), title: t('chat.title') }, React.createElement(PixelGlyph, { name: 'chat' })),
        React.createElement('button', { type: 'button', className: 'dc-icon-btn', onClick: () => setMenu('settings'), 'aria-label': t('btn.settings'), title: t('btn.settings') }, React.createElement(PixelGlyph, { name: 'gear' })))),
    React.createElement('div', { className: 'dc-diffbar' },
      React.createElement('span', { className: 'dc-diffbar-label' }, t('set.difficulty')),
      LEVEL_ORDER.map((id) => React.createElement('button', {
        key: id,
        type: 'button',
        className: `dc-diff${settings.difficulty === id ? ' on' : ''}`,
        onClick: () => changeDifficulty(id),
        title: t(`diff.${id}`),
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
          React.createElement('span', { className: 'dc-mood-chip' }, moodLabel)),
        thinking
          ? React.createElement('div', { className: 'dc-typing' }, React.createElement('i'), React.createElement('i'), React.createElement('i'))
          : React.createElement(Typewriter, { key: speechKey, text: speech || '……' }))),
    React.createElement('div', { className: 'dc-board-wrap' },
      React.createElement(Board, {
        game,
        selected,
        onSquare,
        settings,
        hints: settings.hints,
        disabled: over || thinking,
        playerColor,
        checkSquare,
        lastMove,
        boardRef,
        anim,
        boardShake,
      })),
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
      React.createElement('button', { type: 'button', className: 'dc-btn', disabled: thinking || over || !game.history.length, onClick: undo }, t('btn.undo')),
      React.createElement('button', { type: 'button', className: 'dc-btn', disabled: over, onClick: () => setConfirm('resign') }, t('btn.resign')),
      React.createElement('button', { type: 'button', className: 'dc-btn', disabled: over || thinking || drawPending, onClick: () => setConfirm('draw') }, t('btn.draw'))),
    React.createElement('div', { className: 'dc-moves', onClick: () => setMenu('moves'), role: 'button', tabIndex: 0 },
      React.createElement('span', { className: 'dc-moves-label' }, t('moves.title')),
      React.createElement('span', { className: 'dc-moves-text' },
        recentPairs.length
          ? recentPairs.map((pair) => `${pair.n}. ${pair.white} ${pair.black}`).join('   ')
          : t('moves.empty')),
      React.createElement('span', { className: 'dc-moves-more' }, '›')),
    React.createElement('div', { className: 'dc-foot' },
      React.createElement('span', null, `${t('set.difficulty')} ${t(`diff.${settings.difficulty}`)}`),
      React.createElement('span', null, t('set.stats.value')
        .replace('{wins}', stats.wins)
        .replace('{losses}', stats.losses)
        .replace('{draws}', stats.draws))),
    confirm
      ? React.createElement('div', { className: 'dc-overlay', style: { zIndex: 35 } },
        React.createElement('div', { className: 'dc-sheet-body' },
          confirm === 'draw'
            ? React.createElement('div', { className: 'dc-draw-wrap' },
              React.createElement('div', { className: 'dc-draw-card' },
                React.createElement('div', { className: 'dc-draw-mark' }, '和'),
                React.createElement('div', { className: 'dc-draw-copy' },
                  React.createElement('div', { className: 'dc-draw-title' }, t('confirm.draw')),
                  React.createElement('div', { className: 'dc-draw-desc' }, t('confirm.drawNote')))))
            : React.createElement('div', { className: 'dc-row' },
              React.createElement('div', { className: 'dc-row-label' },
                confirm === 'new' ? t('confirm.new') : confirm === 'resign' ? t('confirm.resign') : t('confirm.reset')))),
        React.createElement('div', { className: 'dc-overlay-actions' },
          React.createElement('button', { type: 'button', className: 'dc-btn', onClick: () => setConfirm(null) }, t('btn.cancel')),
          React.createElement('button', {
            type: 'button',
            className: confirm === 'resign' ? 'dc-btn red' : 'dc-btn gold',
            onClick: confirm === 'new' ? () => { setConfirm(null); startNew(); } : confirm === 'resign' ? resign : offerDraw,
          }, confirm === 'draw' ? t('btn.offerDraw') : t('btn.confirm'))))
      : null,
    over && !menu
      ? React.createElement('div', { className: 'dc-result' },
        React.createElement('div', { className: 'dc-result-title' }, resultTitle),
        React.createElement('div', { className: 'dc-result-sub' }, speech),
        React.createElement('button', { type: 'button', className: 'dc-btn gold', onClick: startNew }, t('btn.rematch')))
      : null,
    pendingPromo
      ? React.createElement('div', { className: 'dc-promo' },
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
    menu === 'settings'
      ? React.createElement('div', { className: 'dc-overlay' },
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
                onClick: () => setSettings((value) => ({ ...value, difficulty: level })),
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
    menu === 'moves'
      ? React.createElement('div', { className: 'dc-overlay' },
        React.createElement('div', { className: 'dc-sheet-head' },
          React.createElement('div', { className: 'dc-sheet-title' }, t('moves.title')),
          React.createElement('button', { type: 'button', className: 'dc-icon-btn', style: { marginLeft: 'auto' }, onClick: () => setMenu(null) }, '×')),
        React.createElement('div', { className: 'dc-sheet-body' },
          movePairs.length
            ? movePairs.map((pair) => React.createElement('div', { key: pair.n, className: 'dc-hint' }, `${pair.n}. ${pair.white}  ${pair.black}`))
            : React.createElement('div', { className: 'dc-hint' }, t('moves.empty'))))
      : null,
    menu === 'log'
      ? React.createElement('div', { className: 'dc-log' },
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

