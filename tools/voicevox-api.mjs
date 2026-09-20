import { join } from 'node:path';
import { loadVoicevoxSource } from './voicevox/voice-source.mjs';
import * as engine from './voicevox/engine-client.mjs';
import { readProject, saveProject } from './voicevox/project-store.mjs';
import { BatchQueue } from './voicevox/batch-queue.mjs';
import { exportTranslationBundle } from './voicevox/translation-workflow.mjs';
import { publishVoiceManifest } from './voicevox/voice-publication.mjs';

const limit = 20 * 1024 * 1024;
const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
async function body(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw fail(415, 'CONTENT_TYPE', '请求内容必须为 JSON');
  let size = 0; const chunks = [];
  for await (const chunk of request) { size += chunk.length; if (size > limit) throw fail(413, 'BODY_TOO_LARGE', '请求超过 20 MB 上限'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw fail(400, 'INVALID_JSON', '请求内容不是有效 JSON'); }
}
function json(response, status, value) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)); }
export function createVoicevoxApi({ root = process.cwd(), engineClient = engine, sourceLoader = null, projectReader = readProject, projectWriter = saveProject, queue = null } = {}) {
  const readSource = sourceLoader || (() => loadVoicevoxSource({ root }));
  const batchQueue = queue || new BatchQueue({
    engine: engineClient,
    journalFile: join(root, 'game/data/voice/voicevox-queue.json'),
    renderDir: join(root, 'game/data/voice/renders')
  });
  const queueReady = batchQueue.init();
  return async function voicevoxApi(request, response, pathname) {
    try {
      const host = request.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
          (request.headers.origin && request.headers.origin !== `http://${host}`) ||
          request.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'FORBIDDEN', '只允许本机同源编辑器访问');
      if (request.method === 'GET' && pathname === '/api/voicevox/status') return json(response, 200, await engineClient.status());
      if (request.method === 'GET' && pathname === '/api/voicevox/source') return json(response, 200, await readSource());
      if (request.method === 'GET' && pathname === '/api/voicevox/project') return json(response, 200, await projectReader());
      if (request.method === 'POST' && pathname === '/api/voicevox/query') { const data = await body(request); return json(response, 200, { query: await engineClient.query(data.text, data.styleId, data) }); }
      if (request.method === 'POST' && pathname === '/api/voicevox/accent-phrases') {
        const data = await body(request);
        return json(response, 200, { phrases: await engineClient.analyze(data) });
      }
      if (request.method === 'POST' && pathname === '/api/voicevox/preview') {
        const data = await body(request); const audio = await engineClient.synthesize(data.query, data.styleId);
        response.writeHead(200, { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' }); return response.end(audio);
      }
      if (request.method === 'POST' && pathname === '/api/voicevox/project') { const data = await body(request); return json(response, 200, await projectWriter(data.project, data.revision)); }
      if (pathname === '/api/voicevox/queue') {
        await queueReady;
        if (request.method === 'GET') return json(response, 200, batchQueue.snapshot());
        if (request.method === 'POST') {
          const data = await body(request);
          if (data.action === 'enqueue') return json(response, 200, await batchQueue.enqueue(data.lines, data.engineIdentity || null));
          if (data.action === 'pause') return json(response, 200, await batchQueue.setPaused(true));
          if (data.action === 'resume') return json(response, 200, await batchQueue.setPaused(false));
          if (data.action === 'cancel') return json(response, 200, await batchQueue.cancel(data.taskIds));
          if (data.action === 'retry') return json(response, 200, await batchQueue.retry(data.taskIds));
          throw Object.assign(new Error('未知队列操作'), { code: 'INVALID_ACTION' });
        }
      }
      if (request.method === 'POST' && pathname === '/api/voicevox/batch-export') {
        await queueReady;
        const data = await body(request);
        const exportDir = join(root, 'game/assets/audio/voices/generated');
        const manifestFile = join(exportDir, 'manifest.json');
        const manifest = await batchQueue.exportCompleted(data.lineIds, exportDir, manifestFile);
        return json(response, 200, { ...manifest, manifestFile: 'game/assets/audio/voices/generated/manifest.json' });
      }
      if (request.method === 'POST' && pathname === '/api/voicevox/publish') {
        await queueReady;
        const data = await body(request);
        const project = await projectReader();
        if (data.revision !== project.projectRevision) throw Object.assign(new Error('工程有未保存改动或版本已变化，请保存后重试'), { code: 'CONFLICT' });
        const outputDir = join(root, 'game/assets/audio/voices/published');
        const manifestFile = join(root, 'game/data/voice/voice-manifest.js');
        const result = await publishVoiceManifest({ project, source: await readSource(), queue: batchQueue, outputDir, manifestFile, lineIds: data.lineIds });
        return json(response, 200, { count: result.count, manifestFile: 'game/data/voice/voice-manifest.js' });
      }
      if (request.method === 'POST' && pathname === '/api/voicevox/export') {
        const data = await body(request);
        const translations = Object.fromEntries((data.lines || []).map(line => [line.lineId, line]));
        const result = await exportTranslationBundle(join(root, 'game/data/voice/exports'), { translations });
        return json(response, 200, { file: 'game/data/voice/exports/', count: result.total, speakers: result.speakers.length });
      }
      json(response, 404, { error: 'NOT_FOUND' });
    } catch (error) { const status = error.status || (error.code === 'CONFLICT' ? 409 : error.code === 'ENGINE_OFFLINE' ? 503 : 400); json(response, status, { error: error.code || 'VOICEVOX_ERROR', message: error.message }); }
  };
}
