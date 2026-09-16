// 端到端检查：加载 uploaded-assets.js + script-edits.js，确认每个素材引用都能解析到真实文件。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const game = path.join(root, 'game');

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(game, 'data', 'uploaded-assets.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(game, 'data', 'story', 'script-edits.js'), 'utf8'), sandbox);

const reg = sandbox.window.ILY_UPLOADED_ASSETS || {};
const images = ((sandbox.window.ILY || {}).data || {}).assets?.images || {};
const edits = sandbox.window.ILY_SCRIPT_EDITS || {};

const uploadsDir = path.join(game, 'assets', 'images', 'uploads');
const onDisk = new Set(fs.readdirSync(uploadsDir));

let bad = 0;
console.log('登记项:', Object.keys(reg).length, '| assets.images:', Object.keys(images).length);

for (const [id, rel] of Object.entries(reg)) {
  const file = path.join(game, rel);
  if (!fs.existsSync(file)) { console.log('  ! 登记但文件缺失:', id, rel); bad++; }
}

const used = new Set();
for (const [node, value] of Object.entries(edits)) {
  for (const key of ['background', 'portrait']) {
    const id = value && value[key];
    if (!id || !/^(bg|portrait)-upload-/.test(id)) continue;
    used.add(id);
    const rel = reg[id];
    if (!rel) { console.log('  ! 剧本引用未登记:', node, id); bad++; continue; }
    if (!fs.existsSync(path.join(game, rel))) {
      console.log('  ! 剧本引用文件缺失:', node, id); bad++;
    }
  }
}
console.log('剧本引用素材数:', used.size);
console.log('磁盘文件数:', onDisk.size);

// 每张磁盘文件是否都被登记
for (const name of onDisk) {
  if (!reg[path.parse(name).name]) { console.log('  ! 未登记的磁盘文件:', name); bad++; }
}
console.log(bad === 0 ? '\n全部通过' : `\n存在 ${bad} 个问题`);
process.exit(bad === 0 ? 0 : 1);
