/**
 * styles.js — the panel's pixel stylesheet.
 *
 * One scoped sheet, palette exposed as CSS variables for DSH light/dark
 * themes, layout driven by flex + container queries rather than fixed
 * offsets.
 */

export function attachDeepChessStyles() {
  if (typeof document === 'undefined') return () => {};
  const old = document.querySelector('style[data-dsh-deepchess]');
  if (old) old.remove();
  const tag = document.createElement('style');
  tag.setAttribute('data-dsh-deepchess', '');
  tag.textContent = `
@font-face{
  font-family:'ArkPixel';
  src:url("${ASSETS.font}") format("woff2");
  font-weight:400;
  font-style:normal;
  font-display:swap;
}
.dc-root{
  --dc-bg:#121a2a;
  --dc-bg-deep:#0d1422;
  --dc-bg-panel:#1b2740;
  --dc-bg-hover:#24365a;
  --dc-border:#4f74ad;
  --dc-border-soft:#2c3f63;
  --dc-text:#e7eefc;
  --dc-text-dim:#9fb6d8;
  --dc-text-muted:#6f86a8;
  --dc-title:#f4e8cc;
  --dc-gold:#f0b429;
  --dc-gold-ink:#2a1c08;
  --dc-gold-border:#8a5a12;
  --dc-light-sq:#e8d8b8;
  --dc-dark-sq:#5a7fa6;
  --dc-paper:#f3e6c8;
  --dc-paper-2:#efe2c4;
  --dc-ink:#2a2433;
  --dc-ink-accent:#8a4b2a;
  --dc-danger:#d94f5c;
  --dc-board-frame:#0a101c;
  --dc-shadow:#070b14;
  --dc-bg-track:#0b1220;
  --dc-bg-log:#131d30;
  --dc-bg-log-me:#1d2c48;
  position:relative;container-type:size;height:100%;min-height:0;display:flex;flex-direction:column;
  background:var(--dc-bg);color:var(--dc-text);
  font-family:'ArkPixel','Microsoft YaHei','PingFang SC',monospace;
  font-size:12px;line-height:1.7;letter-spacing:0;
  -webkit-font-smoothing:none;text-rendering:geometricPrecision;
  overflow:hidden;user-select:none;
}
html[data-theme="light"] .dc-root,
html[data-dsh-theme="light"] .dc-root,
html[data-color-scheme="light"] .dc-root,
html.light .dc-root,
body[data-theme="light"] .dc-root,
.dc-root[data-theme="light"]{
  --dc-bg:#f5f0e6;
  --dc-bg-deep:#ebe2d2;
  --dc-bg-panel:#fffaf0;
  --dc-bg-hover:#f0e4cf;
  --dc-border:#7a5a2a;
  --dc-border-soft:#d8c6a6;
  --dc-text:#2a2433;
  --dc-text-dim:#5d5040;
  --dc-text-muted:#7b6a55;
  --dc-title:#2a2433;
  --dc-gold:#c58a1a;
  --dc-gold-ink:#2a1c08;
  --dc-gold-border:#8a5a12;
  --dc-light-sq:#f4e6c8;
  --dc-dark-sq:#8fb0d0;
  --dc-paper:#fffaf0;
  --dc-paper-2:#f5ead6;
  --dc-ink:#2a2433;
  --dc-ink-accent:#8a4b2a;
  --dc-danger:#b83b48;
  --dc-board-frame:#3a3025;
  --dc-shadow:#c9b99c;
  --dc-bg-track:#e4d8c4;
  --dc-bg-log:#f5ead6;
  --dc-bg-log-me:#e8d9c0;
}
.dc-root *{box-sizing:border-box}
.dc-root button{font-family:inherit;font-size:12px}
.dc-root img{image-rendering:pixelated}
.dc-scroll{overflow:auto;min-height:0}
.dc-search-error{padding:6px 10px;display:flex;align-items:center;gap:8px;color:var(--dc-danger);flex:0 0 auto}
.dc-search-error .dc-btn{padding:3px 8px;flex:0 0 auto}
.dc-root *::-webkit-scrollbar{width:6px;height:6px}
.dc-root *::-webkit-scrollbar-thumb{background:var(--dc-border)}
.dc-root *::-webkit-scrollbar-track{background:var(--dc-bg-track)}

.dc-head,.dc-diffbar,.dc-scene,.dc-board-wrap,.dc-status,.dc-actions,.dc-moves,.dc-foot{width:100%;max-width:560px;margin-left:auto;margin-right:auto}
.dc-head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--dc-bg-deep);border-bottom:2px solid var(--dc-border-soft);flex:0 0 auto}
.dc-title{font-size:24px;line-height:1;color:var(--dc-title);text-shadow:2px 2px 0 var(--dc-shadow)}
.dc-title-en{font-size:12px;color:var(--dc-text-dim);margin-left:2px}
.dc-head-actions{margin-left:auto;display:flex;gap:6px}
.dc-icon-btn{width:26px;height:26px;display:grid;place-items:center;background:var(--dc-bg-panel);border:2px solid var(--dc-border);color:var(--dc-text);cursor:pointer;padding:0}
.dc-icon-btn:hover{background:var(--dc-bg-hover)}
.dc-icon-btn.on{background:var(--dc-gold);color:var(--dc-gold-ink);border-color:var(--dc-gold-border)}

.dc-diffbar{display:flex;align-items:center;gap:4px;padding:5px 8px;background:var(--dc-bg-deep);border-bottom:2px solid var(--dc-border-soft);flex:0 0 auto;overflow-x:auto}
.dc-diffbar-label{color:var(--dc-text-muted);margin-right:2px;flex:0 0 auto;font-size:12px}
.dc-diff{flex:1 1 0;min-width:0;background:var(--dc-bg-panel);color:var(--dc-text);border:2px solid var(--dc-border);padding:3px 0;cursor:pointer;white-space:nowrap;font-size:12px}
.dc-diff:hover{background:var(--dc-bg-hover)}
.dc-diff.on{background:var(--dc-gold);color:var(--dc-gold-ink);border-color:var(--dc-gold-border)}
.dc-scene{display:flex;gap:8px;padding:8px;background:linear-gradient(180deg,var(--dc-bg-panel) 0%,var(--dc-bg) 100%);border-bottom:2px solid var(--dc-border-soft);flex:0 0 auto}
.dc-portrait-card{width:112px;flex:0 0 112px;background:var(--dc-paper);border:2px solid var(--dc-ink);box-shadow:3px 3px 0 var(--dc-shadow);position:relative;display:flex;flex-direction:column;cursor:pointer}
.dc-portrait-card:focus-visible{outline:2px solid var(--dc-gold);outline-offset:-2px}
.dc-portrait-stage{position:relative;height:106px;overflow:hidden;background:#ffffff;border-bottom:1px solid var(--dc-ink)}
.dc-portrait-stage:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(42,36,51,.06) 0 1px,transparent 1px 6px);pointer-events:none;z-index:1}
.dc-portrait{position:absolute;left:3px;top:3px;width:calc(100% - 6px);height:calc(100% - 3px);object-fit:contain;display:block;z-index:2;-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 86%,rgba(0,0,0,.6) 94%,transparent 100%);mask-image:linear-gradient(to bottom,#000 0%,#000 86%,rgba(0,0,0,.6) 94%,transparent 100%)}
.dc-portrait-name{font-size:12px;text-align:center;color:var(--dc-ink);padding:3px 0;border-top:1px solid var(--dc-ink);display:flex;flex-direction:column;line-height:1.2;white-space:nowrap;overflow:hidden;background:var(--dc-paper)}
.dc-portrait-name span:first-child{color:var(--dc-ink)}
.dc-portrait-name span:last-child{color:var(--dc-ink-accent)}
.dc-bubble{flex:1;min-width:0;display:flex;flex-direction:column;position:relative;background:var(--dc-paper);color:var(--dc-ink);border:2px solid var(--dc-ink);box-shadow:3px 3px 0 var(--dc-shadow);padding:7px 9px 8px;min-height:106px}
.dc-bubble:before{content:'';position:absolute;left:-8px;top:36px;width:8px;height:8px;background:var(--dc-paper);border-left:2px solid var(--dc-ink);border-bottom:2px solid var(--dc-ink);transform:rotate(45deg)}
.dc-bubble-name{font-size:12px;color:var(--dc-ink-accent);display:flex;align-items:center;gap:6px;flex:0 0 auto}
.dc-mood-chip{font-size:12px;padding:0 5px;background:var(--dc-ink);color:var(--dc-paper);line-height:16px}
.dc-speech{flex:1;min-height:0;overflow:auto;margin-top:3px;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.75;cursor:pointer}
.dc-speech .dc-caret{display:inline-block;width:6px;height:12px;background:var(--dc-ink);vertical-align:-2px;animation:dc-blink .8s steps(1) infinite}
@keyframes dc-blink{50%{opacity:0}}
.dc-bubble.dc-say{animation:dc-pop .18s steps(2)}
@keyframes dc-pop{from{transform:translateY(2px)}to{transform:translateY(0)}}
.dc-typing{display:inline-flex;gap:3px;padding:2px 0}
.dc-typing i{width:5px;height:5px;background:var(--dc-ink-accent);display:block;animation:dc-dot 1s steps(2) infinite}
.dc-typing i:nth-child(2){animation-delay:.2s}.dc-typing i:nth-child(3){animation-delay:.4s}
@keyframes dc-dot{50%{opacity:.2}}

.dc-board-wrap{padding:8px 8px 0;flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;container-type:size;overflow:hidden}
.dc-board{width:100%;width:min(100%,100cqh);max-width:100%;aspect-ratio:1/1;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);background:var(--dc-board-frame);border:2px solid var(--dc-board-frame);box-shadow:4px 4px 0 var(--dc-shadow);position:relative;flex:0 0 auto}
.dc-sq{position:relative;display:grid;place-items:center;padding:0;border:0;cursor:pointer;min-width:0;min-height:0}
.dc-sq.light{background:var(--dc-light-sq)}
.dc-sq.dark{background:var(--dc-dark-sq)}
.dc-sq.sel{box-shadow:inset 0 0 0 3px var(--dc-gold)}
.dc-sq.last{box-shadow:inset 0 0 0 3px rgba(255,196,64,.8)}
.dc-sq.check{box-shadow:inset 0 0 0 3px var(--dc-danger)}
.dc-sq .dc-dot{width:22%;height:22%;background:var(--dc-ink);opacity:.45;border-radius:50%;position:absolute;pointer-events:none}
.dc-sq .dc-ring{position:absolute;inset:8%;border:3px solid var(--dc-danger);border-radius:50%;pointer-events:none}
.dc-sq.dc-target{cursor:pointer}
.dc-piece{width:92%;height:92%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))}
.dc-board-shake{animation:dc-shake .28s steps(2)}
.dc-sq:focus-visible{outline:2px solid var(--dc-gold);outline-offset:-2px}

.dc-status{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px 4px;color:var(--dc-text-dim);font-size:12px;flex:0 0 auto}
.dc-status b{color:var(--dc-title);font-weight:400}
.dc-status .dc-turn{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;overflow:hidden}
.dc-turn-dot{width:8px;height:8px;background:var(--dc-gold);display:inline-block}
.dc-check-tag{color:var(--dc-danger)}
.dc-captured{display:flex;align-items:center;gap:3px;color:var(--dc-text-muted);font-size:12px;min-height:14px}
.dc-captured img{width:14px;height:14px;opacity:.9}

.dc-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:2px 8px 8px;flex:0 0 auto}
.dc-btn{background:var(--dc-bg-panel);color:var(--dc-text);border:2px solid var(--dc-border);box-shadow:2px 2px 0 var(--dc-shadow);cursor:pointer;padding:6px 2px;line-height:1.2;white-space:nowrap}
.dc-btn:hover{background:var(--dc-bg-hover)}
.dc-btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 var(--dc-shadow)}
.dc-btn.gold{background:var(--dc-gold);color:var(--dc-gold-ink);border-color:var(--dc-gold-border)}
.dc-btn.red{background:var(--dc-danger);color:#fff;border-color:#7a2630}
.dc-btn:disabled{opacity:.4;cursor:default}

.dc-moves{margin:0 auto 8px;width:calc(100% - 16px);background:var(--dc-paper-2);color:var(--dc-ink);border:2px solid var(--dc-ink);padding:5px 8px;display:flex;align-items:center;gap:6px;flex:0 0 auto;min-height:30px;overflow:hidden}
.dc-moves-label{color:var(--dc-ink-accent);flex:0 0 auto}
.dc-moves-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
.dc-moves-now{display:none;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
.dc-moves-more{background:none;border:0;color:var(--dc-ink-accent);cursor:pointer;padding:0 2px;font-size:12px}
.dc-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding:6px 10px;border-top:1px solid var(--dc-border-soft);color:var(--dc-text-muted);font-size:12px;flex:0 0 auto;white-space:nowrap;overflow:hidden}

.dc-overlay{position:absolute;inset:0;z-index:30;background:rgba(6,10,18,.9);display:flex;flex-direction:column;animation:dc-fade .12s steps(2)}
@keyframes dc-fade{from{opacity:0}to{opacity:1}}
.dc-sheet-head{display:flex;align-items:center;padding:10px;border-bottom:2px solid var(--dc-border-soft);background:var(--dc-bg-deep)}
.dc-sheet-title{font-size:24px;line-height:1;color:var(--dc-title)}
.dc-sheet-body{flex:1;min-height:0;overflow:auto;padding:8px 12px 18px}
.dc-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;border-bottom:1px dashed var(--dc-border-soft)}
.dc-row-label{color:var(--dc-text-dim);flex:0 0 auto}
.dc-seg{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.dc-seg button{background:var(--dc-bg-panel);color:var(--dc-text);border:2px solid var(--dc-border);padding:4px 7px;cursor:pointer}
.dc-seg button.on{background:var(--dc-gold);color:var(--dc-gold-ink);border-color:var(--dc-gold-border)}
.dc-hint{color:var(--dc-text-muted);font-size:12px;padding:6px 0}
.dc-stats{background:var(--dc-bg-track);border:2px solid var(--dc-border-soft);padding:8px;margin-top:6px;color:var(--dc-text)}
.dc-overlay-actions{display:flex;gap:6px;padding:8px;border-top:2px solid var(--dc-border-soft);background:var(--dc-bg-deep)}
.dc-overlay-actions .dc-btn{flex:1}
.dc-confirm-wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.dc-confirm-card{display:flex;gap:12px;align-items:flex-start;background:var(--dc-bg-panel);border:2px solid var(--dc-border);box-shadow:5px 5px 0 var(--dc-shadow);padding:14px;max-width:340px}
.dc-confirm-mark{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;background:var(--dc-paper);color:var(--dc-ink);border:2px solid var(--dc-ink);font-size:24px;line-height:1}
.dc-confirm-card.new .dc-confirm-mark{background:var(--dc-gold);color:var(--dc-gold-ink);border-color:var(--dc-gold-border)}
.dc-confirm-card.resign .dc-confirm-mark{background:var(--dc-danger);color:#fff;border-color:var(--dc-danger)}
.dc-confirm-copy{min-width:0}
.dc-confirm-title{color:var(--dc-title);line-height:1.45}
.dc-confirm-desc{color:var(--dc-text-dim);line-height:1.55;margin-top:4px}
.dc-confirm-note{color:var(--dc-text-muted);font-size:12px;line-height:1.5;margin-top:6px;border-top:1px dashed var(--dc-border-soft);padding-top:5px}

.dc-promo{position:absolute;inset:0;z-index:40;background:rgba(6,10,18,.82);display:grid;place-items:center;padding:12px}
.dc-promo-card{background:var(--dc-paper);color:var(--dc-ink);border:2px solid var(--dc-ink);box-shadow:4px 4px 0 var(--dc-shadow);padding:10px;width:100%;max-width:260px}
.dc-promo-title{text-align:center;color:var(--dc-ink-accent);margin-bottom:8px}
.dc-promo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.dc-promo-grid button{background:var(--dc-light-sq);border:2px solid var(--dc-ink);padding:4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--dc-ink)}
.dc-promo-grid img{width:44px;height:44px;object-fit:contain;image-rendering:pixelated}
.dc-promo-grid span{font-size:12px}

.dc-result{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(6,10,18,.78);padding:10px;overflow:auto}
.dc-result-sheet{width:100%;max-width:400px;max-height:100%;overflow:auto;background:var(--dc-bg-deep);border:2px solid var(--dc-border);box-shadow:6px 6px 0 var(--dc-shadow);padding:14px;box-sizing:border-box}
.dc-result-kicker{color:var(--dc-gold);font-size:12px;letter-spacing:2px;margin-bottom:4px}
.dc-result-title{font-size:24px;line-height:1.3;color:var(--dc-title);text-shadow:2px 2px 0 var(--dc-shadow)}
.dc-result-sub{color:var(--dc-text-dim);line-height:1.55;margin-top:6px}
.dc-result-meta{color:var(--dc-text-muted);font-size:12px;line-height:1.5;margin-top:6px}
.dc-result-section{border-top:1px solid var(--dc-border-soft);margin-top:12px;padding-top:10px}
.dc-result-section-title{color:var(--dc-gold);font-size:12px;letter-spacing:1px}
.dc-result-diff{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:7px 0}
.dc-result-diff button{background:var(--dc-bg-panel);color:var(--dc-text);border:2px solid var(--dc-border);padding:4px 0;cursor:pointer;font:inherit;font-size:12px}
.dc-result-diff button.on{background:var(--dc-gold);color:var(--dc-gold-ink);border-color:var(--dc-gold-border)}
.dc-result-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px dashed var(--dc-border-soft)}
.dc-result-row-label{color:var(--dc-text-dim);flex:0 0 auto}
.dc-result-seg{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.dc-result-seg button{background:var(--dc-bg-panel);color:var(--dc-text);border:2px solid var(--dc-border);padding:3px 7px;cursor:pointer;font:inherit;font-size:12px}
.dc-result-seg button.on{background:var(--dc-gold);color:var(--dc-gold-ink);border-color:var(--dc-gold-border)}
.dc-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px}
.dc-result-actions .dc-btn{padding:7px 0}

.dc-toast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:var(--dc-bg-track);border:2px solid var(--dc-border);color:var(--dc-text);padding:4px 10px;z-index:50;white-space:nowrap;animation:dc-fade .12s steps(2)}
.dc-shake{animation:dc-shake .28s steps(2)}
@keyframes dc-shake{25%{transform:translateX(-2px)}50%{transform:translateX(2px)}75%{transform:translateX(-1px)}}

.dc-log{position:absolute;inset:0;z-index:25;background:var(--dc-bg-deep);display:flex;flex-direction:column}
.dc-log-list{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:6px}
.dc-log-item{font-size:12px;line-height:1.7;padding:5px 8px;border:1px solid var(--dc-border-soft);background:var(--dc-bg-log);max-width:92%}
.dc-log-item.me{align-self:flex-end;background:var(--dc-bg-log-me);border-color:var(--dc-border)}
.dc-log-item.sys{color:var(--dc-text-muted);border-color:transparent;background:none;align-self:center;padding:2px}

@container (max-width:340px){
  .dc-portrait-stage{height:100px}
  .dc-bubble{min-height:100px;padding:6px 8px}
  .dc-speech{line-height:1.65}
  .dc-actions{gap:4px;padding:2px 6px 6px}
  .dc-btn{padding:6px 0}
  .dc-board-wrap{padding:6px 6px 0}
  .dc-moves{margin:0 6px 6px}
}
@container (max-height:620px){
  .dc-moves{min-height:24px;padding:3px 6px;margin:0 auto 6px}
  .dc-moves-label,.dc-moves-text{display:none}
  .dc-moves-now{display:block}
  .dc-portrait{height:84px}
  .dc-scene{padding:6px}
  .dc-board-wrap{padding-top:6px}
}
@container (min-width:420px){
  .dc-portrait-card{width:136px;flex-basis:136px}
  .dc-portrait-stage{height:130px}
  .dc-bubble{min-height:130px}
  .dc-speech{font-size:12px}
}
`;
  document.head.appendChild(tag);
  return () => tag.remove();
}
