const fs = require('fs');
const path = require('path');
const base = 'D:/personal/大二/小学期/I.L.Y/I.L.Y-main/I.L.Y-main/game';
global.ILY = { data: { assets: { images:{}, bgm:{}, sfx:{}, voices:{}, video:{} }, chapter1Maps:{} } };
function load(f){ const code = fs.readFileSync(f,'utf8'); (0,eval)(code); }
load(path.join(base,'data/assets.js'));
load(path.join(base,'data/chapter-assets.js'));
load(path.join(base,'data/map-assets.js'));

const A = global.ILY.data.assets;
function classifyImages(obj){
  const out = { placeholder:[], empty:[], missing:[], ok:[] };
  for (const [k,v] of Object.entries(obj)){
    if (v === '' || v == null) { out.empty.push(k); continue; }
    if (v.includes('assets/placeholders/')) { out.placeholder.push(k); continue; }
    const fp = path.join(base, v);
    if (fs.existsSync(fp)) out.ok.push(k);
    else out.missing.push(k+'  ->  '+v);
  }
  return out;
}
const img = classifyImages(A.images);
function audioStatus(obj, label){
  const missing=[]; const present=[];
  for (const [k,v] of Object.entries(obj)){
    const fp = path.join(base, v);
    if (fs.existsSync(fp)) present.push(k); else missing.push(k+'  ->  '+v);
  }
  return {missing, present};
}
const bgm = audioStatus(A.bgm,'bgm');
const sfx = audioStatus(A.sfx,'sfx');
const voices = audioStatus(A.voices,'voices');

const totalImg = Object.keys(A.images).length;
console.log('=== 图片资源登记总数:', totalImg, '===');
console.log('OK(真实文件存在):', img.ok.length);
console.log('占位 SVG:', img.placeholder.length, '=>', img.placeholder.join(', '));
console.log('空路径(缺文件):', img.empty.length, '=>', img.empty.join(', '));
console.log('指向不存在的真实路径:', img.missing.length, '=>', img.missing.join(' | '));

console.log('\n=== 音频 ===');
console.log('BGM 登记', Object.keys(A.bgm).length, '个; 文件存在', bgm.present.length, '; 缺失', bgm.missing.length);
console.log('SFX  登记', Object.keys(A.sfx).length, '个; 文件存在', sfx.present.length, '; 缺失', sfx.missing.length);
console.log('VOICES 登记', Object.keys(A.voices).length, '个; 文件存在', voices.present.length, '; 缺失', voices.missing.length);
console.log('音频文件缺失(全部):', bgm.missing.length+sfx.missing.length+voices.missing.length);

console.log('\n=== 汇总统计 ===');
const missingVisual = img.placeholder.length + img.empty.length + img.missing.length;
console.log('缺图(占位+空路径+坏路径)图片ID数:', missingVisual);
console.log('缺音频(文件)ID数:', bgm.missing.length+sfx.missing.length+voices.missing.length);
