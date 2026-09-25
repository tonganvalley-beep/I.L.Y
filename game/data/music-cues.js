(() => {
'use strict';
// 剧情音乐集中表。与生成式剧情文件分开，重新生成章节时不会丢失配乐设置。
const nodeCues = {
  // 注意：这里的键必须是剧本里真实存在的节点 id。序章起始节点是 s01_intro，
  // 写成 s01 会导致开场 BGM 永远匹配不上（历史遗留错误，已修正）。
  s01_intro: 'bgm-prologue-ambient',
  s05j: 'bgm-blue-music-box',
  // 第一章主题曲从章首标题卡就起（2026-09-25 二次修正）。历史：
  //   · cue 原本挂 ch1_s02，但它被 ch1_019→ch1_021 绕开（不可达）→ 整章从不切歌；
  //   · 移到 ch1_021 后，海边开场（ch1_002~019）仍是旧设计的整段静音，
  //     存档落在这一段读出来还是无声。现在直接挂章首 ch1_s01，沿链延续到章尾。
  ch1_s01: 'bgm-ch1-neo',
  ch2_s01: 'bgm-ch2-confession',
  // 第二章「留下」支线 → 中间结局（Just two of us）专用曲，从 S07-E 首拍一路延续到 END 卡。
  // 历史：原 cue 挂 ch2_s07-e，被新链路绕开（不可达）→ 2026-09-25 移到 ch2_243；
  // 同日用户要求整段 S07-E 都用这首 → 再上移到 S07-E 实际首拍 ch2_218。
  ch2_218: 'bgm-ending-just2',
  ch3_s01: 'bgm-true-airi-melancholic',
  her_chapter_prologue: 'bgm-heroine-memory',
  // 女主章结尾的静音原本挂在 her_chapter_07（「终章前｜尘土」卡）上，但 07 段改版后
  // 06-05 末拍直接 next 到 her_scene_07_01，her_chapter_07 被绕开（不可达）→ 静音丢失，
  // 女主章结尾到最终章开头会一直残留 bgm-heroine-memory。2026-09-25 移到 07 段实际首拍。
  her_scene_07_01: null,
  fin_s03: null,
  fin_s04: 'bgm-final-farewell',
  fin_s06: 'bgm-ending-voyager',
  // 第三章选择「接通日日谷小姐的电话」→ 十年之后的现实结局（B 线 END）专用曲。
  ch3_s07b: 'bgm-ending-reality'
};
// 章节兜底曲：读档落在一段没有任何显式 cue 的剧情里时用得上
// （例如某章整段都靠上一首曲子延续，但从存档进入时"上一首"并不存在）。
const chapterCues = {
  prologue: 'bgm-prologue-ambient',
  chapter1: 'bgm-ch1-neo',
  chapter2: 'bgm-ch2-confession',
  chapter3: 'bgm-true-airi-melancholic',
  heroine: 'bgm-heroine-memory',
  final: 'bgm-final-farewell'
};
const volumes = {
  'bgm-prologue-ambient': 0.34,
  'bgm-ch1-neo': 0.38,
  'bgm-ch2-confession': 0.36,
  'bgm-true-airi-melancholic': 0.34,
  'bgm-blue-music-box': 0.30,
  'bgm-heroine-memory': 0.34,
  'bgm-final-farewell': 0.34,
  'bgm-ending-voyager': 0.38,
  'bgm-ending-reality': 0.42,
  'bgm-ending-just2': 0.42
};
function musicCueFor(nodeId, node) {
  if (Object.hasOwn(node || {}, 'bgm')) return node.bgm;
  return Object.hasOwn(nodeCues, nodeId) ? nodeCues[nodeId] : undefined;
}
// 单个节点上写死的 cue（含显式的 null = 静音），没有就返回 undefined。
function ownCue(nodeId, node) {
  return musicCueFor(nodeId, node);
}
/* 推进字段名：剧情不只沿 node.next 走 —— 步行 / 走廊 / 手机这些玩法把出口写在
   各自的配置对象里（walk.exitNext、corridor.next、phone.exitNext、phone.onLink）。
   漏掉任何一条，它下游整条链的反查就断在这里，直接掉到章节兜底曲。
   （历史 bug：序章隧道步行的 walk.exitNext 没被索引，s07_exit 之后的整段序章
     读档时只会放 bgm-prologue-ambient，而实际在放的是 bgm-blue-music-box。）
   这里统一递归扫节点里所有叫这几个名字的字符串字段，深度限死；
   只采信真的指向已存在节点的值，免得把玩法数据里的同名键当成边。 */
const LINK_KEYS = ['next', 'exitNext', 'onLink'];
const LINK_DEPTH = 3;
function collectLinks(node) {
  const out = [];
  const walk = (value, depth) => {
    if (!value || typeof value !== 'object' || depth > LINK_DEPTH) return;
    for (const [key, child] of Object.entries(value)) {   // 数组的 entries 是下标，同样会被走一遍
      if (typeof child === 'string') { if (LINK_KEYS.includes(key)) out.push(child); }
      else walk(child, depth + 1);
    }
  };
  walk(node, 1);
  return out;
}
/* 各章入口：正向可达性从这里出发，这些节点即使没有入边也是"活着"的。 */
function chapterRoots(story) {
  const roots = [];
  if (typeof story?.start === 'string') roots.push(story.start);
  const stories = ILY.data?.stories || {};
  for (const key of story?.chapters || Object.keys(stories)) {
    const start = stories[key]?.start;
    if (typeof start === 'string') roots.push(start);
  }
  return roots;
}
/* 入边索引：从某个节点往回找"最近一次显式切歌"。
   音乐的语义是沿 next 链向后延续，所以存档点正在放的那首，
   就是它在剧情链上最近的那个带 cue 的祖先节点。
   只构建一次，按 story 对象缓存（story 每次进游戏重建，WeakMap 不会泄漏）。 */
const parentCache = new WeakMap();
function parentIndex(story) {
  if (!story || typeof story !== 'object') return new Map();
  const nodes = story.nodes || {};
  const count = Object.keys(nodes).length;
  const cached = parentCache.get(story);
  // 剧本编辑器现场增删节点后索引会过期，节点数变了就重建一次。
  if (cached && cached.count === count) return cached.index;
  const index = new Map();
  const link = (from, to) => {
    let list = index.get(to);
    if (!list) index.set(to, list = []);
    list.push(from);
  };
  // 1) 收集全部真实推进边
  const outEdges = new Map();
  for (const [id, node] of Object.entries(nodes)) {
    if (!node || typeof node !== 'object') continue;
    const targets = [];
    for (const to of collectLinks(node)) if (to !== id && nodes[to]) targets.push(to);
    if (targets.length) outEdges.set(id, [...new Set(targets)]);
  }
  // 2) 正向可达性标记：从各章起点走不到的节点是"幽灵节点"。
  //    ch1_s01 就是典型 —— 它没有任何入边（第一章真正的起点是 ch1_002），
  //    却带着 ch1_s01: null 的静音 cue 挂在 ch1_002 前面；
  //    不排除的话，反查 ch1_002 只会认这个幽灵祖先，读档出来就是一片死寂。
  const alive = new Set();
  const stack = chapterRoots(story).filter(id => nodes[id]);
  for (const id of stack) alive.add(id);
  while (stack.length) {
    for (const to of outEdges.get(stack.pop()) || []) {
      if (!alive.has(to)) { alive.add(to); stack.push(to); }
    }
  }
  // 3) 建反向索引，两端都活着才算一条边（拿不到起点就退回全部边，宁可猜错也别全空）
  const prune = alive.size > 0;
  for (const [from, targets] of outEdges) {
    if (prune && !alive.has(from)) continue;
    for (const to of targets) if (!prune || alive.has(to)) link(from, to);
  }
  parentCache.set(story, { index, count });
  return index;
}
/* 分层回溯最近一次显式切歌（BFS：先看最近的，再一层层往外）。
   accept 用来把搜索限制在同一章节里：章节之间存在跨章跳转
   （第一章结局直接接到第三章中段等），不限制的话"最近的祖先"可能落到上一章，
   读档就又会放错章的曲子。 */
function searchCue(index, nodes, startId, accept) {
  const seen = new Set([startId]);
  let layer = [startId];
  while (layer.length) {
    const found = [];
    const nextLayer = [];
    for (const id of layer) {
      for (const parent of index.get(id) || []) {
        if (seen.has(parent) || !accept(parent)) continue;
        seen.add(parent);
        if (ownCue(parent, nodes[parent]) !== undefined) found.push(parent);
        nextLayer.push(parent);
      }
    }
    if (found.length) {
      // 同一层里优先取真正的曲目：只有这一层全是显式静音时才算静音，
      // 免得某条旁支上的静音节点盖掉主线还在放的曲子。
      // 层与层之间不再跳过静音 —— 图修正之后，"最近一层是静音"就是真的在静音
      // （例如女主章结尾 her_chapter_07 的静音一路延续到最终章 fin_s01..fin_140），
      // 这里强行再往外找一首曲子，读档反而会和实际剧情不符。
      const pick = found.find(id => ownCue(id, nodes[id]) !== null) || found[0];
      return ownCue(pick, nodes[pick]);
    }
    layer = nextLayer;
  }
  return undefined;
}
/* 读档专用：算出"如果一路正常玩到这里，此刻应该在放哪首"。
   注意这是**兜底**手段 —— 正常流程下 main.js 直接用 state.music（进节点时真实在放的那首），
   只有旧存档没有这个字段时才走这里反推。
   1) 节点自己带 cue → 直接用；
   2) 沿入边回溯本章内最近一次切歌；
   3) 本章没有任何 cue（例如章节起点的前几格靠上一章延续）→ 放宽到全图再找一次；
   4) 都没有 → 该章节的兜底曲。 */
function musicCueAt(story, nodeId) {
  const nodes = story?.nodes || {};
  const start = nodes[nodeId];
  if (!start) return undefined;
  const direct = ownCue(nodeId, start);
  if (direct !== undefined) return direct;
  const index = parentIndex(story);
  const chapter = start.chapter || 'prologue';
  const inChapter = id => (nodes[id]?.chapter || 'prologue') === chapter;
  const local = searchCue(index, nodes, nodeId, inChapter);
  if (local !== undefined) return local;
  const global = searchCue(index, nodes, nodeId, () => true);
  if (global !== undefined) return global;
  return Object.hasOwn(chapterCues, chapter) ? chapterCues[chapter] : undefined;
}
Object.assign(ILY, { musicCueFor, musicCueAt, musicVolumes: volumes, musicChapterCues: chapterCues });
})();
