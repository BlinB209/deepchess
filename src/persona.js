/**
 * persona.js — 小鲸的台词库与出话逻辑。
 *
 * 目标不是“台词多”，而是像真人：短反应、具体观察、少量自嘲和垃圾话，
 * 并且记得上一手、换子、长考、悔棋这些事。所有句子按事件分类，情绪只影响
 * 语气池，不会把同一句换个表情重复说。
 */

export const MOODS = [
  'calm', 'smile', 'smug', 'laugh', 'annoyed', 'angry', 'pout', 'panic',
  'surprised', 'sad', 'cry', 'tired', 'thinking', 'wink', 'love',
  'determined', 'embarrassed', 'sleepy',
];

export const MOOD_LABEL = {
  zh: {
    calm: '平静', smile: '微笑', smug: '得意', laugh: '大笑', annoyed: '恼火',
    angry: '生气', pout: '鼓脸', panic: '慌张', surprised: '惊讶', sad: '沮丧',
    cry: '哭', tired: '疲惫', thinking: '思考', wink: '眨眼', love: '喜欢',
    determined: '认真', embarrassed: '害羞', sleepy: '困倦',
  },
  en: {
    calm: 'Calm', smile: 'Smile', smug: 'Smug', laugh: 'Laugh', annoyed: 'Annoyed',
    angry: 'Angry', pout: 'Pout', panic: 'Panic', surprised: 'Surprised', sad: 'Sad',
    cry: 'Cry', tired: 'Tired', thinking: 'Thinking', wink: 'Wink', love: 'Love',
    determined: 'Focused', embarrassed: 'Shy', sleepy: 'Sleepy',
  },
};

const PIECE_ZH = { p: '兵', n: '马', b: '象', r: '车', q: '后', k: '王' };
const PIECE_EN = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

const T = {
  // ── 开场 ──────────────────────────────────────────────
  start: {
    _: [
      '来吧。你先手。',
      '新的一局。坐。',
      '棋盘摆好了。',
      '你执白。我准备好了。',
      '别急，想好再走。',
      '开始吧。',
    ],
    smile: [
      '又见面了。这次想下多久？',
      '我泡了杯茶，慢慢下。',
      '你来了。坐吧。',
    ],
    calm: [
      '我先看着。',
      '慢慢来。',
    ],
    smug: [
      '这次我不摸鱼。',
      '你确定要跟我下？',
    ],
  },

  // ── 玩家普通走子 ─────────────────────────────────────
  playerQuiet: {
    _: [
      '嗯。',
      '行。',
      '我跟。',
      '知道了。',
      '让我看看。',
      '这一步……',
      '你走这儿。',
      '好。',
      '继续。',
    ],
    calm: [
      '稳。',
      '不急。',
      '我慢慢来。',
      '{move}。我记下了。',
    ],
    smug: [
      '这步没什么野心。',
      '你是在试探我？',
      '还行。',
      '{move}，我猜到了。',
    ],
    annoyed: [
      '又是这种棋。',
      '你能不能走快点。',
    ],
    thinking: [
      '等一下，我算算。',
      '这里有点意思。',
    ],
  },

  // ── 玩家吃子 ─────────────────────────────────────────
  playerCapture: {
    _: [
      '你吃我{captured}？',
      '用{piece}吃我{captured}？',
      '行，拿走吧。',
      '换就换。',
      '{captured}而已。',
      '你下手挺快。',
      '这子你也要。',
    ],
    smug: [
      '这个{captured}我本来也打算弃的。',
      '吃吧，吃完就该我了。',
      '不亏。',
    ],
    angry: [
      '你吃我{captured}？',
      '行，你等着。',
    ],
    panic: [
      '等等，这个{captured}不能丢……',
      '别别别。',
    ],
    sad: [
      '……拿去吧。',
    ],
  },

  // ── 她吃子 ───────────────────────────────────────────
  herCapture: {
    _: [
      '{captured}我收了。',
      '{move}，{captured}归我。',
      '这子归我。',
      '谢谢。',
      '吃你一个{captured}。',
      '换子不亏。',
      '归我了。',
    ],
    smug: [
      '你刚才没看到吧？',
      '这{captured}放在这儿，不就是给我的？',
      '我就不客气了。',
    ],
    laugh: [
      '哈，真给了我？',
      '谢谢啊。',
    ],
    annoyed: [
      '总算吃回来一个。',
      '解气。',
    ],
  },

  // ── 玩家将军 ─────────────────────────────────────────
  playerCheck: {
    _: [
      '{move}，将？',
      '将？',
      '看到了。',
      '我挡。',
      '这一将没什么用。',
      '别急，我还在。',
      '行，将军。',
    ],
    annoyed: [
      '又来。',
      '你烦不烦。',
    ],
    panic: [
      '等等，我将着呢。',
      '别催。',
    ],
    smug: [
      '你就这点手段？',
      '将一下而已。',
    ],
  },

  // ── 她将军 ───────────────────────────────────────────
  herCheck: {
    _: [
      '{move}。将。',
      '将。',
      '轮到你了。',
      '挡一下。',
      '将军。',
      '看清楚再走。',
    ],
    smug: [
      '别慌，慢慢想。',
      '你还有几步？',
      '这步怎么样？',
    ],
    laugh: [
      '哈，将到了。',
      '抓到了。',
    ],
    calm: [
      '别急，想清楚。',
    ],
  },

  // ── 玩家失误 ─────────────────────────────────────────
  playerBlunder: {
    _: [
      '这步……你确定？',
      '哦。',
      '你送子了。',
      '我收了？',
      '你是不是看错了。',
      '这步有点亏。',
      '要悔棋吗？',
    ],
    laugh: [
      '哈，谢谢。',
      '这步我不客气了。',
      '你认真的？',
    ],
    smug: [
      '你刚刚那步，等于把{captured}递给我。',
      '我都不好意思吃了。',
      '这步，我记下了。',
    ],
    surprised: [
      '等等，你认真的？',
      '这步……是陷阱吗？',
    ],
    calm: [
      '你想清楚。',
      '再看看吧。',
    ],
  },

  // ── 玩家好棋 ─────────────────────────────────────────
  playerGood: {
    _: [
      '嗯？这步不错。',
      '有点东西。',
      '我算漏了。',
      '行，你认真了。',
      '这手我记下了。',
    ],
    love: [
      '这步好看。',
      '你认真起来还挺厉害。',
    ],
    determined: [
      '好，我也认真。',
      '这局没那么容易。',
    ],
    surprised: [
      '这步不在我预判里。',
      '你什么时候会这个的？',
    ],
    annoyed: [
      '……行吧。',
    ],
  },

  // ── 她失误 ───────────────────────────────────────────
  herBlunder: {
    _: [
      '……啊。',
      '走错了。',
      '刚才那步不算。',
      '我重算一下。',
      '失误。',
    ],
    embarrassed: [
      '别笑。',
      '我看错了。',
      '这步……当我没说。',
    ],
    panic: [
      '等等，我的{captured}。',
      '不对不对。',
    ],
    sad: [
      '……失误。',
    ],
  },

  // ── 她好棋 ───────────────────────────────────────────
  herGood: {
    _: [
      '这样应该够了。',
      '我觉着这步还行。',
      '你看住这边。',
      '别急，还没完。',
    ],
    smug: [
      '这步怎么样？',
      '我算到了。',
    ],
    determined: [
      '稳住。',
      '还没结束。',
    ],
  },

  // ── 玩家长考 ─────────────────────────────────────────
  playerThinkLong: {
    _: [
      '你慢慢想。',
      '想这么久，是在算什么？',
      '我不催。',
      '要不我帮你走？',
      '你还在吗？',
    ],
    tired: [
      '我都快睡着了。',
      '想到哪了？',
    ],
    annoyed: [
      '你能不能快点。',
    ],
    smile: [
      '不急，我等你。',
    ],
  },

  // ── 她长考 ───────────────────────────────────────────
  herThink: {
    _: [
      '让我看看……',
      '嗯……',
      '这里。',
      '我算一下。',
    ],
    thinking: [
      '等等，我算算。',
      '这步有点难。',
    ],
    determined: [
      '别急。',
    ],
  },

  // ── 残局 ─────────────────────────────────────────────
  lowMaterial: {
    _: [
      '子不多了。',
      '残局了。',
      '现在比谁少犯错。',
      '慢慢下。',
      '残局最磨人。',
    ],
    tired: [
      '残局最磨人。',
      '我眼睛都花了。',
    ],
    determined: [
      '还没完。',
    ],
  },

  // ── 长局 ─────────────────────────────────────────────
  longGame: {
    _: [
      '这局有点长。',
      '你累不累？',
      '我都快没词了。',
      '再下下去要天亮了。',
    ],
    sleepy: [
      '哈……',
      '我有点困了。',
    ],
    tired: [
      '手都酸了。',
    ],
  },

  // ── 悔棋 ─────────────────────────────────────────────
  undo: {
    _: [
      '悔棋？',
      '行，我当没看见。',
      '你确定要退？',
      '退吧，反正我记着。',
    ],
    pout: [
      '……行吧。',
      '就这一次。',
    ],
    annoyed: [
      '又悔。',
      '你能不能想好再走。',
    ],
    smug: [
      '退一步也救不了。',
    ],
  },

  // ── 认输 ─────────────────────────────────────────────
  resign: {
    _: [
      '认输了？',
      '行。',
      '这局算我的。',
      '下次再来。',
    ],
    smug: [
      '承让。',
    ],
    calm: [
      '好。',
    ],
    sad: [
      '……不再试试？',
    ],
  },

  // ── 她赢 ─────────────────────────────────────────────
  win: {
    _: [
      '结束了。',
      '你最后那步，其实还有救。',
      '别灰心。',
      '我赢了。',
    ],
    smug: [
      '这局，我的。',
      '承让。',
    ],
    laugh: [
      '哈，赢了。',
    ],
    calm: [
      '下得不错。',
      '再来一局？',
    ],
  },

  // ── 她输 ─────────────────────────────────────────────
  lose: {
    _: [
      '……我输了。',
      '这局算你的。',
      '别笑。',
      '再来。',
    ],
    sad: [
      '我认。',
      '你下得好。',
    ],
    cry: [
      '……',
      '不算，再来一局。',
    ],
    embarrassed: [
      '我失误了。',
    ],
  },

  // ── 和棋 ─────────────────────────────────────────────
  draw: {
    _: [
      '和棋。',
      '谁也没赢。',
      '行吧，平局。',
    ],
    calm: [
      '再来一局分胜负？',
    ],
    pout: [
      '没劲。',
    ],
  },

  // ── 再来 ─────────────────────────────────────────────
  rematch: {
    _: [
      '再来。',
      '这次我不让了。',
      '摆棋。',
    ],
    smile: [
      '好，再来。',
    ],
    determined: [
      '这次我认真。',
    ],
  },

  // ── 待机 ─────────────────────────────────────────────
  idle: {
    _: [
      '……',
      '你还在吗？',
      '我等你。',
      '要不我们聊会儿？',
      '你走神了。',
    ],
    sleepy: [
      '我先眯一会儿。',
      '哈……',
    ],
    smile: [
      '不急。',
    ],
  },

  // ── 升变 ─────────────────────────────────────────────
  promotion: {
    _: [
      '升变？选什么？',
      '你要变后？',
      '想清楚。',
    ],
    surprised: [
      '升变了？',
    ],
    smug: [
      '变什么都没用。',
    ],
  },

  // ── 易位 ─────────────────────────────────────────────
  castle: {
    _: [
      '易位？',
      '你躲什么。',
      '王藏起来了。',
      '安全第一。',
    ],
  },

  // ── 吃过路兵 ─────────────────────────────────────────
  enPassant: {
    _: [
      '吃过路兵？',
      '这你也记得。',
      '行啊。',
    ],
    surprised: [
      '等等，过路兵？',
    ],
  },

  // ── 吃后 ─────────────────────────────────────────────
  queenCapture: {
    _: [
      '后没了。',
      '你把我的后吃了。',
      '这局难了。',
    ],
    angry: [
      '你吃我后？',
      '行，你等着。',
    ],
    panic: [
      '等等，我的后……',
    ],
    laugh: [
      '哈，后换后，不亏。',
    ],
  },

  // ── 提和 ─────────────────────────────────────────────
  drawOffer: {
    _: [
      '想和棋？',
      '再下下看。',
      '现在和，太早了吧。',
      '我还没输呢。',
    ],
    pout: [
      '不干。',
      '没劲。',
      '再走几步。',
    ],
    smug: [
      '你怕了？',
      '想得美。',
    ],
  },

  // ── 拒绝和棋 ─────────────────────────────────────────
  drawRefuse: {
    _: [
      '不干。',
      '想得美。',
      '我还没输呢。',
      '再下下嘛。',
      '这局还没到和棋的时候。',
    ],
    pout: [
      '不要。',
      '才不和你和。',
      '哼，继续下。',
    ],
    smug: [
      '你怕了？',
      '现在和棋，太便宜你了。',
      '我正赢着呢。',
    ],
  },

  // ── 戳一下 ───────────────────────────────────────────
  poke: {
    _: [
      '别戳。',
      '干嘛。',
      '我在想棋。',
      '你手真闲。',
      '再戳要收费了。',
      '有事说事。',
    ],
    smug: [
      '戳我干嘛？想认输？',
      '你再戳，我就当你投降了。',
      '别闹，我正赢着呢。',
    ],
    annoyed: [
      '你再戳一下试试。',
      '手拿开。',
      '我数到三。',
    ],
    laugh: [
      '哈，痒。',
      '别闹，我笑点低。',
    ],
    panic: [
      '别闹，我将着呢。',
      '现在不是玩的时候。',
    ],
    sleepy: [
      '唔……',
      '让我眯一会儿。',
    ],
    embarrassed: [
      '别、别戳。',
      '你干嘛。',
    ],
    love: [
      '你、你突然戳我干嘛……',
      '别、别靠这么近。',
      '再戳……也不是不行。',
    ],
  },

  // ── 回调 ─────────────────────────────────────────────
  callback: {
    _: [
      '你上次也是这么走的。',
      '又来？',
      '这步你之前下过。',
      '我记得你。',
    ],
    smug: [
      '你以为换个顺序我就认不出了？',
    ],
  },
};

// Extra pool: keep the common events from cycling too soon.
T.playerQuiet._.push(
  '这一步，我没想到。', '你在准备什么？', '先这样。', '我看看另一边。',
  '不急，慢慢来。', '这棋有点闷。', '你想换子？', '我偏不。',
  '行，陪你走。', '嗯，继续。', '这步很安静。', '你在等我自己失误？',
);
T.playerCapture._.push(
  '用{piece}换{captured}，你觉得值？', '这子我不要了。', '拿走吧，反正我还能走。',
  '你吃子倒是干脆。', '好，交换。', '我不心疼。',
);
T.herCapture._.push(
  '这个{captured}归我了。', '你漏看了。', '谢谢，正好缺个子。',
  '吃回来。', '不客气。', '这子我惦记很久了。',
);
T.playerCheck._.push(
  '将？我挡。', '这一将，我不怕。', '你先把王看好吧。',
  '行，将军。', '我退一步。', '别急，我还在。',
);
T.herCheck._.push(
  '将。想好怎么挡。', '这一下，够你忙的。', '别慌。',
  '将军，轮到你了。', '你王的位置不太好。',
);
T.playerBlunder._.push(
  '这步……你送了个{captured}。', '你确定不是点错了？', '我不客气了。',
  '这步亏了。', '你刚才想什么呢？', '要不要悔棋？',
);
T.playerGood._.push(
  '这步不错，我承认。', '你认真起来挺难缠。', '我得重新算。',
  '好棋。', '这手有点疼。',
);
T.herBlunder._.push(
  '……我看错了。', '这步不算。', '等一下。', '我怎么会走这个。', '别说话。',
);
T.herGood._.push(
  '这步还行吧。', '你看住。', '我算过了。', '别急。', '还没完。',
);
T.lowMaterial._.push(
  '子少了，棋盘大了。', '残局。', '现在一步都不能错。', '慢慢磨。',
);
T.longGame._.push('这局真长。', '你还不困？', '我都坐累了。');
T.undo._.push('又退？', '行，就这一次。', '你退吧。', '我当没看见。');
T.win._.push('这局我收下。', '下次再来。', '你最后急了。');
T.lose._.push('这局你的。', '再来。', '我不服。');
T.draw._.push('行吧。', '再来一局？');
T.idle._.push('你还在吗？', '我等你。', '走神了？', '要不聊会儿。');
T.drawOffer._.push('想和？', '再下下。', '不干。', '我还没输。');
T.promotion._.push('变什么？', '想好了再说。');
T.castle._.push('躲好了？', '王倒是安全了。');
T.enPassant._.push('过路兵。', '你还记得这个。');
T.queenCapture._.push('后没了。', '这局不好下了。');

T.start._.push(
  '我先把话放这儿：这局你要是能赢，我回去把模型卡吃了。',
  '坐。棋盘我擦过了，输的人请客。',
  '今天状态不错。你小心点。',
);
T.start.smug.push('这局我不打算让子。', '你确定要跟我下？我最近在加训。');
T.start.determined = ['认真模式。我不会让子。'];
T.playerQuiet._.push(
  '你这一步，我记在小本本上了。',
  '你在等我自己乱？',
  '这棋下得，像在互相试探。',
  '我闻到了一股陷阱味。',
  '别急，我还没发力。',
  '你这步，我看不出恶意。',
  '行，我陪你磨。',
);
T.playerCapture._.push(
  '你吃我{captured}？行，这局算私仇。',
  '用{piece}换{captured}，你算过吗？',
  '这子送你了，反正我子多。',
  '你吃子的时候，眼睛都不眨。',
);
T.herCapture._.push(
  '{captured}归我。你刚才那步，白走了。',
  '谢谢投喂。',
  '这子我收下，利息之后再算。',
  '你漏看了一个。',
);
T.playerCheck._.push(
  '将？你也就这点胆子。',
  '行，将军。我挡。',
  '你先把后面的子看住。',
);
T.herCheck._.push(
  '将。别急着挡，先看看你还有没有别的子。',
  '将军。你王的位置，我不太满意。',
  '将到了。你慢慢想。',
);
T.playerBlunder._.push(
  '这步……你是想让我赢得太明显？',
  '你今天第{blunders}次送子了，我记着呢。',
  '你确定不是点错了？我可以等你。',
  '这步一走，我都不好意思吃了。',
);
T.playerGood._.push(
  '这步有点东西。你认真起来，我还挺喜欢的。',
  '好棋。我得重新算。',
  '你什么时候学会这个的？',
  '这手有点疼，但我认。',
);
T.herBlunder._.push(
  '……刚才那步是我手滑。你敢笑，我就把你的兵全吃掉。',
  '我收回。让我重走。',
  '这步不算，我还没加载完。',
);
T.herGood._.push('这步我算了很久。你别急着认输。', '看住这里。', '我认真了。');
T.undo._.push(
  '悔棋可以。但我会记住，你这盘已经退了{undos}次。',
  '行，退吧。反正我记性好。',
  '你上次也是这么说的。',
);
T.resign._.push('这就投了？我还没开始阴阳怪气。', '行吧。下次别急着认输。');
T.win._.push(
  '结束了。来，复盘一下你是怎么把王送到我面前的。',
  '这局我收下。你别难过，你只是我的负样本。',
  '赢了。我回去加个鸡腿。',
);
T.lose._.push(
  '……我输了。你别安慰我，我现在听不进去。',
  '这局算你的。我回去加训。',
  '我不服。再来。',
);
T.draw._.push('和棋。行吧，谁也没赢，谁也没输。', '这局像两个模型互相客气。');
T.lowMaterial._.push('子不多了。现在每一步都像在拆炸弹。', '残局。谁先眨眼谁输。');
T.longGame._.push('这局下的，我裙子都坐皱了。', '你还不困？我有点。');
T.idle._.push('你是在想棋，还是在想怎么输？', '我等你。别让我等到模型更新。');
T.promotion._.push('升变。你挑吧，反正最后都是我的。', '变后？行，我也变。');
T.castle._.push('你把王藏到角落里，以为我找不到？', '易位。安全是安全了，就是有点怂。');
T.enPassant._.push('过路兵？你连这个都记得，看来不是随便下的。');
T.queenCapture._.push('你动我后？行，这局不算积分，算私仇。', '我的后……你等着。');
T.drawOffer._.push('想和？你先把这盘下完。', '不干。我还没输。');

T.herCapture.love = ['这子……我收下了。谢谢。', '你送得这么顺手，我都不好意思了。'];
T.win.love = ['这局我喜欢。', '赢得漂亮，我给自己加一分。'];
T.playerCapture.pout = ['你吃就吃，别得意。', '哼。'];
T.herBlunder.cry = ['……我不行了。', '这步我怎么走的。'];
T.promotion.wink = ['升变？我早算到了。', '变吧，我等着。'];
T.castle.smug = ['躲吧，我看得见。', '王藏起来也没用。'];
T.castle.annoyed = ['又易位。', '你能不能主动点。'];
T.playerGood.smile = ['还行。', '这步像样。'];
T.playerQuiet.wink = ['你这一步，我让着你。', '别急，我陪你玩。'];
T.playerQuiet.sleepy = ['哈……', '你下你的，我眯一会儿。'];
T.longGame.sleepy = ['我快睡着了。', '这局再下下去，我要关机了。'];
T.idle.thinking = ['我在想下一步。', '别催，我在算。'];
T.idle.sleepy = ['唔……你还在吗。', '我先眯一会儿。'];
T.start.wink = ['来，我让你先走。', '别紧张，我下手很轻。'];
T.playerCheck.determined = ['将？行，我挡。', '你这一将，我接住了。'];
T.herCheck.determined = ['将。你别想跑。', '将军。这局我要了。'];
T.queenCapture.cry = ['我的后……', '你把我后吃了。'];
T.lose.embarrassed = ['我下得好丑。', '这局不算我的水平。'];
T.draw.pout = ['没劲。', '和棋，便宜你了。'];
T.undo.sad = ['……行吧。', '你退吧。'];

const CUTE = {
  start: [
    '欸，你来啦。棋盘都摆好了哦。',
    '小鲸今天状态超好，你可要小心。',
    '坐这边。水给你倒好了。',
    '等你好久啦。开始吧？',
  ],
  playerQuiet: [
    '唔……让我想想。',
    '欸？你走这里呀。',
    '哼，我看穿你了。',
    '这一步，小鲸记下了。',
    '你别急嘛。',
    '唔，有点难办。',
  ],
  playerCapture: [
    '呜，我的{captured}……',
    '你、你居然吃它！',
    '笨蛋，那里有陷阱啦。',
    '哼，小鲸会报仇的。',
    '呜……你下手好重。',
  ],
  herCapture: [
    '嘿，{captured}归我啦。',
    '谢谢款待～',
    '小鲸不客气地收下了。',
    '你的子，我收下咯。',
    '欸嘿，赚到了。',
  ],
  playerCheck: [
    '欸，将军？',
    '呜，别急嘛。',
    '小鲸挡给你看。',
    '你、你什么时候学的。',
  ],
  herCheck: [
    '将军哦～',
    '欸，你的王在发抖呢。',
    '小鲸要认真了。',
    '别慌别慌，慢慢想。',
  ],
  playerBlunder: [
    '欸？你送子啦。',
    '笨蛋，这步会输的。',
    '小鲸就不客气了～',
    '你、你是不是看错了。',
    '呜哇，真的假的。',
  ],
  playerGood: [
    '唔，这步不错嘛。',
    '小鲸有点意外。',
    '你认真起来，还挺帅的。',
    '哼，别得意。',
  ],
  herBlunder: [
    '呜，走错了。',
    '不算不算，重来。',
    '你、你别笑。',
    '小鲸手滑了啦。',
  ],
  undo: [
    '欸，悔棋？',
    '好啦好啦，让你一步。',
    '哼，小鲸记着呢。',
    '就这一次哦。',
  ],
  win: [
    '赢啦！',
    '嘿嘿，小鲸赢了。',
    '你最后那步，太急啦。',
    '承让承让～',
  ],
  lose: [
    '呜……小鲸输了。',
    '不算不算，再来一局嘛。',
    '你、你等着。',
    '小鲸回去加训。',
  ],
  draw: [
    '和棋呀。',
    '谁也没赢，真没劲。',
    '再来一局分胜负嘛。',
  ],
  poke: [
    '呀！别戳啦。',
    '呜，会痒的。',
    '再戳就咬你哦。',
    '你、你干嘛。',
  ],
  idle: [
    '欸，你还在吗？',
    '小鲸等你等得尾巴都麻了。',
    '你不下棋，在看什么呀。',
  ],
};

const SPECIAL = {
  firstCapture: ['欸，第一次吃子！小鲸记下了。', '第一滴血……你下手真快。'],
  firstCheck: ['第一次将军哦。小鲸有点紧张。', '欸，别急着将嘛。'],
  queenTrade: ['后换后，棋盘一下子安静了。', '两个后都没了，接下来看小鲸的。'],
  underpromotion: ['升变成马？你、你故意的吧。', '欸，还能这么升？'],
  comeback: ['等等，局势怎么反过来了？', '你、你刚才是不是偷偷加训了？'],
  blunderStreak: ['你今天第三次送子了……小鲸都不好意思了。', '再送下去，小鲸要赢了哦。'],
  longGameSpecial: ['这局下好久啦。小鲸的裙子都坐皱了。', '都下这么久了！你还不认输吗？'],
  lowMaterialSpecial: ['子不多了呢。现在每一步都好紧张。', '残局啦，小鲸要认真了。'],
  threefold: ['三次重复……和棋啦。', '这局绕来绕去，最后谁也没赢。'],
  fiftyMove: ['五十回合没吃子，和棋。', '规则说和棋，小鲸听规则的。'],
  checkmateWin: ['将死！小鲸赢啦。', '结束啦。嘿嘿，这局是小鲸的。'],
  checkmateLose: ['呜……小鲸被将死了。', '不算不算，再来一局！'],
};

for (const [key, lines] of Object.entries(SPECIAL)) {
  T[key] = { _: lines };
}

const REACTIONS = ['嗯。', '哦？', '等等。', '行吧。', '……', '哈。', '好。', '是吗。'];
const TAILS = ['你说呢？', '我记下了。', '别急。', '继续。', '轮到你了。', '行吧。'];

const EN = {
  start: ['Go ahead. You are white.', 'New game. Sit.', 'Board is set.'],
  playerQuiet: ['Mm.', 'Fine.', 'I follow.', 'Let me see.'],
  playerCapture: ['You took my {captured}?', 'Fine, take it.'],
  herCapture: ['{captured} is mine.', 'Thanks.'],
  playerCheck: ['Check?', 'I see it.'],
  herCheck: ['Check.', 'Your move.'],
  playerBlunder: ['That move... are you sure?', 'You just gave me a piece.'],
  playerGood: ['Hm, nice move.', 'That is good.'],
  herBlunder: ['...Ah.', 'My mistake.'],
  herGood: ['This should be enough.', 'I calculated that.'],
  undo: ['Takeback?', 'Fine, I did not see it.'],
  resign: ['You resign?', 'Alright.'],
  win: ['It is over.', 'Good game.'],
  lose: ['...I lost.', 'Your game.'],
  draw: ['A draw.', 'Nobody won.'],
  idle: ['...', 'Are you still there?'],
};

function fill(text, ctx, locale) {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === 'piece') return locale === 'en' ? PIECE_EN[ctx.pieceKey] || 'piece' : PIECE_ZH[ctx.pieceKey] || '子';
    if (key === 'captured') return locale === 'en' ? PIECE_EN[ctx.capturedKey] || 'piece' : PIECE_ZH[ctx.capturedKey] || '子';
    return ctx[key] ?? '';
  });
}

function grams(text) {
  const chars = [...text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')];
  const out = new Set();
  for (let i = 0; i + 2 < chars.length; i += 1) out.add(chars.slice(i, i + 3).join(''));
  return out;
}

function similarity(a, b) {
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const g of A) if (B.has(g)) hit += 1;
  return hit / Math.min(A.size, B.size);
}

export class Banter {
  constructor(locale = 'zh') {
    this.locale = locale;
    this.recent = [];
    this.lastEvent = '';
    this.sameEvent = 0;
  }

  setLocale(locale) {
    this.locale = locale;
  }

  pool(event, mood) {
    const table = T[event] || T.idle;
    if (table[mood] && table[mood].length) return table[mood];
    return table._ || T.idle._;
  }

  pick(event, ctx = {}, mood = 'calm') {
    if (this.locale === 'en' && EN[event] && Math.random() < 0.7) {
      const text = fill(EN[event][Math.floor(Math.random() * EN[event].length)], ctx, 'en');
      this.remember(text, event);
      return text;
    }
    const cute = CUTE[event];
    const pool = cute && Math.random() < 0.55 ? cute : this.pool(event, mood);
    const fresh = pool.filter((line) => !this.recent.includes(line));
    const usable = fresh.length ? fresh : pool;
    const rich = usable.filter((line) => line.length >= 8);
    const candidatePool = rich.length && Math.random() < 0.72 ? rich : usable;
    let best = candidatePool[0];
    let bestScore = Infinity;
    for (const line of candidatePool) {
      let score = Math.random() * 0.35;
      for (const old of this.recent.slice(-8)) score += similarity(line, old);
      if (score < bestScore) {
        bestScore = score;
        best = line;
      }
    }
    let text = fill(best, ctx, this.locale);
    // 偶尔加一个短反应或尾巴，像真人在接话
    if (text.length > 4 && !/^(嗯|哦|哈|行|等等|……)/.test(text) && Math.random() < 0.12) {
      text = REACTIONS[Math.floor(Math.random() * REACTIONS.length)] + text;
    } else if (text.length > 4 && Math.random() < 0.08) {
      text = text.replace(/[。！？…]$/, '') + '，' + TAILS[Math.floor(Math.random() * TAILS.length)];
    }
    this.remember(best, event);
    return text;
  }

  remember(line, event) {
    this.recent.push(line);
    if (this.recent.length > 24) this.recent.shift();
    if (event === this.lastEvent) this.sameEvent += 1;
    else {
      this.lastEvent = event;
      this.sameEvent = 1;
    }
  }
}

/** 根据局面、事件和结果决定表情。 */
const EVENT_MOODS = {
  start: ['smile', 'calm', 'smug', 'determined', 'wink'],
  playerQuiet: ['calm', 'smile', 'thinking', 'tired', 'sleepy', 'wink', 'smug'],
  playerCapture: ['annoyed', 'angry', 'panic', 'panic', 'surprised', 'smug', 'pout'],
  herCapture: ['smug', 'laugh', 'wink', 'calm', 'love', 'love'],
  playerCheck: ['panic', 'panic', 'annoyed', 'surprised', 'determined'],
  herCheck: ['smug', 'wink', 'laugh', 'determined'],
  playerBlunder: ['laugh', 'smug', 'surprised'],
  playerGood: ['surprised', 'determined', 'love', 'love', 'smile', 'annoyed'],
  herBlunder: ['embarrassed', 'panic', 'panic', 'pout', 'cry'],
  herGood: ['smug', 'wink', 'determined', 'calm'],
  queenCapture: ['angry', 'panic', 'panic', 'surprised', 'cry'],
  undo: ['annoyed', 'pout', 'sad'],
  longGame: ['tired', 'sleepy', 'annoyed', 'calm'],
  playerThinkLong: ['tired', 'annoyed', 'sleepy', 'calm', 'thinking'],
  promotion: ['surprised', 'determined', 'wink', 'smug'],
  castle: ['calm', 'smile', 'annoyed', 'smug'],
  enPassant: ['surprised', 'wink', 'smug'],
  win: ['smug', 'laugh', 'wink', 'love'],
  lose: ['sad', 'cry', 'embarrassed', 'pout'],
  draw: ['calm', 'pout', 'tired'],
  idle: ['sleepy', 'tired', 'calm', 'thinking', 'smile'],
};

function avoidRecent(pool, recent) {
  if (!pool || !pool.length) return 'calm';
  const fresh = pool.filter((mood) => !recent.includes(mood));
  const usable = fresh.length ? fresh : pool;
  return usable[Math.floor(Math.random() * usable.length)];
}

export function chooseMood(input) {
  const {
    status = { state: 'playing' },
    evalWhite = 0,
    event = '',
    playerColor = 'white',
    inCheck = false,
    herTurn = false,
    moveCount = 0,
    recentMoods = [],
  } = input;

  if (status.state === 'checkmate') {
    const sheWins = (status.winner === 'white') !== (playerColor === 'white');
    return avoidRecent(sheWins ? ['smug', 'laugh', 'wink', 'calm'] : ['cry', 'sad', 'embarrassed'], recentMoods);
  }
  if (status.state === 'draw' || status.state === 'stalemate') return avoidRecent(['calm', 'pout', 'tired'], recentMoods);
  if (EVENT_MOODS[event]) return avoidRecent(EVENT_MOODS[event], recentMoods);
  if (event === 'longGame') return avoidRecent(['tired', 'sleepy', 'annoyed', 'calm'], recentMoods);
  if (event === 'playerThinkLong') return avoidRecent(['tired', 'annoyed', 'sleepy', 'calm', 'thinking'], recentMoods);
  if (event === 'playerCheck') return avoidRecent(inCheck ? ['panic', 'annoyed', 'surprised', 'determined'] : ['annoyed', 'smug', 'determined'], recentMoods);
  if (event === 'herCheck') return avoidRecent(['smug', 'wink', 'laugh', 'determined'], recentMoods);
  if (herTurn) return 'thinking';
  if (evalWhite > 260) return avoidRecent(['smug', 'smile', 'laugh', 'wink'], recentMoods);
  if (evalWhite < -260) return avoidRecent(['determined', 'sad', 'embarrassed', 'cry'], recentMoods);
  if (moveCount > 70) return avoidRecent(['tired', 'sleepy', 'annoyed'], recentMoods);
  return avoidRecent(['calm', 'smile', 'thinking', 'wink'], recentMoods);
}

/** 把引擎的一步棋转成台词上下文。 */
export function moveContext(move, san, historyLength = 0, extra = {}) {
  const key = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
  return {
    move: san || '',
    pieceKey: key[move?.piece & 7] || 'p',
    capturedKey: move?.captured ? key[move.captured & 7] : '',
    n: Math.floor(historyLength / 2) + 1,
    ...extra,
  };
}
