import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const storyIds = ['prologue', 'chapter1', 'chapter2', 'chapter3', 'heroine', 'final'];

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function loadEffectiveStory() {
  const context = vm.createContext({ console });
  context.window = context;
  const files = ['src/bootstrap.js', ...storyIds.map(id => `data/story/${id}.js`), 'src/core/chapter1.js', 'src/core/voice-source.js', 'src/script-review-model.js', 'data/story/script-edits.js'];
  for (const file of files) vm.runInContext(await readFile(new URL(`game/${file}`, root), 'utf8'), context, { filename: file });

  const story = context.ILY.prepareChapter1();
  const base = Object.fromEntries(Object.entries(story.nodes).map(([id, node]) => [id, { ...node }]));
  const owners = new Map();
  for (const storyId of storyIds) {
    for (const id of Object.keys(context.ILY.data.stories[storyId]?.nodes || {})) owners.set(id, storyId);
  }
  const records = context.ILY_SCRIPT_EDITS || {};
  context.ILYScriptReview.create(story).apply(records);
  return { context, story, base, records, owners, ordered: context.ILY.orderedVoiceNodes(story, base) };
}

export async function loadVoiceLines() {
  const { context, story, base } = await loadEffectiveStory();
  const lines = context.ILY.collectVoiceSources(story, base, context.ILY.data.stories).map(({ sourceValues, ...line }) => ({ ...line, sourceFingerprint: hash(sourceValues) }));
  const ids = lines.map(line => line.lineId);
  if (ids.length !== new Set(ids).size) throw new Error('有效剧本产生了重复 lineId，无法安全导出。');
  return { lines, sourceRevision: hash(lines.map(line => [line.lineId, line.sourceFingerprint])) };
}
