import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createScriptReviewAssetApi } from '../tools/script-review-assets.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');

async function assetServer() {
  const root = await mkdtemp(join(tmpdir(), 'ily-asset-'));
  const api = createScriptReviewAssetApi({
    filename: pathToFileURL(join(root, 'uploaded-assets.js')),
    directory: new URL('./uploads/', pathToFileURL(`${root}/`)),
    prefix: 'assets/images/uploads/'
  });
  const server = http.createServer((request, response) => api(request, response));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { server, base: `http://127.0.0.1:${server.address().port}`, root, close: () => server.close() };
}

test('本地选图：图片写入项目并登记，非法类型被拒绝', async () => {
  const { base, close, root } = await assetServer();
  try {
    const post = await fetch(`${base}/api/script-review-asset?kind=background`, {
      method: 'POST', headers: { 'Content-Type': 'image/png', 'X-File-Name': encodeURIComponent('海岸 夜景.png') }, body: png
    });
    const data = await post.json();
    assert.equal(post.status, 200);
    assert.match(data.id, /^bg-upload-\d{8}-/);
    assert.equal(data.path, `assets/images/uploads/${data.id}.png`);
    await readFile(new URL(`./uploads/${data.id}.png`, pathToFileURL(`${root}/`)));
    const listed = await (await fetch(`${base}/api/script-review-asset`)).json();
    assert.equal(listed.images[data.id], data.path);
    const bad = await fetch(`${base}/api/script-review-asset?kind=portrait`, {
      method: 'POST', headers: { 'Content-Type': 'text/plain', 'X-File-Name': 'x.svg' }, body: 'x'
    });
    assert.equal(bad.status, 415);
    // 同一张图再传一次（换文件名）应复用，不产生第二份文件
    const again = await (await fetch(`${base}/api/script-review-asset?kind=background`, {
      method: 'POST', headers: { 'Content-Type': 'image/png', 'X-File-Name': 'again.png' }, body: png
    })).json();
    assert.equal(again.id, data.id);
    assert.equal(again.reused, true);
  } finally { close(); }
});

test('本地选图：挑到项目里已有的图片时直接引用原素材', async () => {
  const { base, close, root } = await assetServer();
  try {
    const existing = await readFile(new URL('../game/assets/images/backgrounds/1.夜晚家.png', import.meta.url));
    const data = await (await fetch(`${base}/api/script-review-asset?kind=background`, {
      method: 'POST', headers: { 'Content-Type': 'image/png', 'X-File-Name': encodeURIComponent('1.夜晚家.png') }, body: existing
    })).json();
    assert.equal(data.reused, true, '应识别为项目已有素材');
    assert.equal(data.register, false, '已有素材不需要再登记');
    assert.equal(data.id, 'bg-apartment-night');
    assert.equal(data.path, 'assets/images/backgrounds/1.夜晚家.png');
    const stored = await readdir(new URL('./uploads/', pathToFileURL(`${root}/`))).catch(() => []);
    assert.deepEqual(stored, [], '复用时不应复制新文件');
  } finally { close(); }
});

// 编辑器窗口用的是浏览器 DOM，这里用最小替身跑一遍渲染与“选择本地图片”。
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.options = []; this.attributes = {}; this.style = {}; this.dataset = {};
    this.textContent = ''; this.hidden = false; this.disabled = false; this.value = '';
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  append(...items) {
    for (const item of items) {
      if (typeof item === 'string') { this.textContent += item; continue; }
      this.children.push(item);
      if (item.tagName === 'OPTION') this.options.push(item);
    }
  }
  replaceChildren(...items) { this.children = []; this.options = []; this.append(...items); }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener() {}
  querySelectorAll(selector) {
    const tags = selector.split(',').map(part => part.trim().toUpperCase());
    const found = [];
    const walk = node => { for (const child of node.children) { if (tags.includes(child.tagName)) found.push(child); walk(child); } };
    walk(this); return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  matches() { return false; }
  focus() {}
  scrollIntoView() {}
  click() { if (typeof this.onclick === 'function') this.onclick(); }
}

test('编辑器文本段提供本地选图入口，选中的图片立即应用到该段', async () => {
  const { base, close } = await assetServer();
  const realFetch = globalThis.fetch;
  const nativeSetInterval = globalThis.setInterval;
  const timers = [];
  const store = new Map([['ily-script-live-state', JSON.stringify({
    type: 'ily-script-state', time: '1-1',
    current: { id: 'n1', chapter: 'prologue', chapterTitle: '序章', scene: '01' },
    nodes: [['n1', { type: 'dialogue', speaker: '基生', text: '测试台词', background: 'bg-apartment-dusk', next: 'n2' }]],
    records: {},
    media: { images: { 'bg-apartment-dusk': 'assets/images/backgrounds/1.夜晚家.png' }, backgrounds: ['bg-apartment-dusk'], portraits: [] }
  })]]);
  const byId = {};
  globalThis.document = {
    createElement: tag => new El(tag),
    createTextNode: text => ({ text }),
    getElementById: id => byId[id] || (byId[id] = Object.assign(new El('div'), { id })),
    addEventListener() {}, activeElement: null
  };
  globalThis.window = globalThis;
  globalThis.window.opener = null;
  globalThis.addEventListener = () => {};
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  globalThis.location = { protocol: 'http:', href: 'http://127.0.0.1:8080/game/script-editor.html' };
  globalThis.fetch = async (url, init) => String(url).includes('script-review-asset')
    ? realFetch(`${base}${url}`, init)
    : { ok: false, status: 500, json: async () => ({ error: '离线' }) };
  globalThis.setInterval = (...args) => { const id = nativeSetInterval(...args); timers.push(id); return id; };
  delete globalThis.BroadcastChannel;
  try {
    const run = async file => new Function(await readFile(new URL(`../game/${file}`, import.meta.url), 'utf8'))();
    await run('src/script-review-model.js');
    await run('data/uploaded-assets.js');
    await run('src/script-editor-window.js');
    await new Promise(done => setTimeout(done, 400));
    const row = byId.list.children[0];
    assert.ok(row, '应渲染出当前场景的文本段');
    const inputs = row.querySelectorAll('input').filter(node => node.type === 'file');
    assert.equal(row.querySelectorAll('button').filter(node => node.textContent === '选择本地图片…').length, 2);
    assert.equal(inputs.length, 2, '背景与立绘各有一个本地文件选择框');
    inputs[0].files = [new File([png], '冒烟测试.png', { type: 'image/png' })];
    await inputs[0].onchange();
    const background = row.querySelectorAll('select')[2];
    assert.match(background.value, /^bg-upload-\d{8}-/, '选完本地图片后背景值应换成新素材 ID');
    assert.ok(Object.hasOwn(globalThis.ILY_UPLOADED_ASSETS, background.value), '新素材应登记进素材表');
    assert.ok(background.options.some(option => option.value === background.value));
    assert.match(byId.status.textContent, /已选择本地图片/);
  } finally {
    for (const id of timers) clearInterval(id);
    globalThis.setInterval = nativeSetInterval;
    globalThis.fetch = realFetch;
    close();
  }
});
