import { mkdir, readFile, rename, writeFile, copyFile, access, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

export const projectPath = join(process.cwd(), 'game/data/voice/voicevox-project.json');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const emptyProject = () => ({ schemaVersion: 2, projectRevision: null, lines: [], engine: null });
const fail = (code, message) => Object.assign(new Error(message), { code });

function validateProject(project, { maxLines, maxBytes }) {
  if (!project || typeof project !== 'object' || Array.isArray(project) || !Array.isArray(project.lines)) {
    throw fail('INVALID_PROJECT', '工程格式无效：lines 必须是数组');
  }
  if (project.lines.length > maxLines) throw fail('PROJECT_TOO_LARGE', `工程台词超过 ${maxLines} 条上限`);
  const ids = new Set();
  for (const [index, line] of project.lines.entries()) {
    if (!line || typeof line !== 'object' || typeof line.lineId !== 'string' || !line.lineId.trim()) {
      throw fail('INVALID_PROJECT', `工程第 ${index + 1} 条缺少有效 lineId`);
    }
    if (ids.has(line.lineId)) throw fail('INVALID_PROJECT', `工程包含重复 lineId：${line.lineId}`);
    ids.add(line.lineId);
  }
  const serialized = JSON.stringify(project, null, 2);
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) throw fail('PROJECT_TOO_LARGE', `工程文件超过 ${Math.floor(maxBytes / 1024 / 1024)} MB 上限`);
  return serialized;
}

export function createProjectStore({ filename = projectPath, maxLines = 10_000, maxBytes = 20 * 1024 * 1024 } = {}) {
  let saveChain = Promise.resolve();
  async function read() {
    let source;
    try { source = await readFile(filename, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return emptyProject(); throw error; }
    let project;
    try { project = JSON.parse(source); }
    catch { throw fail('INVALID_PROJECT', '工程文件不是有效 JSON；请检查 .bak 备份'); }
    validateProject(project, { maxLines, maxBytes });
    return project;
  }

  async function performSave(project, revision) {
    const current = await read();
    if (revision !== undefined && revision !== current.projectRevision && current.projectRevision) {
      throw fail('CONFLICT', '工程已被其他窗口修改');
    }
    const { projectRevision: _oldRevision, savedAt: _oldSavedAt, ...payload } = project;
    const content = { ...payload, schemaVersion: 2, projectRevision: hash({ ...payload, schemaVersion: 2 }), savedAt: new Date().toISOString() };
    const serialized = validateProject(content, { maxLines, maxBytes });
    await mkdir(dirname(filename), { recursive: true });
    const temp = `${filename}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(temp, serialized, { encoding: 'utf8', flag: 'wx' });
      try { await copyFile(filename, `${filename}.bak`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await rename(temp, filename);
    } finally { await unlink(temp).catch(() => {}); }
    return content;
  }

  function save(project, revision) {
    const pending = saveChain.then(() => performSave(project, revision));
    saveChain = pending.catch(() => {});
    return pending;
  }

  return { readProject: read, saveProject: save };
}

const defaultStore = createProjectStore();
export const readProject = defaultStore.readProject;
export const saveProject = defaultStore.saveProject;
export async function hasFile(path) { try { await access(path); return true; } catch { return false; } }
