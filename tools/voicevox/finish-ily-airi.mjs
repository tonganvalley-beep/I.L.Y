import { readFile } from 'node:fs/promises';

const base = process.env.ILY_VOICEVOX_BASE || 'http://127.0.0.1:8084';
const today = '2026-09-20';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
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

function contextFor(line) {
  const text = String(line.speechText || '');
  const dramatic = /……|…|――|どうして|なぜ|怖|恐|嫌|無理|嘘|違う|消え|さよなら|死/.test(text);
  const excited = /！|!|？|\?|やった|嬉|大好き|好き|えへ|うん！|わあ|すごい/.test(text);
  const quiet = /……|…|小声|そっと|お願い|ごめん|ごめんなさい/.test(text) && text.length <= 42;
  const question = /？|\?/.test(text);
  const sentenceLength = [...text].length;
  return { text, dramatic, excited, quiet, question, sentenceLength };
}

function chooseStyle(line) {
  if (line.voiceRole === 'ILY') return 68; // あいえるたん · ノーマル
  const { dramatic, excited, quiet } = contextFor(line);
  if (quiet) return 36; // 四国めたん · ささやき
  if (dramatic && excited) return 6; // 四国めたん · ツンツン
  if (dramatic) return 2; // 四国めたん · ノーマル
  return excited ? 0 : 2; // あまあま / ノーマル
}

function tuneQuery(query, line) {
  const { dramatic, excited, quiet, question, sentenceLength } = contextFor(line);
  const role = line.voiceRole;
  const speedScale = quiet ? 0.88 : dramatic ? 0.94 : excited ? 1.03 : 0.98;
  const pitchScale = role === 'ILY'
    ? (dramatic ? -0.08 : excited ? 0.06 : 0)
    : (dramatic ? -0.04 : excited ? 0.08 : 0.03);
  const intonationScale = quiet ? 0.88 : dramatic ? 1.05 : excited ? 1.12 : 1;
  const lengthScale = quiet ? 1.16 : dramatic ? 1.08 : excited ? 0.93 : 1;
  query.speedScale = speedScale;
  query.pitchScale = pitchScale;
  query.intonationScale = intonationScale;
  query.volumeScale = 1;

  for (const phrase of query.accent_phrases || []) {
    const accentIndex = Math.max(0, Number(phrase.accent || 1) - 1);
    for (const [index, mora] of (phrase.moras || []).entries()) {
      const accentWeight = index === accentIndex ? 1.08 : 1;
      const positionWeight = sentenceLength > 35 && index === 0 ? 1.04 : 1;
      if (Number.isFinite(mora.vowel_length)) {
        mora.vowel_length = clamp(mora.vowel_length * lengthScale * accentWeight * positionWeight, 0.035, 3);
      }
      if (mora.consonant != null && Number.isFinite(mora.consonant_length)) {
        mora.consonant_length = clamp(mora.consonant_length * (quiet ? 1.08 : dramatic ? 1.03 : 0.98), 0.01, 3);
      }
      if (Number.isFinite(mora.pitch) && mora.pitch > 0) {
        const contour = question && index >= accentIndex ? 0.06 : 0;
        mora.pitch = clamp(mora.pitch + pitchScale + contour + (index === accentIndex ? 0.05 : 0), 3, 10);
      }
    }
    if (phrase.pause_mora && Number.isFinite(phrase.pause_mora.vowel_length)) {
      const pauseScale = quiet ? 1.35 : dramatic ? 1.25 : excited ? 0.9 : 1.08;
      phrase.pause_mora.vowel_length = clamp(phrase.pause_mora.vowel_length * pauseScale, 0.08, 3);
    }
  }
  return query;
}

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
  line.tuningHistory.push({ label, value: snapshot(line) });
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
    const styleId = chooseStyle(line);
    const data = await withRetry(() => post('/api/voicevox/query', { text: line.speechText, styleId }));
    checkpoint(line, `情境精调 ${today}`);
    const query = tuneQuery(data.query, line);
    line.styleId = styleId;
    line.audioQuery = query;
    line.tuning = {
      speedScale: query.speedScale,
      pitchScale: query.pitchScale,
      intonationScale: query.intonationScale,
      volumeScale: query.volumeScale
    };
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

