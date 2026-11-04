/** Dependency-free hook/timer harness for event sequencing, not visual layout. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function fakeClock() {
  let time = 0, id = 0;
  const timers = new Map();
  const clock = {
    now: () => time,
    schedule: (fn, delay = 0) => { timers.set(++id, { at: time + delay, fn }); return id; },
    cancel: (key) => timers.delete(key),
    pending: () => timers.size,
    elapse: (ms) => { time += ms; },
    advance(ms, after = () => {}) {
      const end = time + ms;
      for (let guard = 0; guard < 10000; guard++) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) { time = end; return; }
        time = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
        after();
      }
      throw new Error('timer loop');
    },
  };
  return clock;
}

export function panelHarness(saved = {}, random = 0.5) {
  const clock = fakeClock();
  let hooks = [], cursor = 0, dirty = true, effects = [], component, props, tree;
  const store = new Map(Object.entries(saved).map(([k, v]) => [k, JSON.stringify(v)]));
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter((x) => x != null && x !== false) }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks[index], (next) => {
        const value = typeof next === 'function' ? next(hooks[index]) : next;
        if (!Object.is(hooks[index], value)) { hooks[index] = value; dirty = true; }
      }];
    },
    useReducer(reducer, initial) {
      const [value, setter] = React.useState(initial);
      return [value, (arg) => setter((old) => reducer(old, arg))];
    },
    useRef(initial) { const index = cursor++; return hooks[index] ||= { current: initial }; },
    useMemo(fn, deps) {
      const index = cursor++;
      if (!same(hooks[index]?.deps, deps)) hooks[index] = { value: fn(), deps };
      return hooks[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (same(hooks[index]?.deps, deps)) return;
      const old = hooks[index];
      hooks[index] = { deps, cleanup: old?.cleanup };
      effects.push(() => { old?.cleanup?.(); hooks[index].cleanup = fn(); });
    },
  };
  const intervals = new Map();
  const ctx = vm.createContext({
    React, console, performance,
    Date: class extends Date { static now() { return clock.now(); } },
    Math: Object.assign(Object.create(Math), { random: () => random }),
    setTimeout: clock.schedule, clearTimeout: clock.cancel,
    setInterval: (fn, ms) => {
      const key = {};
      const repeat = () => { fn(); if (intervals.has(key)) intervals.set(key, clock.schedule(repeat, ms)); };
      intervals.set(key, clock.schedule(repeat, ms));
      return key;
    },
    clearInterval: (key) => { clock.cancel(intervals.get(key)); intervals.delete(key); },
    requestAnimationFrame: (fn) => clock.schedule(fn, 16),
    localStorage: { getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, v) },
    document: { hidden: false }, window: {}, ASSETS: { pieces: {}, portraits: {} },
  });
  const source = ['engine.js', 'ai.js', 'persona.js', 'dialogue.js', 'panel.js'].map((file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8').replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '')).join('\n');
  vm.runInContext(source + '\nglobalThis.components = { DeepChessPanel, Typewriter };', ctx);
  // Deterministic legal reply keeps lifecycle tests independent of search strength.
  vm.runInContext('chooseMove = (position) => ({ move: position.generateLegal()[0] });', ctx);
  component = ctx.components.DeepChessPanel;
  props = { t: (key) => key, locale: 'zh' };
  function flush() {
    for (let guard = 0; dirty; guard++) {
      if (guard > 30) throw new Error('render loop');
      dirty = false; cursor = 0; effects = [];
      tree = component(props);
      for (const effect of effects) effect();
    }
    return tree;
  }
  function nodes(node = tree) {
    return typeof node === 'object' && node ? [node, ...node.children.flatMap((child) => nodes(child))] : [];
  }
  return {
    clock, ctx, store, flush, nodes,
    mount(name = 'DeepChessPanel', nextProps = props) { component = ctx.components[name]; props = nextProps; dirty = true; return flush(); },
    advance(ms) { clock.advance(ms, flush); flush(); },
    unmount() { for (const hook of hooks) hook?.cleanup?.(); },
    get tree() { return tree; },
  };
}
