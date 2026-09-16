/**
 * Build the heroine-view chapter from its reviewed plain-text source.
 *
 * This is intentionally separate from tools/chapters/build.py. The heroine
 * script retains its own scene/production grammar, but uses the shared content
 * rules: narration is screen text, inner speech is omitted, spoken lines alone
 * become Galgame dialogue.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseLine, normalizeNode } from '../script-rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const sourcePath = path.join(root, 'tools', 'chapters', '女主视角_Galgame演出脚本.txt');
const outputPath = path.join(root, 'game', 'data', 'story', 'heroine.js');

const CHAPTER_KEYS = {
  '序章': 'prologue', '第一章': '01', '第二章': '02', '第三章': '03',
  '第四章': '04', '第五章': '05', '第六章': '06', '终章前': '07'
};

// Every scene is deliberately assigned to an existing project asset. When new
// artwork arrives, only these stable IDs / the asset manifest need changing.
const SCENE_BACKGROUNDS = {
  'pro-01': 'bg-coast-blue', 'pro-02': 'bg-coast-blue', 'pro-03': 'bg-coast-blue', 'pro-04': 'bg-coast-blue',
  '01-01': 'ch1-store', '01-02': 'ch1-store', '01-03': 'bg-apartment-dusk', '01-04': 'bg-hallway', '01-05': 'bg-hallway-dark',
  '02-01': 'heroine-cafe', '02-02': 'heroine-phone-screen', '02-03': 'heroine-cafe', '02-04': 'heroine-cafe', '02-05': 'heroine-cafe',
  '03-01': 'bg-hallway', '03-02': 'ch1-panorama', '03-03': 'ch1-aquarium', '03-04': 'ch1-aquarium',
  '03-05': 'heroine-phone-screen', '03-06': 'ch1-aquarium', '03-07': 'heroine-photo-screen', '03-08': 'ch1-aquarium',
  '04-01': 'ch1-empty-tank', '04-02': 'bg-coast-blue', '04-03': 'bg-coast-blue', '04-04': 'bg-apartment-night',
  '04-05': 'bg-apartment-night', '04-06': 'bg-apartment-night', '04-07': 'bg-apartment-night', '04-08': 'bg-apartment-night', '04-09': 'bg-coast-night',
  '05-01': 'ch2-beach', '05-02': 'ch2-flowers', '05-03': 'ch2-stone', '05-04': 'ch2-sunset',
  '05-05': 'ch2-sunset', '05-06': 'ch2-sunset', '05-07': 'ch2-adult', '05-08': 'ch2-sunset',
  '06-01': 'bg-apartment-night', '06-02': 'bg-apartment-night', '06-03': 'bg-apartment-night', '06-04': 'bg-apartment-night', '06-05': 'bg-apartment-night',
  '07-01': 'bg-coast-night'
};

const CHARACTER_IDS = {
  '基生': 'portrait-kio', 'ILY': 'portrait-airi', '成年爱理': 'ch2-adult',
  '十屋': 'ch1-toya', '十屋后辈': 'ch1-toya', '十屋君': 'ch1-toya', '小泪': 'ch1-rui',
  '蝶': 'heroine-chou', '优那': 'heroine-yuuna', '春': 'heroine-haru', '八重': 'heroine-yae',
  '若菜': 'heroine-wakana', '“拓马”前辈': 'heroine-takuma'
};

const source = await readFile(sourcePath, 'utf8');
const lines = source.split(/\r?\n/);
const nodes = {};
const sequence = [];
const counts = { card: 0, scene: 0, fullscreen: 0, dialogue: 0, inner: 0, narration: 0, notes: 0 };
let active = false;
let chapterKey = 'prologue';
let chapterName = '青';
let chapterTitle = '女主视角 · 青';
let scene = 'pro-01';
let sceneTitle = '无边界的青';
let background = SCENE_BACKGROUNDS[scene];
let characters = [];
let effects = [];
let pendingTransition = '';
let pending = freshProduction();
let serial = 0;

function freshProduction() {
  return { background: [], portraits: [], bgm: [], sfx: [], effects: [], direction: [] };
}

function compactProduction(value) {
  const out = {};
  for (const [key, items] of Object.entries(value)) if (items.length) out[key] = [...items];
  return Object.keys(out).length ? out : null;
}

function visualState() {
  const state = { background };
  if (characters.length === 1) state.portrait = characters[0].image;
  else if (characters.length > 1) state.characters = characters.map(character => ({ ...character }));
  if (effects.length) state.visualEffects = [...effects];
  if (pendingTransition) { state.transition = pendingTransition; pendingTransition = ''; }
  return state;
}

function addNode(id, type, text, speaker = '', extra = {}) {
  const production = compactProduction(pending);
  pending = freshProduction();
  const node = {
    type, text, speaker, chapter: 'heroine', chapterTitle, scene, sceneTitle,
    ...visualState(), ...extra
  };
  if (production) node.production = production;
  normalizeNode(node);
  nodes[id] = node;
  sequence.push(id);
  return node;
}

function nextId() {
  serial += 1;
  return `her_${String(serial).padStart(4, '0')}`;
}

function attachPendingToPrevious() {
  const production = compactProduction(pending);
  if (production && sequence.length) nodes[sequence.at(-1)].postProduction = production;
  pending = freshProduction();
}

function portraitImage(name, description) {
  if (name === 'ILY') {
    if (/崩坏|残破|电线/.test(description)) return 'airi-broken';
    if (/惊|恐/.test(description)) return 'airi-scared';
    if (/哭|泪/.test(description)) return 'airi-crying';
    if (/脸红|满脸通红|羞/.test(description)) return 'airi-blush';
    if (/低头|阴沉|不安/.test(description)) return 'airi-gloomy';
    if (/困惑|疑问|歪头/.test(description)) return 'airi-confused';
  }
  return CHARACTER_IDS[name];
}

function readPortraits(note) {
  const removeILY = /ILY 立绘与声音全部移除/.test(note);
  const result = [];
  for (const [name] of Object.entries(CHARACTER_IDS).sort((a, b) => b[0].length - a[0].length)) {
    if (name === 'ILY' && removeILY) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = note.match(new RegExp(`${escaped}（([^）]*)）`));
    if (!match || /仅声音/.test(match[1])) continue;
    const description = match[1];
    const position = /左/.test(description) ? 'left' : /右/.test(description) ? 'right' : 'center';
    result.push({ image: portraitImage(name, description), position });
  }
  return result;
}

function readEffects(note) {
  const result = [];
  if (/扫描|撕裂|失真|故障|乱码|噪点|色差/.test(note)) result.push('glitch');
  if (/青色|蓝色|幽蓝/.test(note)) result.push('blue');
  if (/去饱和|黑白/.test(note)) result.push('desaturated');
  if (/压暗|变暗|熔灭|暗角/.test(note)) result.push('dark');
  if (/闪|骤亮|爆开/.test(note)) result.push('flash');
  if (/柔光|柔焦/.test(note)) result.push('soft');
  if (/半透明|透明|光点|消失/.test(note)) result.push('dissolve');
  return [...new Set(result)];
}

function transitionName(line) {
  if (/至白/.test(line)) return 'fade-white';
  if (/至黑|淡出/.test(line)) return 'fade-black';
  return 'cut';
}

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index].trim();
  if (line === '序章｜青') active = true;
  if (!active || !line) continue;
  if (line === '——此处接回最终章——') break;

  const chapterMatch = line.match(/^(序章|第[一二三四五六]章|终章前)｜(.+)$/);
  if (chapterMatch) {
    attachPendingToPrevious();
    chapterKey = CHAPTER_KEYS[chapterMatch[1]];
    chapterName = chapterMatch[2];
    chapterTitle = `女主视角 · ${chapterName}`;
    scene = `${chapterKey}-00`;
    sceneTitle = line;
    background = chapterKey === 'prologue' ? 'bg-coast-blue' : background;
    characters = [];
    effects = chapterKey === 'prologue' ? ['blue'] : [];
    addNode(`her_chapter_${chapterKey}`, 'heroine-card', line, '', { checkpoint: true });
    counts.card += 1;
    continue;
  }

  const sceneMatch = line.match(/^(?:序|\d{2})－(\d{2})　(.+)$/);
  if (sceneMatch) {
    attachPendingToPrevious();
    const prefix = line.startsWith('序－') ? 'pro' : line.slice(0, 2);
    scene = `${prefix}-${sceneMatch[1]}`;
    sceneTitle = sceneMatch[2];
    background = SCENE_BACKGROUNDS[scene];
    if (!background) throw new Error(`No background mapping for ${scene} at source line ${index + 1}`);
    characters = [];
    effects = [];
    addNode(`her_scene_${scene.replace('-', '_')}`, 'heroine-card', sceneTitle, '', { checkpoint: true, sectionLabel: line.slice(0, line.indexOf('　')) });
    counts.scene += 1;
    continue;
  }

  if (line.startsWith('※')) { counts.notes += 1; continue; }
  if (/^——.*——$/.test(line)) {
    attachPendingToPrevious();
    if (sequence.length) nodes[sequence.at(-1)].exitTransition = transitionName(line);
    pendingTransition = transitionName(line);
    continue;
  }

  // A lone character name in the source is a staging cue, not spoken text.
  if (['基生', 'ILY', '春', '八重', '若菜', '蝶', '优那', '十屋君', '十屋后辈', '小泪', '成年爱理', '主管', '？'].includes(line)) {
    pending.direction.push(`角色提示：${line}`);
    continue;
  }

  const tagMatch = line.match(/^【([^】]+)】(.*)$/);
  if (tagMatch) {
    const [, tag, bodyRaw] = tagMatch;
    const body = bodyRaw.trim();
    if (tag === '背景') pending.background.push(body);
    else if (tag === '立绘') { pending.portraits.push(body); characters = readPortraits(body); }
    else if (tag === 'BGM') pending.bgm.push(body);
    else if (tag === 'SE') pending.sfx.push(body);
    else if (tag === '特效') { pending.effects.push(body); effects = readEffects(body); }
    else pending.direction.push(`${tag}：${body}`);
    continue;
  }

  const parsed = parseLine(line);
  if (parsed) {
    addNode(nextId(), parsed.type, parsed.text, parsed.speaker);
    if (parsed.type === 'monologue') counts.fullscreen += 1;
    else if (parsed.type === 'cue') counts.inner += 1;
    else counts.dialogue += 1;
    continue;
  }

  addNode(nextId(), 'dialogue', line, '旁白');
  counts.narration += 1;
}

attachPendingToPrevious();
if (!sequence.length) throw new Error('No heroine-view nodes were generated.');
for (let index = 0; index < sequence.length - 1; index += 1) nodes[sequence[index]].next = sequence[index + 1];
nodes[sequence[0]].setFlags = { HEROINE_POV_STARTED: true };
nodes[sequence.at(-1)].setFlags = { HEROINE_POV_COMPLETE: true };
nodes[sequence.at(-1)].next = 'fin_s01';

// Replay the first store scene backwards before revealing the same shot without ILY.
// Keep the existing card/line IDs so saved games and script-review edits still resolve.
nodes.her_scene_01_02.rewindScene = 'her_scene_01_01';
for (const node of Object.values(nodes)) {
  if (node.scene !== '01-02') continue;
  node.visualEffects = ['grayscale'];
  if (node.portrait === 'portrait-kio') {
    node.characters = [{ image: 'portrait-kio', position: 'left' }];
    delete node.portrait;
  }
}

// "Smartphone screen" is staging, not an intertitle. Present the complete
// message as one layered UI while retaining the generated line nodes for old
// saves and the script-review tool.
nodes.her_scene_02_02.phoneConversation = {
  senderKey: 'heroine.sms.sender',
  timeKey: 'heroine.sms.time',
  messageKeys: [
    'heroine.sms.message.1',
    'heroine.sms.message.2',
    'heroine.sms.message.3',
    'heroine.sms.message.4',
    'heroine.sms.message.5',
    'heroine.sms.message.6'
  ]
};
nodes.her_scene_02_02.next = 'her_scene_02_03';

// Toya's handset uses the same separated text layers with its own appearance.
// Attach the presentation to old line IDs too, so in-scene saves open the phone.
const toyaConversation = {
  variant: 'toya',
  ariaKey: 'heroine.sms.toya.aria',
  senderKey: 'heroine.sms.toya.sender',
  messageKeys: [
    'heroine.sms.toya.message.1',
    'heroine.sms.toya.message.2',
    'heroine.sms.toya.message.3'
  ]
};
for (const id of ['her_scene_03_05', 'her_0130', 'her_0131', 'her_0132']) {
  nodes[id].phoneConversation = toyaConversation;
  nodes[id].next = 'her_scene_03_06';
}

const story = {
  id: 'heroine', title: '女主视角 · 青', start: sequence[0],
  source: '《女主视角_Galgame演出脚本.docx》', nodes
};
const output = `// Generated by tools/heroine/build.mjs. Do not hand-edit.\nILY.data.stories.heroine = ${JSON.stringify(story, null, 2)};\n`;
await writeFile(outputPath, output, 'utf8');

console.log(`heroine: ${sequence.length} nodes (${counts.fullscreen + counts.narration} screen text, ${counts.dialogue} dialogue, ${counts.inner} omitted cues, ${counts.scene} scenes)`);
