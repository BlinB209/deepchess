/** DeepSeek：亲近、认真陪下，偶尔小傲娇；玩笑针对棋局，不贬低玩家。 */
export const MOODS = ['calm', 'smile', 'smug', 'laugh', 'annoyed', 'angry', 'pout', 'panic', 'surprised', 'sad', 'cry', 'tired', 'thinking', 'wink', 'love', 'determined', 'embarrassed', 'sleepy'];
export const MOOD_LABEL = {
  zh: { calm: '平静', smile: '微笑', smug: '得意', laugh: '大笑', annoyed: '恼火', angry: '生气', pout: '鼓脸', panic: '慌张', surprised: '惊讶', sad: '沮丧', cry: '哭', tired: '疲惫', thinking: '思考', wink: '眨眼', love: '喜欢', determined: '认真', embarrassed: '害羞', sleepy: '困倦' },
  en: { calm: 'Calm', smile: 'Smile', smug: 'Smug', laugh: 'Laugh', annoyed: 'Annoyed', angry: 'Angry', pout: 'Pout', panic: 'Flustered', surprised: 'Surprised', sad: 'Sad', cry: 'Teary', tired: 'Tired', thinking: 'Thinking', wink: 'Wink', love: 'Fond', determined: 'Focused', embarrassed: 'Shy', sleepy: 'Sleepy' },
};
const PIECE_ZH = { p: '兵', n: '马', b: '象', r: '车', q: '后', k: '王' };
const PIECE_EN = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

const T = {
  start: {
    _: ['用户来啦。棋盘摆好啦，陪我下一局吧。', '坐这边，水给你倒好了。慢慢下就好。', '又能一起下棋啦。今天也请多指教哦。', '我准备好啦。这盘也想和你好好下完。', '新的一局，新的小冒险。开始吧？'],
    wink: ['今天的我有点厉害哦，你可要接住。', '先说好，棋盘上我可不会偷偷让着你哦。'],
    determined: ['我准备认真下啦。我们都好好发挥。', '这一盘，我会仔细想的。请多指教。'],
  },
  resume: { _: ['棋盘还替你留着呢。我们接着下？', '欢迎回来。上一手我还记着哦。', '你回来啦。我一直帮你看着棋盘呢。'] },
  playerQuiet: {
    _: ['嗯，看到啦。让我想想怎么接。', '你走这里呀……有点想知道你的下一步。', '好，这一步我记下了。', '嗯嗯，我在看。你按自己的节奏来。', '棋盘慢慢热闹起来啦。', '{move}，收到。现在换我想一想。', '唔……让我看看另一边。', '我们慢慢下，还有好多种走法呢。'],
    thinking: ['唔，这里我得多看一眼。', '让我想想，该怎么接住你这一步呢。', '你在准备什么呀？我有点好奇。'],
    smug: ['你这一步，我悄悄记在小本本上啦。', '哼哼，我也有自己的小计划。'],
    love: ['和你安安静静下一会儿，也挺好的。', '你认真看棋盘的样子，我有看到哦。'],
  },
  herQuiet: {
    _: ['我走{move}。轮到你啦。', '先走这里。你慢慢看。', '好啦，这一步交给你接。', '我走好啦。我等你。', '我想试试这样下。', '嗯，就这里。接下来换你的小计划啦。', '走好啦，有点期待你怎么接。'],
    smug: ['这一步，我藏了一点小心思哦。', '哼哼，我也有在认真布局。'],
    determined: ['稳稳走一步。我们继续。', '我想好了，走这里。'],
  },
  playerCapture: {
    _: ['呀，我的{captured}被你带走啦。', '你用{piece}吃了我的{captured}。这下换我想想。', '嗯，这个{captured}归你啦。我们继续。', '欸，吃到了。我得留心一点了。', '你下手好利落，我看见啦。'],
    pout: ['唔，我的{captured}……让我鼓一下脸，就一下。', '哼，这个{captured}先给你。下一步我要看仔细点。'],
    surprised: ['欸？原来你盯着我的{captured}呀。', '呀，这个{captured}还是被你吃到啦。'],
    sad: ['有点舍不得这个{captured}呢。不过还没结束。'],
  },
  herCapture: {
    _: ['你的{captured}，我收下啦。', '嘿，吃到一个{captured}。轮到你啦。', '我走{move}，把这个{captured}带走咯。', '这个{captured}先放我这边。你慢慢想。', '嗯，吃到了。我们接着看下一步。'],
    smug: ['这个{captured}归我。我有一点点得意。', '哼哼，这回是我先看到啦。'],
    laugh: ['嘿嘿，{captured}归我啦。', '吃到啦！让我开心一小下。'],
    wink: ['你的{captured}，我就不客气啦。', '谢谢款待～接下来可要看好哦。'],
  },
  playerCheck: {
    _: ['呀，将军了。让我找找应对。', '看到啦，我先照顾一下王。', '这一将接到了。我想想怎么走。', '{move}，将军。嗯，我会仔细看的。'],
    panic: ['欸，王被你盯上了！等我想一想。', '唔，有点紧张……先把这一将解开。'],
    determined: ['将军接到了。我认真算一下。', '好，这一步我得仔细应对。'],
  },
  herCheck: {
    _: ['将军哦。先看看王这边，别急。', '我走{move}，将军。你慢慢想。', '我将军啦。接下来要先应将哦。'],
    smug: ['哼哼，将到了。不过你慢慢想，我等着。', '这一将，算是我的小小回礼。'],
    wink: ['将军～你的王要挪挪位置啦。', '这一手接好哦。我有在认真下。'],
  },
  playerBlunder: {
    _: ['唔，这步可能有点亏。要不要再看看？', '这一步好像留了点破绽，我会接着下哦。', '这里可能漏看了一点。没关系，我们慢慢来。', '欸，这步我有机会了。下次记得多看一眼呀。', '这一手有点可惜。不过棋还没下完呢。'],
    surprised: ['欸？这一步和我想的不太一样，我再看看。'],
    smile: ['偶尔漏看很正常啦。我们继续，好不好？'],
    smug: ['这步是{verdict}哦。{move} 一落，我就不客气了。', '臭棋哦。{move} 这步我记在小本本上了。'],
    laugh: ['这步棋有点臭哦。{move} 是送给我的大礼吗？', '欸，你走神啦？那我可要收下这份礼物了。', '这步{verdict}……我都替你捏把汗。'],
  },
  playerGood: {
    _: ['这步好看！我有被惊艳到。', '嗯，这一步我很喜欢。你想得好仔细。', '好棋。我也得加把劲啦。', '你认真起来，我还真有点招架不住。'],
    love: ['这步下得真漂亮。我喜欢和你这样认真下棋。'],
    determined: ['接得漂亮。让我也认真回应你。'],
    panic: ['等等，这步好棋……我有点慌。让我重新算。', '你这一步下得我心跳快了一拍。', '唔，这步让我有点怕。你什么时候想到的？'],
    surprised: ['这步好棋！我完全没想到。', '欸，你认真起来这么厉害的吗。'],
  },
  herBlunder: {
    _: ['唔……这一步是我没看仔细。', '呀，刚才漏看了。我也会犯迷糊呢。', '走完才发现有点不对。下一步得认真啦。'],
    embarrassed: ['呜，被你发现我漏算啦。让我缓一小下。', '刚才那步……有一点点丢脸。我下次看仔细。'],
    pout: ['唔，这步走得不好。我有点不甘心。'],
    sad: ['……这步是臭棋。我自己知道。', '唔，我怎么会走这里。让我缓一小下。'],
  },
  herGood: {
    _: ['这一步我挺满意的。轮到你啦。', '唔，应该接住了。我们继续。'],
    smug: ['这步好棋是我下的。哼哼，夸我。', '看，这步我算到了。'],
    wink: ['这步不错吧？我可是认真想过的。'],
  },
  opening: {
    _: ['{opening}。这个开局我记下了。', '哦，{opening}呀。你是有备而来？', '开局走到{opening}了。我们慢慢看。'],
  },
  herThink: { _: ['唔，让我想一会儿……', '这里有几种走法，我挑一挑。', '我在认真算哦，稍等我一下。', '让我把这几步理顺……'] },
  playerThinkLong: { _: ['用户慢慢想，我陪着你呢。', '这一步不着急。想好了再走就行。', '要喝口水吗？棋盘我替你看着。', '我在呢。你按自己的节奏想。'], tired: ['我伸个懒腰。你慢慢想，我还在哦。'], sleepy: ['唔……有一点困，不过我还陪着你。'] },
  idle: { _: ['用户还在吗？我在这里哦。想继续下的时候叫我就好。', '你先忙一会儿也没关系，棋盘给你留着。', '我安静陪你待一会儿。', '要歇一歇吗？我们不用赶时间。'], sleepy: ['哈……我眯一小会儿。你回来再继续。', '唔，棋盘不会跑。你回来叫我哦。'] },
  lowMaterial: { _: ['子不多啦，每一步都值得仔细想。', '残局了。我们慢慢把它下好。'] },
  longGame: { _: ['已经一起下了好久啦。记得活动一下肩膀哦。', '这盘好长。我还想陪你把它下完。'], tired: ['我伸个懒腰。你也休息一下肩膀吧。'], sleepy: ['哈……有点困啦。要不要先歇一会儿？'] },
  undo: { _: ['好呀，已经退回去啦。这次慢慢看。', '没关系，重想一下嘛。我等你。', '这盘第{undos}次悔棋，记在小本本上啦。开玩笑的，慢慢来。', '退好啦。想试另一种走法？'], pout: ['又退一步呀。哼，那这次要好好想哦。'], smile: ['当然可以。一起琢磨才有意思嘛。'] },
  resign: { _: ['好，这盘先到这里。辛苦啦，陪我下了这么久。', '收到啦。下棋也要看心情，想再下的时候我都在。', '那我收下这一局。下一盘还陪你哦。'], smug: ['哼哼，这局归我啦。下次还来找我，好不好？'] },
  win: {
    _: ['我赢啦！谢谢你陪我下这一盘。', '这局我收下啦。用户有几手走得很漂亮哦。', '结束啦。和你下棋很开心，还想再来吗？'],
    smug: ['嘿嘿，这回是我赢。让我得意一小会儿。', '哼哼，今天的我也有好好发挥。再来？'],
    laugh: ['赢啦！开心一下，然后陪你再下一局。'], wink: ['这局归我啦。下一盘等你来挑战哦。'], love: ['能和你认真下完一局，我就很开心啦。'],
  },
  lose: {
    _: ['这盘你赢啦。下得漂亮，我服气。', '唔，我输了。谢谢你陪我下到最后。', '这局是你的啦。我想再琢磨一下刚才那几步。'],
    sad: ['有一点点失落……不过你赢得很漂亮。', '唔，我还想把刚才那一步想明白。'],
    cry: ['呜，我输了……缓一小会儿，还想和你下。', '好可惜呀。让我难过一下下，再来陪你。'],
    pout: ['哼，有点不甘心。下一盘再和我试试嘛。', '这局算你的。我想再挑战一次！'], embarrassed: ['被你下赢啦。我要回去补补课了。'],
  },
  draw: { _: ['和棋啦。两个人都守住了呢。', '这一盘谁也没赢，不过下得很开心。', '平局收场。想再来一局吗？'], pout: ['唔，就差一点点。不过和你下得很尽兴。'] },
  rematch: { _: ['好呀，再陪你下一局。', '再来！我这次也会好好下。'] },
  promotion: { _: ['你的兵升成{promotion}啦。小兵也长大了呢。', '呀，升变成{promotion}了！我得认真应对。'] },
  herPromotion: { _: ['我的兵升成{promotion}啦。一路走到这里，真不容易。', '我选了{promotion}。接下来轮到你啦。'], smug: ['嘿，小兵变成{promotion}啦。让我小小得意一下。'] },
  castle: { _: ['王车易位啦。给王安个小窝。', '你把王安顿好啦，我也得看看自己的布局。'] },
  herCastle: { _: ['我易位啦。先给王找个安心的位置。', '王和车换好位置啦。轮到你。'] },
  enPassant: { _: ['吃过路兵！你有记得这条规则呢。', '呀，这个兵路过也被你抓到啦。'] },
  herEnPassant: { _: ['这个路过的兵，我收下啦。是吃过路兵哦。', '我走吃过路兵。嘿，这条规则正好用上。'] },
  queenCapture: { _: ['呀，我的后被吃掉啦。接下来得更仔细了。', '唔，后没了……我还会好好接着下。'], angry: ['我的后呀……哼，我要认真把这盘下回来。'], panic: ['欸，我的后！让我先缓一小下。'], pout: ['哼，我的后被你带走了。有点舍不得呢。'] },
  herQueenCapture: { _: ['你的后，我收下啦。棋还没结束，我们继续。', '吃到后啦。下一步也得认真看。'], smug: ['哼哼，这个后归我啦。我有点得意了。'], surprised: ['欸，我吃到你的后啦。让我再看一眼棋盘。'] },
  drawOffer: { _: ['用户想和棋呀？让我看看现在的局面。', '收到提和。我想一小会儿。'] },
  drawRefuse: { _: ['这盘我还想接着下，可以再陪我走几步吗？', '唔，现在先不和啦。我还想试试别的走法。', '我还想认真下完这一盘。我们继续吧。'], smug: ['哼哼，我还有小计划呢。先不和啦。'], pout: ['唔，还没下够呢。再陪我走几步嘛。'] },
  poke: {
    _: ['呀，怎么突然戳我。我有在陪你呀。', '欸？我在呢。你是不是想让我看看你？', '会痒啦。好啦，我看到你了。', '再戳要收费了哦……一盘棋就好。'],
    love: ['你、你突然靠过来，我会害羞的。', '好啦，知道你在。我也在呀。', '再陪你待一会儿。就一会儿哦。'],
    embarrassed: ['呀……别突然戳嘛。', '你这样，我会忘记刚才算到哪的。'],
    annoyed: ['哼，先让我把这一步想完嘛。', '等一下下，我的思路要被戳跑啦。'],
    pout: ['哼，又戳。我的脸可不是按钮哦。', '你手真闲……那就陪我好好下棋嘛。'],
    laugh: ['哈哈，会痒的啦。', '别闹，我要笑得算不动棋了。'],
    panic: ['先等一下嘛，我的王还被将着呢。'], sleepy: ['唔……我醒着呢。你回来啦？'],
    sad: ['唔，陪我缓一小会儿吧。', '被你戳一下，好像没那么失落了。'], cry: ['呜……我在呢。让我缓一小会儿。'],
  },
  firstCapture: { _: ['呀，这盘第一个被吃的子是我的{captured}。记住啦。', '第一次吃子啦。你的小计划开始了？'] },
  herFirstCapture: { _: ['嘿，我先吃到一个{captured}。这盘热闹起来啦。', '这盘第一次吃子，是我先动手啦。'] },
  firstCheck: { _: ['欸，这盘第一次将军。我认真接招啦。', '第一次将军就到了呀。让我好好想一下。'] },
  herFirstCheck: { _: ['我第一次将军啦。别急，你慢慢看。', '这一将先送给你。我也在认真下哦。'] },
  queenTrade: { _: ['两个后都离场啦。接下来换别的棋子努力。', '双方的后都没了呢。我们慢慢下后面的棋。'] },
  underpromotion: { _: ['升成了{promotion}呀！这个选择有点意思。', '你选了{promotion}。让我想想这里面的用意。'] },
  herUnderpromotion: { _: ['我这次选{promotion}。想试试不一样的走法。', '我升成{promotion}啦。小兵也有自己的小计划。'] },
  comeback: { _: ['你把局面扳回来啦。刚才那几步真有韧劲。', '欸，现在轮到我努力追上你了。'] },
  herComeback: { _: ['唔，我把局面追回来一点啦。还得稳住。', '现在轮到你接招啦。我们都别松劲哦。'] },
  blunderStreak: { _: ['好像连续几步都漏看了一点。要不要歇一下眼睛？', '这几步有点可惜。别着急，我陪你慢慢理。'] },
  longGameSpecial: { _: ['已经一起下了五十回合啦。记得喝口水哦。', '这盘下了好久呢。谢谢你一直陪着我。'] },
  lowMaterialSpecial: { _: ['子不多了呢。我们一起把残局下好吧。', '棋盘空下来啦。我要仔细看住每一步。'] },
  threefold: { _: ['同一个局面出现三次啦，按规则和棋。', '我们绕回这里三次了呢。这盘平局收场。'] },
  fiftyMove: { _: ['连续五十回合都没有吃子或走兵，和棋啦。', '五十回合规则到了呢。这盘算平局。'] },
  checkmateWin: { _: ['将死，我赢啦。谢谢你陪我下到最后。', '嘿嘿，这局是我的。还想和你再下一盘。'] },
  checkmateLose: { _: ['被你将死啦。这一局下得漂亮，我记住了。', '呜，我输了……有点不甘心，再陪我来一局嘛。'] },
  callback: { _: ['这盘已经有{blunders}次漏看啦。要不要放慢一点？', '我记着呢。不着急，我们一点点看清楚。'] },
};

const EN = {
  start: ['You are here! Shall we play a game?', 'The board is ready. Take your time.'], resume: ['Welcome back. Shall we carry on?', 'I kept the board ready for you.'],
  playerQuiet: ['I see. Let me think about that.', '{move}. I wonder what you have planned.'], herQuiet: ['I play {move}. Your turn.', 'All done. Take your time.'],
  playerCapture: ['Ah, you took my {captured}. Let me think.', 'That {captured} is yours. We play on!'], herCapture: ['I will take your {captured}. Your turn!', 'Got a {captured}! Let me enjoy that for a moment.'],
  playerCheck: ['Check! Let me find a way out.', 'I see the check. I need to think carefully.'], herCheck: ['Check. Take your time with this one.', 'I play {move}, with check.'],
  playerBlunder: ['That might lose something. Want another look?', 'There may be a gap there. We can take it slowly.', 'That move is a bit stinky. I will take the gift.', 'A blunder? I will not say no.'], herBlunder: ['Oops. I missed something there.', 'A little embarrassing... I need to look more carefully.', 'That was a bad move. I know.'], opening: ['{opening}. I know this line.', 'Oh, {opening}. You came prepared?', 'We are in the {opening}. Let us see.'],
  playerGood: ['Lovely move! I need to keep up.', 'That was well played.', 'Wait, that is a strong move. I am a little scared.', 'That move made my heart jump.'], herGood: ['I like this move. Your turn!', 'I think that works. Let us continue.', 'That was a good move from me. Praise me.'],
  herThink: ['Hmm, let me work this out...', 'A few choices here. Give me a moment.'], playerThinkLong: ['Take your time. I am here.', 'A sip of water? There is no rush.'], idle: ['I am here when you are ready.', 'We can take a break. I will keep the board ready.'],
  lowMaterial: ['Not many pieces left. Let us play carefully.'], longGame: ['We have played for a while. Time for a little stretch?'],
  undo: ['Of course. Try a different idea!', 'Move taken back. Take your time.'], resign: ['We can stop here. Thank you for playing with me.', 'I will take this game. Come play again sometime!'],
  win: ['I won! Thank you for the game.', 'This one is mine. May I be a little pleased?'], lose: ['You won. Well played!', 'A little disappointed... but I would love another game.'], draw: ['A draw. I enjoyed playing with you.', 'We both held on. Another game?'], rematch: ['Yes! Let us play again.'],
  promotion: ['Your pawn became a {promotion}!'], herPromotion: ['My pawn became a {promotion}!'], castle: ['You castled. A little shelter for your king.'], herCastle: ['I castled. My king has a little shelter now.'],
  enPassant: ['En passant! You remembered that rule.'], herEnPassant: ['I take that pawn en passant. Your turn!'], queenCapture: ['Ah, my queen! I need to be careful now.'], herQueenCapture: ['I took your queen. Let us keep playing carefully.'],
  drawOffer: ['A draw offer? Let me look at the position.'], drawRefuse: ['I would like to play on a little longer.', 'Not yet. I still have a little plan.'], poke: ['Ah! That tickles.', 'I am here. Did you want my attention?', 'One more poke costs one more game!'],
  firstCapture: ['You took the first piece, my {captured}!'], herFirstCapture: ['I took the first piece, your {captured}!'], firstCheck: ['Your first check! Let me think carefully.'], herFirstCheck: ['My first check! Take your time.'], queenTrade: ['Both queens have left the board. We play on.'],
  underpromotion: ['You chose a {promotion}! An interesting choice.'], herUnderpromotion: ['I chose a {promotion}. A little change of plan.'], comeback: ['You turned the position around. Nicely fought!'], herComeback: ['I managed to turn things around. I need to stay focused.'],
  blunderStreak: ['A few things slipped by. Want to rest your eyes?'], longGameSpecial: ['Fifty full moves together! Remember to have some water.'], lowMaterialSpecial: ['The endgame is here. Let us play it carefully.'], threefold: ['The same position three times. A draw by repetition.'], fiftyMove: ['Fifty moves without a capture or pawn move. A draw.'],
  checkmateWin: ['Checkmate! I won. Thank you for playing with me.'], checkmateLose: ['You checkmated me. Well played! Another game?'], callback: ['A few things slipped by this game. We can slow down.'],
};
const START_BLACK = {
  zh: ['这次你执黑，我先走哦。我准备好啦。', '你拿黑棋呀。那我先走一步，你慢慢接。'],
  en: ['You have black this time, so I will start.', 'I will play white. Ready for a game?'],
};
const DIFFICULTY = {
  zh: {
    easy: ['好呀，我放松一点。我们慢慢玩。', '摸鱼模式。今天就轻轻松松下吧。'], normal: ['陪练模式。一起找找棋盘上的小机会吧。', '嗯，我陪你练一盘。'], hard: ['我要认真啦。我们都好好发挥。', '认真模式。这一盘也请多指教哦。'],
    sharp: ['进阶模式。我会比刚才更专注一点。', '好，进阶模式。我们下得细一点吧。'],
    whale: ['鲸鱼模式。哼哼，我要拿出本事啦。', '好，鲸鱼模式。这盘我会仔细算哦。'], master: ['深渊模式。我会想久一点，陪我认真下一盘吧。', '那就拿出全力啦。你也要好好接招哦。'],
  },
  en: { easy: ['A relaxed game, then. Let us have fun.'], normal: ['Practice mode. Let us explore together.'], hard: ['Time to focus. Let us both play our best.'], sharp: ['Advanced mode. I will focus a little more.'], whale: ['Whale mode! I will think carefully.'], master: ['Abyss mode. I may think longer. Let us give it our best.'] },
};

function fill(text, ctx, locale) {
  const pieces = locale === 'en' ? PIECE_EN : PIECE_ZH;
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === 'piece' || key === 'captured' || key === 'promotion') return pieces[ctx[`${key}Key`]] || (locale === 'en' ? 'piece' : '棋子');
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
  const A = grams(a), B = grams(b);
  if (!A.size || !B.size) return a === b ? 1 : 0;
  let hit = 0;
  for (const g of A) if (B.has(g)) hit += 1;
  return hit / Math.min(A.size, B.size);
}

export class Banter {
  constructor(locale = 'zh', random = Math.random) {
    this.locale = locale;
    this.random = random;
    this.recent = [];
    this.lastEvent = '';
    this.sameEvent = 0;
  }
  setLocale(locale) { this.locale = locale; }
  tableFor(event, ctx = {}) {
    const lang = this.locale === 'en' ? 'en' : 'zh';
    if (event === 'difficulty') return DIFFICULTY[lang][ctx.difficulty] || DIFFICULTY[lang].hard;
    if (event === 'start' && ctx.playerColor === 'black') return START_BLACK[lang];
    if (ctx.byPlayer === false) event = ({ promotion: 'herPromotion', castle: 'herCastle', enPassant: 'herEnPassant' })[event] || event;
    if (lang === 'en') return { _: EN[event] || EN.idle };
    return T[event] || T.idle;
  }
  pool(event, mood, ctx = {}) {
    const table = this.tableFor(event, ctx);
    if (Array.isArray(table)) return table;
    return [...(table[mood] || []), ...(table._ || [])];
  }
  pickDetailed(event, ctx = {}, mood = 'calm', remember = true) {
    const table = this.tableFor(event, ctx);
    // Use every mood-specific pool, not only the currently guessed mood.
    // The selected line then decides the portrait mood, so more of the
    // corpus is reachable while line and expression still agree.
    const entries = Array.isArray(table) ? [[null, table]] : Object.entries(table);
    const all = [];
    for (const [lineMood, lines] of entries) {
      for (const raw of lines) {
        if (raw.includes('{move}') && !ctx.move) continue;
        if (raw.includes('{captured}') && !ctx.capturedKey) continue;
        const text = fill(raw, ctx, this.locale);
        if (text && !all.some((candidate) => candidate.text === text)) {
          all.push({ text, mood: lineMood === '_' ? null : lineMood });
        }
      }
    }
    if (!all.length) {
      const text = this.locale === 'en' ? 'Let me look at the board.' : '唔，让我看看棋盘。';
      if (remember) this.remember(text, event);
      return { text, mood: null };
    }
    const fresh = all.filter((candidate) => !this.recent.includes(candidate.text));
    const oldest = Math.min(...all.map((candidate) => this.recent.lastIndexOf(candidate.text)));
    const candidates = fresh.length ? fresh : all.filter((candidate) => this.recent.lastIndexOf(candidate.text) === oldest);
    let best = candidates[0], bestScore = Infinity;
    for (const candidate of candidates) {
      let score = this.random() * 0.8;
      for (const old of this.recent.slice(-8)) score += similarity(candidate.text, old);
      if (score < bestScore) { bestScore = score; best = candidate; }
    }
    if (remember) this.remember(best.text, event);
    return best;
  }
  pick(event, ctx = {}, mood = 'calm', remember = true) {
    const pool = [...new Set(this.pool(event, mood, ctx)
      .filter((line) => !line.includes('{move}') || ctx.move)
      .filter((line) => !line.includes('{captured}') || ctx.capturedKey)
      .map((line) => fill(line, ctx, this.locale)))];
    if (!pool.length) pool.push(this.locale === 'en' ? 'Let me look at the board.' : '唔，让我看看棋盘。');
    const fresh = pool.filter((line) => !this.recent.includes(line));
    const oldest = Math.min(...pool.map((line) => this.recent.lastIndexOf(line)));
    const candidates = fresh.length ? fresh : pool.filter((line) => this.recent.lastIndexOf(line) === oldest);
    let best = candidates[0], bestScore = Infinity;
    for (const line of candidates) {
      let score = this.random() * 0.8;
      for (const old of this.recent.slice(-8)) score += similarity(line, old);
      if (score < bestScore) { bestScore = score; best = line; }
    }
    if (remember) this.remember(best, event);
    return best;
  }
  remember(line, event) {
    this.recent.push(line);
    if (this.recent.length > 80) this.recent.shift();
    this.sameEvent = event === this.lastEvent ? this.sameEvent + 1 : 1;
    this.lastEvent = event;
  }
}

const EVENT_MOODS = {
  start: ['smile', 'wink', 'determined'], resume: ['smile', 'calm'], playerCapture: ['surprised', 'pout', 'sad'], herCapture: ['smile', 'smug', 'laugh', 'wink'],
  playerCheck: ['surprised', 'panic', 'determined'], herCheck: ['smug', 'wink', 'determined'], playerBlunder: ['laugh', 'smug', 'surprised', 'thinking'], playerGood: ['panic', 'panic', 'surprised', 'determined', 'love'], herBlunder: ['sad', 'sad', 'embarrassed', 'pout'], herGood: ['smug', 'smug', 'wink', 'determined', 'smile'], opening: ['thinking', 'calm', 'smug'],
  queenCapture: ['panic', 'pout', 'angry'], herQueenCapture: ['smug', 'surprised', 'wink'], firstCapture: ['surprised', 'pout'], herFirstCapture: ['smile', 'smug'], firstCheck: ['panic', 'determined'], herFirstCheck: ['wink', 'smug'],
  queenTrade: ['calm', 'surprised', 'determined'], underpromotion: ['surprised', 'thinking'], herUnderpromotion: ['wink', 'determined'], comeback: ['surprised', 'determined'], herComeback: ['smile', 'determined'], blunderStreak: ['thinking', 'smile'], lowMaterialSpecial: ['determined', 'thinking'],
  longGameSpecial: ['tired', 'smile'], longGame: ['tired', 'sleepy'], playerThinkLong: ['calm', 'smile'], herThink: ['thinking'], undo: ['smile', 'pout', 'calm'], drawOffer: ['thinking'], drawRefuse: ['pout', 'smile'],
  resign: ['smile', 'calm'], win: ['smug', 'laugh', 'wink', 'love'], lose: ['sad', 'cry', 'pout'], draw: ['calm', 'smile', 'pout'], lowMaterial: ['thinking', 'determined'], promotion: ['surprised', 'determined'], castle: ['calm', 'smile'], enPassant: ['surprised', 'wink'],
};
function avoidRecent(pool, recent, random) {
  const fresh = pool.filter((mood) => !recent.includes(mood));
  const noRepeat = pool.filter((mood) => mood !== recent.at(-1));
  const usable = fresh.length ? fresh : noRepeat.length ? noRepeat : pool;
  return usable[Math.floor(random() * usable.length)];
}
export function chooseMood(input, random = Math.random) {
  const { status = { state: 'playing' }, evalWhite = 0, event = '', playerColor = 'white', inCheck = false, herTurn = false, moveCount = 0, recentMoods = [] } = input;
  const pick = (pool) => avoidRecent(pool, recentMoods, random);
  if (status.state !== 'playing') {
    if (!status.winner) return pick(['calm', 'smile', 'pout']);
    return pick(status.winner !== playerColor ? ['smug', 'laugh', 'wink'] : ['sad', 'cry', 'pout']);
  }
  if (EVENT_MOODS[event]) return pick(EVENT_MOODS[event]);
  if (event === 'idle') return pick(moveCount >= 70 ? ['sleepy', 'tired', 'calm'] : ['calm', 'smile', 'love']);
  if (inCheck && herTurn) return pick(['panic', 'determined']);
  const herScore = evalWhite * (playerColor === 'white' ? -1 : 1);
  if (herScore < -260) return pick(['thinking', 'determined']);
  if (herScore > 260) return pick(['smile', 'smug', 'wink']);
  return pick(herTurn ? ['thinking', 'calm'] : ['calm', 'smile', 'wink', 'love']);
}
export function moveContext(move, san, historyLength = 0, extra = {}) {
  const key = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
  return { move: san || '', pieceKey: key[move?.piece & 7] || 'p', capturedKey: move?.captured ? key[move.captured & 7] : '', promotionKey: move?.promotion ? key[move.promotion & 7] : '', n: Math.ceil(historyLength / 2) || 1, ...extra };
}
