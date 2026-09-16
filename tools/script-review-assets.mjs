// 剧本编辑器用：把本地选择的图片存进项目，并登记成素材 ID。
// 这样编辑器的“背景图片 / 人物立绘”可以直接从本地文件夹挑图，而不必在素材名列表里找。
import { readFile, writeFile, rename, unlink, mkdir, readdir, stat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = new URL('../game/data/uploaded-assets.js', import.meta.url);
const folder = new URL('../game/assets/images/uploads/', import.meta.url);
const imagesRoot = new URL('../game/assets/images/', import.meta.url);
const publicPrefix = 'assets/images/uploads/';
const registryFiles = ['game/data/assets.js', 'game/data/chapter-assets.js', 'game/data/uploaded-assets.js'];
const limit = 20 * 1024 * 1024;
const kinds = { background: 'bg', portrait: 'portrait' };
const extensions = { '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.webp': 'webp', '.gif': 'gif', '.bmp': 'bmp' };
const fail = (status, message) => Object.assign(new Error(message), { status });
const header = [
  '// 剧本编辑器里从本地选择的图片（自动生成；删除某行即可取消该素材）',
  '// 图片存放在 assets/images/uploads/，登记后就能在“背景图片 / 人物立绘”中使用。',
  ''
].join('\n');

async function readList(filename) {
  try {
    const source = await readFile(filename, 'utf8');
    const match = source.match(/const list\s*=\s*(\{[\s\S]*?\})\s*;/) || source.match(/ILY_UPLOADED_ASSETS\s*=\s*(\{[\s\S]*?\})\s*;/);
    return match ? JSON.parse(match[1]) : {};
  } catch { return {}; }
}

export function createScriptReviewAssetApi({ filename = target, directory = folder, prefix = publicPrefix } = {}) {
  let queue = Promise.resolve();
  let index = null;
  const stem = kind => `${kind}-upload-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6)}`;
  // 项目里已有同内容的图片时不再复制一份，直接引用原素材。
  async function sizeIndex(root = imagesRoot, base = 'assets/images/') {
    if (index) return index;
    const map = new Map();
    const walk = async (url, relative) => {
      let entries;
      try { entries = await readdir(url, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (entry.isDirectory()) { await walk(new URL(`${entry.name}/`, url), `${relative}${entry.name}/`); continue; }
        if (!extensions[(extname(entry.name) || '').toLowerCase()]) continue;
        const info = await stat(new URL(entry.name, url)).catch(() => null);
        if (!info) continue;
        if (!map.has(info.size)) map.set(info.size, []);
        map.get(info.size).push(`${relative}${entry.name}`);
      }
    };
    await walk(root, base);
    index = map;
    return map;
  }
  async function findImageId(path) {
    const pattern = new RegExp(`^[\\s"']*([A-Za-z0-9_\\-]+)["']?\\s*:\\s*["']${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'm');
    for (const relative of registryFiles) {
      let source;
      try { source = await readFile(new URL(`../${relative}`, import.meta.url), 'utf8'); } catch { continue; }
      const match = source.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
  const remember = (size, path) => {
    if (!index) return;
    if (!index.has(size)) index.set(size, []);
    index.get(size).push(path);
  };
  async function reuse(bytes, kind) {
    const digest = createHash('sha256').update(bytes).digest('hex');
    const candidates = (await sizeIndex()).get(bytes.length) || [];
    const fileOf = path => path.startsWith(prefix) ? new URL(path.slice(prefix.length), directory) : new URL(`../game/${path}`, import.meta.url);
    let unregistered = null;
    for (const path of candidates) {
      let existing;
      try { existing = await readFile(fileOf(path)); } catch { continue; }
      if (createHash('sha256').update(existing).digest('hex') !== digest) continue;
      const list = await readList(filename);
      const registered = Object.entries(list).find(([, value]) => value === path);
      if (registered) return { id: registered[0], path, reused: true, register: false };
      const id = await findImageId(path);
      if (id) return { id, path, reused: true, register: false };
      unregistered ||= path;
    }
    if (!unregistered) return null;
    // 图片已在项目里但没登记过：登记它，同样不复制文件。
    const id = stem(kind), path = unregistered;
    const save = async () => {
      const list = await readList(filename);
      list[id] = path;
      await write(list);
      return { id, path, reused: true, register: true };
    };
    const pending = queue.then(save);
    queue = pending.catch(() => {});
    return pending;
  }
  function render(list) {
    return `${header}(function (root) {\n  const list = ${JSON.stringify(list, null, 2)};\n  root.ILY_UPLOADED_ASSETS = Object.assign(root.ILY_UPLOADED_ASSETS || {}, list);\n  const ILY = root.ILY || (root.ILY = {});\n  const data = ILY.data || (ILY.data = {});\n  const assets = data.assets || (data.assets = {});\n  assets.images = Object.assign(assets.images || {}, list);\n})(typeof window !== 'undefined' ? window : globalThis);\n`;
  }
  async function write(list) {
    const temporary = new URL(`./uploaded-assets-${randomUUID()}.tmp`, filename);
    try {
      await writeFile(temporary, render(list), { encoding: 'utf8', flag: 'wx' });
      await rename(temporary, filename);
    } finally { await unlink(temporary).catch(() => {}); }
  }
  return async (request, response) => {
    const reply = (code, data) => {
      response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    try {
      const host = request.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
          (request.headers.origin && request.headers.origin !== `http://${host}`) ||
          request.headers['sec-fetch-site'] === 'cross-site') throw fail(403, '只允许本机同源编辑器访问。');
      if (request.method === 'GET') { reply(200, { images: await readList(filename) }); return; }
      if (request.method !== 'POST') throw fail(405, '不支持此请求方式。');
      const kind = kinds[new URL(request.url, `http://${host}`).searchParams.get('kind')] || 'upload';
      const origin = decodeURIComponent(request.headers['x-file-name'] || '');
      const suffix = extensions[(extname(origin) || '').toLowerCase()];
      if (!suffix) throw fail(415, '只支持 PNG / JPG / WEBP / GIF / BMP 图片。');
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > limit) throw fail(413, '图片超过 20 MB，请压缩后再选择。');
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks);
      if (!bytes.length) throw fail(400, '没有收到图片内容，请重新选择。');
      const name = basename(origin);
      // 先认人：项目里已经有这张图就直接用，不再复制一份。
      const existing = await reuse(bytes, kind);
      if (existing) { reply(200, { ...existing, name: name || existing.id }); return; }
      const id = stem(kind);
      await mkdir(fileURLToPath(directory), { recursive: true });
      await writeFile(new URL(`${id}.${suffix}`, directory), bytes);
      const path = `${prefix}${id}.${suffix}`;
      remember(bytes.length, path);
      const save = async () => {
        const list = await readList(filename);
        list[id] = path;
        await write(list);
        return { id, path, name: name || id, reused: false, register: true };
      };
      const pending = queue.then(save);
      queue = pending.catch(() => {});
      reply(200, await pending);
    } catch (error) { reply(error.status || 500, { error: error.status ? error.message : '图片写入失败，请检查文件权限或服务器日志。' }); if (!error.status) console.error(error); }
  };
}
