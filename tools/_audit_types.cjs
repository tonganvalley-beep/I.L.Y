const fs=require('fs'),path=require('path');
const dir='D:/personal/大二/小学期/I.L.Y/I.L.Y-main/I.L.Y-main/game/data/story';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
const tally={};
let total=0;
for(const f of files){
  const t=fs.readFileSync(path.join(dir,f),'utf8');
  const re=/"type":\s*"(\w+)"/g; let m;
  while(m=re.exec(t)){ tally[m[1]]=(tally[m[1]]||0)+1; total++; }
}
console.log('节点总数:', total);
console.log('各类型节点数:');
console.log(JSON.stringify(tally,null,2));
// 检查 ch2/3/final 是否在 prologue/chapter1 的 next/choices 中被引用（即正常流程能否到达）
const all=fs.readFileSync(path.join(dir,'prologue.js'),'utf8')+fs.readFileSync(path.join(dir,'chapter1.js'),'utf8');
console.log('\nprologue/chapter1 中是否引用 chapter2/final 节点(next/choices):');
console.log('  -> 引用 ch2_ 开头:', /ch2_/.test(all));
console.log('  -> 引用 final 章节节点(如 fin_/final_):', /\b(final|fin)_\w+/.test(all));
