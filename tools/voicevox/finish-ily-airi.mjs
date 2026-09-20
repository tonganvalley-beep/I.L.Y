import { chooseShikokuStyle, tuneForContext } from './production-voice-policy.mjs';

const base = process.env.ILY_VOICEVOX_BASE || 'http://127.0.0.1:8084';
const today = '2026-09-20';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  return data;
}

const get = path => request(path);
const post = (path, value) => request(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value)
});

function snapshot(line) {
  return {
    speechText: line.speechText || '',
    styleId: line.styleId ?? null,
    audioQuery: line.audioQuery ?? null,
    tuning: line.tuning ?? null,
    renderStale: Boolean(line.renderStale)
  };
}

function checkpoint(line, label) {
  line.tuningHistory ||= [];
  // Re-synthesizing hundreds of lines can exceed the local API's 20 MB body
  // limit if every old AudioQuery is duplicated. Keep the pre-run controls
  // (style/text/tuning) for undo; the previous query remains in the .bak
  // project created by project-store.
  const value = snapshot(line);
  if (label === `情境精调 ${today}`) value.audioQuery = null;
  line.tuningHistory.push({ label, value });
  if (line.tuningHistory.length > 30) line.tuningHistory.shift();
  line.tuningRedo = [];
}

async function withRetry(fn, attempts = 3) {
  let error;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await fn(); } catch (caught) {
      error = caught;
      if (attempt < attempts) await sleep(250 * attempt);
    }
  }
  throw error;
}

const project = await get('/api/voicevox/project');
const status = await get('/api/voicevox/status');
const targets = project.lines.filter(line =>
  (line.voiceRole === 'ILY' || line.voiceRole === '百合沢爱理') && line.speechText?.trim()
);
if (!targets.length) throw new Error('没有找到 ILY/爱理 的可合成日语台词');

console.log(`准备处理 ${targets.length} 条：ILY ${targets.filter(x => x.voiceRole === 'ILY').length}，爱理 ${targets.filter(x => x.voiceRole === '百合沢爱理').length}`);
let complete = 0;
const concurrency = 4;
let cursor = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= targets.length) return;
    const line = targets[index];
    const styleId = chooseShikokuStyle(line.speechText, line.voiceRole);
    const data = await withRetry(() => post('/api/voicevox/query', { text: line.speechText, styleId }));
    checkpoint(line, `情境精调 ${today}`);
    const tuned = tuneForContext(data.query, line.speechText, line.voiceRole);
    const query = data.query;
    line.styleId = styleId;
    line.audioQuery = query;
    line.tuning = tuned.tuning;
    line.translationStatus = 'proofread';
    line.renderStale = false;
    complete += 1;
    if (complete % 25 === 0 || complete === targets.length) console.log(`查询与精调 ${complete}/${targets.length}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const saved = await post('/api/voicevox/project', {
  project: { ...project, engine: { uuid: status.uuid, version: status.version, manifestVersion: status.manifestVersion } },
  revision: project.projectRevision
});
console.log(`工程已保存，revision=${saved.projectRevision}`);

const queueResult = await post('/api/voicevox/queue', {
  action: 'enqueue',
  engineIdentity: { uuid: status.uuid, version: status.version, manifestVersion: status.manifestVersion },
  lines: targets.map(line => ({
    lineId: line.lineId,
    speechText: line.speechText,
    styleId: line.styleId,
    translationStatus: line.translationStatus,
    audioQuery: line.audioQuery,
    synthesisOptions: { tuning: line.tuning }
  }))
});
console.log(`已加入队列 ${queueResult.added.length} 条`);

const initialCompleted = queueResult.queue.tasks.filter(task => task.status === 'completed').length;
const expectedCompleted = initialCompleted + queueResult.added.length;
let lastLog = 0;
while (true) {
  const queue = await get('/api/voicevox/queue');
  const counts = queue.counts || {};
  const failed = queue.tasks.filter(task => queueResult.added.includes(task.taskId) && task.status === 'failed');
  if (failed.length) throw new Error(`队列有 ${failed.length} 条失败：${failed.slice(0, 3).map(x => x.lineId).join(', ')}`);
  if (Date.now() - lastLog > 5000) {
    console.log(`合成队列：等待 ${counts.pending || 0} · 进行 ${counts.running || 0} · 完成 ${counts.completed || 0}`);
    lastLog = Date.now();
  }
  if ((counts.completed || 0) >= expectedCompleted) break;
  await sleep(1000);
}

const lineIds = targets.map(line => line.lineId);
const exported = await post('/api/voicevox/batch-export', { lineIds });
console.log(`已导出 ${exported.count} 个 WAV：${exported.manifestFile}`);
const latestProject = await get('/api/voicevox/project');
const published = await post('/api/voicevox/publish', { lineIds, revision: latestProject.projectRevision });
console.log(`已发布 ${published.count} 条：${published.manifestFile}`);
