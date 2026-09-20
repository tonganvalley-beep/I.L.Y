(() => {
'use strict';
// 剧情音乐集中表。与生成式剧情文件分开，重新生成章节时不会丢失配乐设置。
const nodeCues = {
  s01: 'bgm-prologue-ambient',
  s05j: 'bgm-blue-music-box',
  ch1_s01: null,
  ch1_s02: 'bgm-ch1-neo',
  ch2_s01: 'bgm-ch2-confession',
  ch3_s01: 'bgm-true-airi-melancholic',
  her_chapter_prologue: 'bgm-heroine-memory',
  her_chapter_07: null,
  fin_s03: null,
  fin_s04: 'bgm-final-farewell',
  fin_s06: 'bgm-ending-voyager',
  ch3_s07b: 'bgm-ending-voyager'
};
const volumes = {
  'bgm-prologue-ambient': 0.34,
  'bgm-ch1-neo': 0.38,
  'bgm-ch2-confession': 0.36,
  'bgm-true-airi-melancholic': 0.34,
  'bgm-blue-music-box': 0.30,
  'bgm-heroine-memory': 0.34,
  'bgm-final-farewell': 0.34,
  'bgm-ending-voyager': 0.38
};
function musicCueFor(nodeId, node) {
  if (Object.hasOwn(node || {}, 'bgm')) return node.bgm;
  return Object.hasOwn(nodeCues, nodeId) ? nodeCues[nodeId] : undefined;
}
Object.assign(ILY, { musicCueFor, musicVolumes: volumes });
})();
