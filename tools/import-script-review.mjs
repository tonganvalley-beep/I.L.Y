import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
export async function loadStory() {
  const context = vm.createContext({});
  context.window = context;
  for (const file of ['src/bootstrap.js', ...['prologue', 'chapter1', 'chapter2', 'chapter3', 'heroine', 'final'].map(id => `data/story/${id}.js`), 'src/core/chapter1.js', 'src/script-review-model.js']) {
    vm.runInContext(await readFile(new URL(`game/${file}`, root), 'utf8'), context, { filename: file });
  }
  return { context, story: context.ILY.prepareChapter1() };
}

export function validateRecords(records, nodes) {
  if (!records || typeof records !== 'object' || Array.isArray(records)) throw new Error('导出内容必须是段落修改记录对象。');
  const chapters = {}, kinds = new Set(['台词', '旁白', '内心', '演出', '玩法/结构']), positions = new Set(['left', 'center', 'right']);
  const validateCharacters = (characters, label) => {
    if (!Array.isArray(characters) || characters.length > 12) throw new Error(`${label}: characters 必须是最多 12 人的数组。`);
    characters.forEach((character, index) => {
      const prefix = `${label}: characters[${index}]`;
      if (!character || typeof character !== 'object' || Array.isArray(character)) throw new Error(`${prefix} 格式错误。`);
      if (typeof character.image !== 'string' || !character.image.trim()) throw new Error(`${prefix}.image 必须是非空文本。`);
      if (character.position != null && !positions.has(character.position)) throw new Error(`${prefix}.position 必须是 left、center 或 right。`);
      if (character.scale != null && (!Number.isFinite(character.scale) || character.scale < 0.5 || character.scale > 1.4)) throw new Error(`${prefix}.scale 必须是 0.5 到 1.4 的数字。`);
      if (character.speaking != null && typeof character.speaking !== 'boolean') throw new Error(`${prefix}.speaking 必须是布尔值。`);
    });
  };
  let added = 0, deleted = 0;
  for (const [id, record] of Object.entries(records)) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`${id}: 记录格式错误。`);
    for (const key of ['text', 'speaker', 'kind', 'background', 'portrait']) if (record[key] != null && typeof record[key] !== 'string') throw new Error(`${id}: ${key} 必须是文本。`);
    if (record.characters != null) validateCharacters(record.characters, id);
    if (record.kind != null && !kinds.has(record.kind)) throw new Error(`${id}: 未知文本类型。`);
    for (const key of ['added', 'deleted']) if (record[key] != null && typeof record[key] !== 'boolean') throw new Error(`${id}: ${key} 必须是布尔值。`);
    let anchor = id;
    if (record.added) {
      added++;
      if (nodes[id] || !record.node || !['dialogue', 'monologue', 'heroine-card', 'cue'].includes(record.node.type) || !['before', 'after'].includes(record.position)) throw new Error(`${id}: 新增段落格式错误或编号重复。`);
      if (record.node.characters != null) validateCharacters(record.node.characters, `${id}.node`);
      const seen = new Set();
      while (records[anchor]?.added) {
        if (seen.has(anchor)) throw new Error(`${id}: 新增段落位置形成循环。`);
        seen.add(anchor);
        anchor = records[anchor].anchor;
      }
    }
    if (!nodes[anchor]) throw new Error(`${id}: 找不到原段落 ${anchor}，请先核对剧本版本。`);
    if (record.deleted) deleted++;
    const chapter = nodes[anchor].chapter || 'prologue';
    chapters[chapter] = (chapters[chapter] || 0) + 1;
  }
  return { records: Object.keys(records).length, added, deleted, chapters };
}

export function serializeRecords(records) {
  return '// Published script-editor changes. Import future exports with tools/import-script-review.mjs.\nwindow.ILY_SCRIPT_EDITS = ' + JSON.stringify(records, null, 2) + ';\n';
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const input = process.argv[2];
  if (!input) throw new Error('用法：node tools/import-script-review.mjs <导出的 ily-script-review.json> [--check]');
  const records = JSON.parse(await readFile(resolve(input), 'utf8'));
  const { story } = await loadStory();
  const summary = validateRecords(records, story.nodes);
  if (!process.argv.includes('--check')) await writeFile(new URL('game/data/story/script-edits.js', root), serializeRecords(records), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log(process.argv.includes('--check') ? '校验通过，未写入文件。' : '已保存全部文本和增删记录到 game/data/story/script-edits.js；检查 Git 差异后提交并推送。');
}
