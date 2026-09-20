const base = process.env.ILY_VOICEVOX_BASE || 'http://127.0.0.1:8084';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, options);
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data;
}
const get = path => request(path);
const post = (path, value) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
const retry = async fn => { let error; for (let i = 0; i < 3; i++) { try { return await fn(); } catch (e) { error = e; await sleep(250 * (i + 1)); } } throw error; };

function context(text) {
  return {
    dramatic: /……|…|――|どうして|なぜ|怖|恐|嫌|無理|嘘|違う|消え|さよなら|死/.test(text),
    excited: /！|!|？|\?|やった|嬉|大好き|好き|えへ|うん！|わあ|すごい/.test(text),
    quiet: /……|…|お願い|ごめん|ごめんなさい/.test(text) && [...text].length <= 42,
    question: /？|\?/.test(text)
  };
}
function styleBucket(text) {
  let hash = 2166136261;
  for (const ch of text) { hash ^= ch.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) % 100;
}
function chooseStyle(text) {
  // 按用户指定：第二项「あまあま」与第四项「セクシー」合计约 80%，其余仅作少量情绪点缀。
  const bucket = styleBucket(text);
  if (bucket < 40) return 0;   // 四国めたん · あまあま
  if (bucket < 80) return 4;   // 四国めたん · セクシー
  if (bucket < 90) return 2;   // 四国めたん · ノーマル
  if (bucket < 95) return 6;   // 四国めたん · ツンツン
  if (bucket < 98) return 36;  // 四国めたん · ささやき
  return 37;                    // 四国めたん · ヒソヒソ
}
function tune(query, text) {
  const c = context(text);
  const speed = c.quiet ? 0.88 : c.dramatic ? 0.94 : c.excited ? 1.03 : 0.98;
  const pitch = c.dramatic ? -0.04 : c.excited ? 0.08 : 0.03;
  const intonation = c.quiet ? 0.88 : c.dramatic ? 1.05 : c.excited ? 1.12 : 1;
  const length = c.quiet ? 1.16 : c.dramatic ? 1.08 : c.excited ? 0.93 : 1;
  Object.assign(query, { speedScale: speed, pitchScale: pitch, intonationScale: intonation, volumeScale: 1 });
  for (const phrase of query.accent_phrases || []) {
    const accent = Math.max(0, Number(phrase.accent || 1) - 1);
    for (const [i, mora] of (phrase.moras || []).entries()) {
      if (Number.isFinite(mora.vowel_length)) mora.vowel_length = clamp(mora.vowel_length * length * (i === accent ? 1.08 : 1), 0.035, 3);
      if (mora.consonant != null && Number.isFinite(mora.consonant_length)) mora.consonant_length = clamp(mora.consonant_length * (c.quiet ? 1.08 : c.dramatic ? 1.03 : 0.98), 0.01, 3);
      if (Number.isFinite(mora.pitch) && mora.pitch > 0) mora.pitch = clamp(mora.pitch + pitch + (c.question && i >= accent ? 0.06 : 0) + (i === accent ? 0.05 : 0), 3, 10);
    }
    if (phrase.pause_mora && Number.isFinite(phrase.pause_mora.vowel_length)) phrase.pause_mora.vowel_length = clamp(phrase.pause_mora.vowel_length * (c.quiet ? 1.35 : c.dramatic ? 1.25 : c.excited ? 0.9 : 1.08), 0.08, 3);
  }
  return query;
}
function snap(line) { return { speechText: line.speechText || '', styleId: line.styleId ?? null, audioQuery: line.audioQuery ?? null, tuning: line.tuning ?? null, renderStale: Boolean(line.renderStale) }; }
function checkpoint(line) { line.tuningHistory ||= []; line.tuningHistory.push({ label: '改用四国めたん并重新情境精调 2026-09-20', value: snap(line) }); if (line.tuningHistory.length > 30) line.tuningHistory.shift(); line.tuningRedo = []; }

const project = await get('/api/voicevox/project');
const status = await get('/api/voicevox/status');
const lines = project.lines.filter(line => line.voiceRole === 'ILY' && line.speechText?.trim());
if (lines.length !== 200) throw new Error(`预期 200 条 ILY，实际 ${lines.length} 条`);
for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  const styleId = chooseStyle(line.speechText);
  const data = await retry(() => post('/api/voicevox/query', { text: line.speechText, styleId }));
  checkpoint(line);
  line.styleId = styleId;
  line.audioQuery = tune(data.query, line.speechText);
  line.tuning = { speedScale: line.audioQuery.speedScale, pitchScale: line.audioQuery.pitchScale, intonationScale: line.audioQuery.intonationScale, volumeScale: 1 };
  line.translationStatus = 'proofread';
  line.renderStale = false;
  if ((i + 1) % 25 === 0 || i === lines.length - 1) console.log(`ILY 四国音色查询与精调 ${i + 1}/${lines.length}`);
}
const saved = await post('/api/voicevox/project', { project: { ...project, engine: { uuid: status.uuid, version: status.version, manifestVersion: status.manifestVersion } }, revision: project.projectRevision });
const identity = { uuid: status.uuid, version: status.version, manifestVersion: status.manifestVersion };
const queued = await post('/api/voicevox/queue', { action: 'enqueue', engineIdentity: identity, lines: lines.map(line => ({ lineId: line.lineId, speechText: line.speechText, styleId: line.styleId, translationStatus: line.translationStatus, audioQuery: line.audioQuery, synthesisOptions: { tuning: line.tuning } })) });
console.log(`已加入新队列 ${queued.added.length} 条，工程 revision=${saved.projectRevision}`);
const ids = lines.map(line => line.lineId);
while (true) {
  const queue = await get('/api/voicevox/queue');
  const latest = new Map();
  for (const task of queue.tasks.filter(task => ids.includes(task.lineId))) {
    const previous = latest.get(task.lineId);
    if (!previous || String(task.createdAt || '') > String(previous.createdAt || '')) latest.set(task.lineId, task);
  }
  const current = [...latest.values()];
  const failed = current.filter(task => task.status === 'failed');
  if (failed.length) throw new Error(`ILY 合成失败：${failed.slice(0, 3).map(task => task.lineId).join(', ')}`);
  const done = current.filter(task => task.status === 'completed');
  console.log(`ILY 合成进度 ${done.length}/${ids.length}`);
  if (done.length === ids.length) break;
  await sleep(1200);
}
const exported = await post('/api/voicevox/batch-export', { lineIds: ids });
const latest = await get('/api/voicevox/project');
const published = await post('/api/voicevox/publish', { lineIds: ids, revision: latest.projectRevision });
console.log(`已导出 ${exported.count} 条并发布 ${published.count} 条：${published.manifestFile}`);
