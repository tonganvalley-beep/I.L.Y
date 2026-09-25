/* 扫描 game/data/story/*.js 里所有 speaker 取值，筛出包含指定关键词的那些。
 *
 * 用法：
 *   node tools/scan-speakers.cjs            # 默认关键词：基生
 *   node tools/scan-speakers.cjs 爱理        # 换成别的关键词
 *   node tools/scan-speakers.cjs ""         # 空关键词 = 列出全部 speaker
 *
 * 输出三部分：
 *   ① 原始剧本（data/story/*.js）里命中的 speaker 取值
 *   ② 剧本修订表（script-edits.js）里命中的 speaker 取值
 *   ③ 走完整渲染管线后（脚本 + 修订层合并）的最终取值 —— 这个才是画面上真正会显示的
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const storyDir = path.resolve(__dirname, '..', 'data', 'story');
const keyword = process.argv[2] === undefined ? '\u57fa\u751f' : process.argv[2];
const hit = value => typeof value === 'string' && value.includes(keyword);

/* ---------- 1. 按 game/index.html 的顺序加载所有剧本 ---------- */
const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext('window.ILY = { data: { stories: {}, maps: {}, levels: {} } };', sandbox);

const files = fs.readdirSync(storyDir).filter(f => f.endsWith('.js')).sort();
const loadErrors = [];
for (const file of files) {
  try {
    vm.runInContext(fs.readFileSync(path.join(storyDir, file), 'utf8'), sandbox, { filename: file });
  } catch (error) {
    loadErrors.push(file + ': ' + error.message);
  }
}

const stories = sandbox.ILY.data.stories;
const edits = sandbox.window.ILY_SCRIPT_EDITS || {};

/* ---------- 2. 收集原始剧本里的 speaker ---------- */
const raw = new Map();
for (const [storyId, story] of Object.entries(stories)) {
  for (const [nodeId, node] of Object.entries(story.nodes || {})) {
    if (typeof node.speaker !== 'string') continue;
    if (!raw.has(node.speaker)) raw.set(node.speaker, { total: 0, byStory: {}, samples: [] });
    const entry = raw.get(node.speaker);
    entry.total++;
    entry.byStory[storyId] = (entry.byStory[storyId] || 0) + 1;
    if (entry.samples.length < 3) entry.samples.push(storyId + ':' + nodeId + '(' + node.type + ')');
  }
}

/* ---------- 3. 收集修订表里的 speaker ---------- */
const edited = new Map();
for (const [nodeId, record] of Object.entries(edits)) {
  if (typeof record.speaker !== 'string') continue;
  if (!edited.has(record.speaker)) edited.set(record.speaker, { total: 0, samples: [] });
  const entry = edited.get(record.speaker);
  entry.total++;
  if (entry.samples.length < 3) entry.samples.push(nodeId);
}

/* ---------- 4. 走完整合并管线，得到最终说话的分布 ---------- */
let final = null, finalNote = '';
try {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'script-review-model.js'), 'utf8'), sandbox);
  const first = Object.values(stories)[0];
  const merged = { ...first, chapters: Object.keys(stories), nodes: {} };
  for (const story of Object.values(stories)) Object.assign(merged.nodes, story.nodes);
  const model = sandbox.ILYScriptReview.create(merged);
  model.apply(sandbox.ILYScriptReview.mergeRecords(edits, {}));
  final = new Map();
  for (const [nodeId, node] of Object.entries(merged.nodes)) {
    if (typeof node.speaker !== 'string') continue;
    if (!final.has(node.speaker)) final.set(node.speaker, { total: 0, types: {}, samples: [] });
    const entry = final.get(node.speaker);
    entry.total++;
    entry.types[node.type] = (entry.types[node.type] || 0) + 1;
    if (entry.samples.length < 3) entry.samples.push(nodeId + '(' + node.type + ')');
  }
} catch (error) {
  finalNote = '（合并管线跑不起来：' + error.message + '）';
}

/* ---------- 5. 输出 ---------- */
const pad = (text, width) => String(text).padEnd(width, ' ');
const show = value => value === '' ? '(空字符串)' : value;

function section(title) {
  console.log('\n' + '='.repeat(72));
  console.log(title);
  console.log('='.repeat(72));
}

console.log('扫描目录：' + storyDir);
console.log('文件（' + files.length + ' 个）：' + files.join(', '));
console.log('关键词：「' + keyword + '」');
if (loadErrors.length) console.log('加载失败：' + loadErrors.join(' | '));

section('① 原始剧本 data/story/*.js 里命中关键词的 speaker');
const rawHits = [...raw.entries()].filter(([value]) => hit(value)).sort((a, b) => b[1].total - a[1].total);
if (!rawHits.length) console.log('（无命中）');
for (const [value, info] of rawHits) {
  console.log('  ' + show(value));
  console.log('    ' + pad('', 4) + '出现 ' + info.total + ' 次，分布：' + Object.entries(info.byStory).map(e => e[0] + '×' + e[1]).join(', '));
  console.log('    ' + pad('', 4) + '示例：' + info.samples.join(' | '));
}

section('② 剧本修订表 script-edits.js 里命中关键词的 speaker');
const editHits = [...edited.entries()].filter(([value]) => hit(value)).sort((a, b) => b[1].total - a[1].total);
if (!editHits.length) console.log('（无命中）');
for (const [value, info] of editHits) {
  console.log('  ' + show(value));
  console.log('    ' + pad('', 4) + '出现 ' + info.total + ' 次，示例节点：' + info.samples.join(' | '));
}

section('③ 合并后（画面上真正显示的）命中关键词的 speaker ' + finalNote);
if (final) {
  const finalHits = [...final.entries()].filter(([value]) => hit(value)).sort((a, b) => b[1].total - a[1].total);
  if (!finalHits.length) console.log('（无命中）');
  for (const [value, info] of finalHits) {
    console.log('  ' + show(value));
    console.log('    ' + pad('', 4) + '最终出现 ' + info.total + ' 次，类型：' + Object.entries(info.types).map(e => e[0] + '×' + e[1]).join(', '));
    console.log('    ' + pad('', 4) + '示例：' + info.samples.join(' | '));
  }
  console.log('\n  最终表里 speaker 取值总数：' + final.size + ' 种（含空字符串）');
}

const allRaw = [...raw.keys()].filter(key => key !== '');
section('附：原始剧本里全部 ' + allRaw.length + ' 种非空 speaker（供对照）');
console.log(allRaw.sort((a, b) => (raw.get(b).total - raw.get(a).total)).join('  |  '));
