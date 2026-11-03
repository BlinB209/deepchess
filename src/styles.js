/**
 * styles.js — the panel's pixel stylesheet.
 *
 * One scoped sheet, palette fixed for the game surface, layout driven by
 * container queries so the right sidebar can be 300px or 520px wide.
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
  position:relative;container-type:size;height:100%;min-height:0;display:flex;flex-direction:column;
  background:#121a2a;color:#e7eefc;
  font-family:'ArkPixel','Microsoft YaHei','PingFang SC',monospace;
  font-size:12px;line-height:1.7;letter-spacing:0;
  -webkit-font-smoothing:none;text-rendering:geometricPrecision;
  overflow:hidden;user-select:none;
}
.dc-root *{box-sizing:border-box}
.dc-root button{font-family:inherit;font-size:12px}
.dc-root img{image-rendering:pixelated}
.dc-scroll{overflow:auto;min-height:0}
.dc-root *::-webkit-scrollbar{width:6px;height:6px}
.dc-root *::-webkit-scrollbar-thumb{background:#3b5a8c}
.dc-root *::-webkit-scrollbar-track{background:#0b1220}

.dc-head,.dc-diffbar,.dc-scene,.dc-board-wrap,.dc-status,.dc-actions,.dc-moves,.dc-foot{width:100%;max-width:560px;margin-left:auto;margin-right:auto}
.dc-head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#0d1422;border-bottom:2px solid #2c3f63;flex:0 0 auto}
.dc-title{font-size:24px;line-height:1;color:#f4e8cc;text-shadow:2px 2px 0 #070b14}
.dc-title-en{font-size:12px;color:#7fa4d8;margin-left:2px}
.dc-head-actions{margin-left:auto;display:flex;gap:6px}
.dc-icon-btn{width:26px;height:26px;display:grid;place-items:center;background:#1b2740;border:2px solid #3b5a8c;color:#dfe9ff;cursor:pointer;padding:0}
.dc-icon-btn:hover{background:#24365a}

.dc-diffbar{display:flex;align-items:center;gap:4px;padding:5px 8px;background:#0d1422;border-bottom:2px solid #24344f;flex:0 0 auto;overflow-x:auto}
.dc-diffbar-label{color:#7f96b8;margin-right:2px;flex:0 0 auto;font-size:12px}
.dc-diff{flex:1 1 0;min-width:0;background:#1b2740;color:#cfe0f8;border:2px solid #3b5a8c;padding:3px 0;cursor:pointer;white-space:nowrap;font-size:12px}
.dc-diff:hover{background:#24365a}
.dc-diff.on{background:#f0b429;color:#2a1c08;border-color:#8a5a12}
.dc-scene{display:flex;gap:8px;padding:8px;background:linear-gradient(180deg,#182238 0%,#121a2a 100%);border-bottom:2px solid #24344f;flex:0 0 auto}
.dc-portrait-card{width:112px;flex:0 0 112px;background:#f3e6c8;border:2px solid #2a2433;box-shadow:3px 3px 0 #070b14;position:relative;display:flex;flex-direction:column;cursor:pointer}
.dc-portrait-card:focus-visible{outline:2px solid #f0b429;outline-offset:-2px}
.dc-portrait-stage{position:relative;height:106px;overflow:hidden;background:#ffffff;border-bottom:1px solid #2a2433}
.dc-portrait-stage:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(42,36,51,.06) 0 1px,transparent 1px 6px);pointer-events:none;z-index:1}
.dc-portrait{position:absolute;left:3px;top:3px;width:calc(100% - 6px);height:calc(100% - 3px);object-fit:contain;display:block;z-index:2;-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 86%,rgba(0,0,0,.6) 94%,transparent 100%);mask-image:linear-gradient(to bottom,#000 0%,#000 86%,rgba(0,0,0,.6) 94%,transparent 100%)}
.dc-portrait-name{font-size:12px;text-align:center;color:#2a2433;padding:3px 0;border-top:1px solid #2a2433;display:flex;flex-direction:column;line-height:1.2;white-space:nowrap;overflow:hidden;background:#f3e6c8}
.dc-portrait-name span:first-child{color:#2a2433}
.dc-portrait-name span:last-child{color:#8a4b2a}
.dc-bubble{flex:1;min-width:0;display:flex;flex-direction:column;position:relative;background:#f3e6c8;color:#2a2433;border:2px solid #2a2433;box-shadow:3px 3px 0 #070b14;padding:7px 9px 8px;min-height:106px}
.dc-bubble:before{content:'';position:absolute;left:-8px;top:36px;width:8px;height:8px;background:#f3e6c8;border-left:2px solid #2a2433;border-bottom:2px solid #2a2433;transform:rotate(45deg)}
.dc-bubble-name{font-size:12px;color:#8a4b2a;display:flex;align-items:center;gap:6px;flex:0 0 auto}
.dc-mood-chip{font-size:12px;padding:0 5px;background:#2a2433;color:#f3e6c8;line-height:16px}
.dc-speech{flex:1;min-height:0;overflow:auto;margin-top:3px;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.75;cursor:pointer}
.dc-speech .dc-caret{display:inline-block;width:6px;height:12px;background:#2a2433;vertical-align:-2px;animation:dc-blink .8s steps(1) infinite}
@keyframes dc-blink{50%{opacity:0}}
.dc-bubble.dc-say{animation:dc-pop .18s steps(2)}
@keyframes dc-pop{from{transform:translateY(2px)}to{transform:translateY(0)}}
.dc-typing{display:inline-flex;gap:3px;padding:2px 0}
.dc-typing i{width:5px;height:5px;background:#8a4b2a;display:block;animation:dc-dot 1s steps(2) infinite}
.dc-typing i:nth-child(2){animation-delay:.2s}.dc-typing i:nth-child(3){animation-delay:.4s}
@keyframes dc-dot{50%{opacity:.2}}

.dc-board-wrap{padding:8px 8px 0;flex:0 0 auto;display:flex;justify-content:center}
.dc-board{width:100%;max-width:max(220px,calc(100cqh - 380px));aspect-ratio:1/1;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);background:#0a101c;border:2px solid #0a101c;box-shadow:4px 4px 0 #070b14;position:relative}
.dc-sq{position:relative;display:grid;place-items:center;padding:0;border:0;cursor:pointer;min-width:0;min-height:0}
.dc-sq.light{background:#e8d8b8}
.dc-sq.dark{background:#5a7fa6}
.dc-sq.sel{box-shadow:inset 0 0 0 3px #f0b429}
.dc-sq.last{box-shadow:inset 0 0 0 3px rgba(255,196,64,.8)}
.dc-sq.check{box-shadow:inset 0 0 0 3px #d94f5c}
.dc-sq .dc-dot{width:22%;height:22%;background:#1d2a44;opacity:.55;border-radius:50%;position:absolute;pointer-events:none}
.dc-sq .dc-ring{position:absolute;inset:8%;border:3px solid #d94f5c;border-radius:50%;pointer-events:none}
.dc-sq.dc-target{cursor:pointer}
.dc-piece{width:92%;height:92%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))}
.dc-board-shake{animation:dc-shake .28s steps(2)}
.dc-sq:focus-visible{outline:2px solid #f0b429;outline-offset:-2px}

.dc-status{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px 4px;color:#9fb6d8;font-size:12px;flex:0 0 auto}
.dc-status b{color:#f4e8cc;font-weight:400}
.dc-status .dc-turn{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;overflow:hidden}
.dc-turn-dot{width:8px;height:8px;background:#f0b429;display:inline-block}
.dc-check-tag{color:#ff8a94}
.dc-captured{display:flex;align-items:center;gap:3px;color:#7f96b8;font-size:12px;min-height:14px}
.dc-captured img{width:14px;height:14px;opacity:.9}

.dc-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:2px 8px 8px;flex:0 0 auto}
.dc-btn{background:#1b2740;color:#dfe9ff;border:2px solid #3b5a8c;box-shadow:2px 2px 0 #070b14;cursor:pointer;padding:6px 2px;line-height:1.2;white-space:nowrap}
.dc-btn:hover{background:#24365a}
.dc-btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #070b14}
.dc-btn.gold{background:#f0b429;color:#2a1c08;border-color:#8a5a12}
.dc-btn.red{background:#d94f5c;color:#fff;border-color:#7a2630}
.dc-btn:disabled{opacity:.4;cursor:default}

.dc-moves{margin:0 auto 8px;width:calc(100% - 16px);background:#efe2c4;color:#3a2f22;border:2px solid #2a2433;padding:5px 8px;display:flex;align-items:center;gap:6px;flex:0 0 auto;min-height:30px;overflow:hidden}
.dc-moves-label{color:#8a4b2a;flex:0 0 auto}
.dc-moves-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
.dc-moves-more{background:none;border:0;color:#8a4b2a;cursor:pointer;padding:0 2px;font-size:12px}
.dc-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding:6px 10px;border-top:1px solid #24344f;color:#6f86a8;font-size:12px;flex:0 0 auto;white-space:nowrap;overflow:hidden}

.dc-overlay{position:absolute;inset:0;z-index:30;background:rgba(6,10,18,.9);display:flex;flex-direction:column;animation:dc-fade .12s steps(2)}
@keyframes dc-fade{from{opacity:0}to{opacity:1}}
.dc-sheet-head{display:flex;align-items:center;padding:10px;border-bottom:2px solid #2c3f63;background:#0d1422}
.dc-sheet-title{font-size:24px;line-height:1;color:#f4e8cc}
.dc-sheet-body{flex:1;min-height:0;overflow:auto;padding:8px 12px 18px}
.dc-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;border-bottom:1px dashed #2c3f63}
.dc-row-label{color:#a9c6ee;flex:0 0 auto}
.dc-seg{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.dc-seg button{background:#1b2740;color:#cfe0f8;border:2px solid #3b5a8c;padding:4px 7px;cursor:pointer}
.dc-seg button.on{background:#f0b429;color:#2a1c08;border-color:#8a5a12}
.dc-hint{color:#6f86a8;font-size:12px;padding:6px 0}
.dc-stats{background:#0b1220;border:2px solid #24344f;padding:8px;margin-top:6px;color:#cfe0f8}
.dc-overlay-actions{display:flex;gap:6px;padding:8px;border-top:2px solid #2c3f63;background:#0d1422}
.dc-overlay-actions .dc-btn{flex:1}
.dc-draw-wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.dc-draw-card{display:flex;gap:12px;align-items:center;background:#141f34;border:2px solid #3b5a8c;box-shadow:4px 4px 0 #070b14;padding:12px;max-width:320px}
.dc-draw-mark{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;background:#f3e6c8;color:#2a2433;border:2px solid #2a2433;font-size:24px;line-height:1}
.dc-draw-title{color:#f2e7cf;line-height:1.5}
.dc-draw-desc{color:#9fb6d8;line-height:1.55;margin-top:4px}

.dc-promo{position:absolute;inset:0;z-index:40;background:rgba(6,10,18,.82);display:grid;place-items:center;padding:12px}
.dc-promo-card{background:#f3e6c8;color:#2a2433;border:2px solid #2a2433;box-shadow:4px 4px 0 #070b14;padding:10px;width:100%;max-width:260px}
.dc-promo-title{text-align:center;color:#8a4b2a;margin-bottom:8px}
.dc-promo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.dc-promo-grid button{background:#e8d8b8;border:2px solid #2a2433;padding:4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;color:#2a2433}
.dc-promo-grid img{width:44px;height:44px;object-fit:contain;image-rendering:pixelated}
.dc-promo-grid span{font-size:12px}

.dc-result{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(6,10,18,.74);padding:16px;text-align:center}
.dc-result-title{font-size:24px;color:#f4e8cc;text-shadow:2px 2px 0 #070b14}
.dc-result-sub{color:#a9c6ee;max-width:240px}
.dc-result .dc-btn{padding:7px 18px}

.dc-toast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:#0b1220;border:2px solid #3b5a8c;color:#dfe9ff;padding:4px 10px;z-index:50;white-space:nowrap;animation:dc-fade .12s steps(2)}
.dc-shake{animation:dc-shake .28s steps(2)}
@keyframes dc-shake{25%{transform:translateX(-2px)}50%{transform:translateX(2px)}75%{transform:translateX(-1px)}}

.dc-log{position:absolute;inset:0;z-index:25;background:#0d1422;display:flex;flex-direction:column}
.dc-log-list{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:6px}
.dc-log-item{font-size:12px;line-height:1.7;padding:5px 8px;border:1px solid #24344f;background:#131d30;max-width:92%}
.dc-log-item.me{align-self:flex-end;background:#1d2c48;border-color:#3b5a8c}
.dc-log-item.sys{color:#7f96b8;border-color:transparent;background:none;align-self:center;padding:2px}

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
  .dc-moves{display:none}
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
