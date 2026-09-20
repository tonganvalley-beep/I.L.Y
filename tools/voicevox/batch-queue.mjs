import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const now = () => new Date().toISOString();

export function isValidWav(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') return false;
  const riffEnd = buffer.readUInt32LE(4) + 8;
  if (riffEnd > buffer.length || riffEnd < 44) return false;
  let offset = 12, hasFormat = false, hasData = false;
  while (offset + 8 <= riffEnd) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const end = offset + 8 + size;
    if (end > riffEnd) return false;
    if (type === 'fmt ') hasFormat = size >= 16;
    if (type === 'data') hasData = true;
    offset = end + (size % 2);
  }
  return hasFormat && hasData;
}

async function atomicJson(file, value) {
  await mkdir(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2), 'utf8');
  await rename(temp, file);
}

export class BatchQueue {
  constructor({ engine, journalFile, renderDir }) {
    this.engine = engine;
    this.journalFile = journalFile;
    this.renderDir = renderDir;
    this.state = { schemaVersion: 1, paused: false, tasks: [], updatedAt: null };
    this.running = false;
    this.controllers = new Map();
    this.persistChain = Promise.resolve();
  }

  async init() {
    try { this.state = JSON.parse(await readFile(this.journalFile, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const task of this.state.tasks) {
      if (task.status === 'running') {
        task.status = 'pending';
        task.message = '服务重启后等待恢复';
      }
    }
    await this.persist();
    this.kick();
    return this.snapshot();
  }

  snapshot() {
    const tasks = this.state.tasks.map(({ querySnapshot, ...task }) => task);
    const counts = tasks.reduce((out, task) => ({ ...out, [task.status]: (out[task.status] || 0) + 1 }), {});
    return { ...this.state, tasks, counts, activeTaskId: tasks.find(task => task.status === 'running')?.taskId || null };
  }

  async persist() {
    this.state.updatedAt = now();
    const snapshot = structuredClone(this.state);
    this.persistChain = this.persistChain.then(() => atomicJson(this.journalFile, snapshot));
    await this.persistChain;
  }

  async enqueue(lines, engineIdentity = null) {
    if (!Array.isArray(lines) || !lines.length) throw Object.assign(new Error('没有可加入的台词'), { code: 'EMPTY_QUEUE' });
    const added = [];
    for (const line of lines) {
      const styleId = Number(line.styleId);
      if (!line.lineId || !line.speechText?.trim() || !Number.isInteger(styleId) || line.translationStatus !== 'proofread') {
        throw Object.assign(new Error(`台词 ${line.lineId || '(无 ID)'} 必须有日语文本、声音风格且已校对`), { code: 'INVALID_TASK' });
      }
      const input = {
        lineId: String(line.lineId), speechText: line.speechText.trim(), styleId,
        querySnapshot: line.audioQuery || null, engineIdentity,
        synthesisOptions: line.synthesisOptions || {}
      };
      const inputHash = hash(input);
      const existing = this.state.tasks.find(task => task.lineId === input.lineId && task.inputHash === inputHash && ['pending', 'running', 'completed'].includes(task.status));
      if (existing) continue;
      const task = {
        taskId: randomUUID(), lineId: input.lineId, speechText: input.speechText, styleId,
        querySnapshot: input.querySnapshot, engineIdentity, synthesisOptions: input.synthesisOptions,
        inputHash, status: 'pending', attempts: 0, createdAt: now(), updatedAt: now(),
        outputFile: null, error: null, message: '等待合成'
      };
      this.state.tasks.push(task);
      added.push(task.taskId);
    }
    await this.persist();
    this.kick();
    return { added, queue: this.snapshot() };
  }

  async setPaused(paused) {
    this.state.paused = Boolean(paused);
    await this.persist();
    if (!this.state.paused) this.kick();
    return this.snapshot();
  }

  async cancel(taskIds) {
    const ids = new Set(taskIds || []);
    for (const task of this.state.tasks) {
      if (!ids.has(task.taskId) || !['pending', 'running', 'failed'].includes(task.status)) continue;
      const wasRunning = task.status === 'running';
      task.status = 'cancelled';
      task.message = wasRunning ? '已请求取消；引擎可能仍在结束计算' : '已取消';
      task.updatedAt = now();
      this.controllers.get(task.taskId)?.abort();
    }
    await this.persist();
    return this.snapshot();
  }

  async retry(taskIds) {
    const ids = new Set(taskIds || []);
    for (const task of this.state.tasks) {
      if (ids.has(task.taskId) && ['failed', 'cancelled'].includes(task.status)) {
        task.status = 'pending'; task.error = null; task.message = '等待重试'; task.updatedAt = now();
      }
    }
    await this.persist();
    this.kick();
    return this.snapshot();
  }

  kick() {
    if (this.running || this.state.paused) return;
    this.running = true;
    queueMicrotask(() => this.drain().finally(() => { this.running = false; if (!this.state.paused && this.state.tasks.some(x => x.status === 'pending')) this.kick(); }));
  }

  async drain() {
    while (!this.state.paused) {
      const task = this.state.tasks.find(item => item.status === 'pending');
      if (!task) break;
      await this.runTask(task);
    }
  }

  async runTask(task) {
    const controller = new AbortController();
    this.controllers.set(task.taskId, controller);
    task.status = 'running'; task.attempts += 1; task.updatedAt = now(); task.message = '正在合成';
    await this.persist();
    try {
      const query = task.querySnapshot || await this.engine.query(task.speechText, task.styleId, task.synthesisOptions);
      if (!task.querySnapshot && task.synthesisOptions?.tuning) Object.assign(query, task.synthesisOptions.tuning);
      const cacheKey = hash({ query, styleId: task.styleId, engineIdentity: task.engineIdentity, synthesisOptions: task.synthesisOptions });
      const relative = `${cacheKey}.wav`;
      const finalFile = join(this.renderDir, relative);
      let audio;
      try { audio = await readFile(finalFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (!isValidWav(audio)) {
        audio = await this.engine.synthesize(query, task.styleId, controller.signal);
        if (!isValidWav(audio)) throw Object.assign(new Error('引擎返回的文件不是有效 WAV'), { code: 'INVALID_WAV' });
        await mkdir(this.renderDir, { recursive: true });
        const temp = `${finalFile}.${process.pid}.${task.taskId}.tmp`;
        await writeFile(temp, audio);
        if (task.status === 'cancelled') return;
        await rename(temp, finalFile);
      }
      if (task.status === 'cancelled') return;
      task.status = 'completed'; task.cacheKey = cacheKey; task.outputFile = relative;
      task.queryHash = hash(query); task.completedAt = now(); task.message = '合成完成'; task.error = null;
    } catch (error) {
      if (task.status !== 'cancelled') {
        task.status = 'failed'; task.error = { code: error.code || error.name || 'SYNTHESIS_FAILED', message: error.message };
        task.message = `失败：${error.message}`;
      }
    } finally {
      task.updatedAt = now(); this.controllers.delete(task.taskId); await this.persist();
    }
  }

  async exportCompleted(lineIds, exportDir, manifestFile) {
    const ids = new Set(lineIds || []);
    const entries = [];
    for (const lineId of ids) {
      const task = [...this.state.tasks].reverse().find(item => item.lineId === lineId && item.status === 'completed');
      if (!task) throw Object.assign(new Error(`台词 ${lineId} 尚无已完成音频`), { code: 'AUDIO_NOT_READY' });
      const source = join(this.renderDir, task.outputFile);
      const audio = await readFile(source);
      if (!isValidWav(audio)) throw Object.assign(new Error(`台词 ${lineId} 的缓存 WAV 无效`), { code: 'INVALID_WAV' });
      const filename = `${hash({ lineId }).slice(0, 24)}.wav`;
      await mkdir(exportDir, { recursive: true });
      await copyFile(source, join(exportDir, filename));
      entries.push({ lineId, file: filename, inputHash: task.inputHash, cacheKey: task.cacheKey, styleId: task.styleId, engine: task.engineIdentity, generatedAt: task.completedAt });
    }
    const manifest = { schemaVersion: 1, generatedAt: now(), count: entries.length, entries };
    await atomicJson(manifestFile, manifest);
    return manifest;
  }
}
