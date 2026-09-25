// 临时校验：ch1_160 背景换图后，节点字段 / 资源存在性 / 无连带改动
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = process.cwd();      // 在 game/ 目录下执行
global.window = global;
global.ILY = { data: { assets: { images: {} }, stories: {} } };

const files = [
  'data/assets.js',
  'data/chapter-assets.js',
  'data/uploaded-assets.js',
  'data/map-assets.js',
  'data/story/prologue.js',
  'data/story/chapter1.js',
  'data/story/script-edits.js',
  'src/script-review-model.js',
];
const ctx = vm.createContext(global);
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}

const records = ILYScriptReview.mergeRecords(window.ILY_SCRIPT_EDITS, {});
const model = ILYScriptReview.create(ILY.data.stories.chapter1);
model.apply(records.model ? records.model : records);

const id = 'ch1_160';
const base = model.base[id];
const now = ILY.data.stories.chapter1.nodes[id];
console.log('records entry  :', JSON.stringify(records[id] || records.model?.[id]));
console.log('base           :', JSON.stringify(base));
console.log('after edits    :', JSON.stringify(now));

// 逐字段 diff
const keys = new Set([...Object.keys(base || {}), ...Object.keys(now || {})]);
const diff = [...keys].filter(k => JSON.stringify(base?.[k]) !== JSON.stringify(now?.[k]));
console.log('changed fields :', diff.join(', ') || '(none)');

// 资源存在性
const img = ILY.data.assets.images[now.background];
console.log('asset id->path :', now.background, '=>', img);
console.log('file exists    :', !!img && fs.existsSync(path.join(ROOT, img.replace(/^assets\//, 'assets/'))));

// ch1-cg-4 是否还有引用
const all = Object.values(ILY.data.stories).flatMap(s => Object.values(s.nodes || {}));
const refs = all.filter(n => JSON.stringify(n).includes('ch1-cg-4')).map(n => n.id || '(no id)');
console.log('ch1-cg-4 refs  :', refs.length ? refs.join(', ') : '(无节点引用，已成孤儿)');
