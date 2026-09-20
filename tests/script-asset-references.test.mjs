import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// 剧本编辑器可以让用户随时把背景/立绘改成任意素材 ID，这里的职责是：
// 已保存版本里出现的每一个 ID，都必须能在素材表里查到、并且指向真实存在的文件。
const root = new URL('../game/', import.meta.url);
export async function loadGameData() {
  const ILY = { data: {} };
  // 浏览器里所有脚本共享同一个 window.ILY，这里必须保持一致。
  const context = { ILY, window: globalThis };
  globalThis.ILY = ILY;
  for (const file of ['data/assets.js', 'data/uploaded-assets.js', 'data/story/script-edits.js']) {
    const source = await readFile(new URL(file, root), 'utf8');
    new Function('ILY', 'window', source)(ILY, context.window);
  }
  return { images: ILY.data.assets.images, records: globalThis.ILY_SCRIPT_EDITS };
}
export function brokenReferences(images, records) {
  const missing = [];
  for (const [id, record] of Object.entries(records)) {
    for (const key of ['background', 'portrait']) {
      const value = record[key];
      if (!value) continue;
      if (!Object.hasOwn(images, value)) missing.push(`${id}.${key} 素材表未登记 ${value}`);
      else if (!existsSync(new URL(images[value], root))) missing.push(`${id}.${key} 文件缺失 ${images[value]}`);
    }
  }
  return missing;
}

test('已保存剧本引用的每个背景与立绘都能解析到真实文件', async () => {
  const { images, records } = await loadGameData();
  const referenced = Object.values(records).flatMap(record => [record.background, record.portrait]).filter(Boolean);
  assert.ok(referenced.length > 0, '正式记录里应当存在视觉修改');
  assert.deepEqual(brokenReferences(images, records), []);
});

test('上传到项目的图片都登记进素材表且文件在位', async () => {
  const source = await readFile(new URL('data/uploaded-assets.js', root), 'utf8');
  const list = JSON.parse(source.match(/const list\s*=\s*(\{[\s\S]*?\})\s*;/)[1]);
  const { images } = await loadGameData();
  for (const [id, path] of Object.entries(list)) {
    assert.equal(images[id], path, `${id} 未合并进 ILY.data.assets.images`);
    assert.ok(existsSync(new URL(path, root)), `${id} 指向的文件不存在: ${path}`);
  }
});
