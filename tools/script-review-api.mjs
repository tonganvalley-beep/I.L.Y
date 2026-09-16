import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadStory, validateRecords, serializeRecords } from './import-script-review.mjs';

const target = new URL('../game/data/story/script-edits.js', import.meta.url);
const fail = (status, message) => Object.assign(new Error(message), { status });
export function createScriptReviewApi({ filename = target, load = loadStory } = {}) {
  let queue = Promise.resolve();
  async function current() {
    const source = await readFile(filename, 'utf8');
    const match = source.match(/window\.ILY_SCRIPT_EDITS\s*=\s*([\s\S]*?);\s*(?:window\.ILY_SCRIPT_EDITS_PROJECT_SAVED = true;\s*)?$/);
    if (!match) throw new Error('项目剧本文件格式无法识别。');
    return { source, records: JSON.parse(match[1]), revision: createHash('sha256').update(source).digest('hex'), projectSaved: source.includes('window.ILY_SCRIPT_EDITS_PROJECT_SAVED = true;') };
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
      if (request.method === 'GET') {
        const { source, ...data } = await current();
        reply(200, data); return;
      }
      if (request.method !== 'POST') throw fail(405, '不支持此请求方式。');
      if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw fail(415, '保存内容必须为 JSON。');
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) throw fail(413, '修改记录超过 5 MB，请减少内容后重试。');
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw fail(400, '保存内容不是有效的 JSON。'); }
      const save = async () => {
        const before = await current();
        if (!input || input.revision !== before.revision) throw fail(409, '项目已有其他修改，请先导出当前草稿备份，再点击“恢复项目已保存版本”后重新编辑。');
        const { story } = await load();
        try { validateRecords(input.records, story.nodes); }
        catch (error) { throw fail(400, error.message); }
        const source = serializeRecords(input.records) + 'window.ILY_SCRIPT_EDITS_PROJECT_SAVED = true;\n';
        const temporary = new URL(`./script-edits-${randomUUID()}.tmp`, filename instanceof URL ? filename : pathToFileURL(resolve(filename)));
        try {
          await writeFile(temporary, source, { encoding: 'utf8', flag: 'wx' });
          // A recoverable previous version is written before the atomic replacement.
          await writeFile(new URL('./script-edits.js.bak', temporary), before.source, 'utf8');
          await rename(temporary, filename);
        } finally { await unlink(temporary).catch(() => {}); }
        return { records: input.records, revision: createHash('sha256').update(source).digest('hex'), projectSaved: true };
      };
      const pending = queue.then(save);
      queue = pending.catch(() => {});
      reply(200, await pending);
    } catch (error) { reply(error.status || 500, { error: error.status ? error.message : '项目文件读写失败，请检查文件权限或服务器日志。' }); if (!error.status) console.error(error); }
  };
}
