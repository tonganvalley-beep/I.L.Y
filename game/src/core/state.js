(() => {
'use strict';
function createState(node = 'arrival') {
  return {
    version: 1,
    chapter: 'prologue',
    node,
    clues: [],
    flags: { achievements: [], memories: { story: [], gallery: [] } },
    maps: {}
  };
}

// 回滚记录的是完整游戏状态，而不只是节点 ID。这样退回选项前时，
// 分支标记、线索、地图位置和玩法进度也会一起回到当时的值；
// 账号级的永久成就在恢复时另行合并，不会被旧快照撤销。
function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureMemoryProgress(state) {
  if (!state.flags || typeof state.flags !== 'object' || Array.isArray(state.flags)) state.flags = {};
  const memories = state.flags.memories;
  if (!memories || typeof memories !== 'object' || Array.isArray(memories)) state.flags.memories = {};
  if (!Array.isArray(state.flags.memories.story)) state.flags.memories.story = [];
  if (!Array.isArray(state.flags.memories.gallery)) state.flags.memories.gallery = [];
  return state.flags.memories;
}

// 节点只有在实际进入时才会进入剧情回忆；节点中实际展示过的 CG / 插图才会进入画廊。
function activateMemory(state, nodeId, node) {
  const memories = ensureMemoryProgress(state);
  if (typeof nodeId === 'string' && nodeId && !memories.story.includes(nodeId)) memories.story.push(nodeId);
  for (const assetId of [node && node.cg, node && node.overlay, node && node.gallery]) {
    if (typeof assetId === 'string' && assetId && !memories.gallery.includes(assetId)) memories.gallery.push(assetId);
  }
  return memories;
}

// 成就和已激活的回忆都是账号级的永久进度，不应随着剧情回滚而撤销。
// 只合并这些已解锁 ID；其余剧情状态仍以历史快照为准。
function preserveAchievements(restored, current) {
  if (!restored.flags || typeof restored.flags !== 'object' || Array.isArray(restored.flags)) restored.flags = {};
  const before = Array.isArray(restored.flags.achievements) ? restored.flags.achievements : [];
  const unlocked = current && current.flags && Array.isArray(current.flags.achievements)
    ? current.flags.achievements
    : [];
  restored.flags.achievements = [...new Set([...before, ...unlocked])];
  const restoredMemories = ensureMemoryProgress(restored);
  const currentMemories = current ? ensureMemoryProgress(current) : { story: [], gallery: [] };
  restoredMemories.story = [...new Set([...restoredMemories.story, ...currentMemories.story])];
  restoredMemories.gallery = [...new Set([...restoredMemories.gallery, ...currentMemories.gallery])];
  return restored;
}

function createRollbackHistory(limit = 120) {
  const capacity = Number.isInteger(limit) && limit > 1 ? limit : 120;
  let entries = [];
  return {
    record(value) {
      entries.push(cloneState(value));
      if (entries.length > capacity) entries.splice(0, entries.length - capacity);
    },
    back(current) {
      if (entries.length < 2) return null;
      entries.pop();
      const restored = cloneState(entries[entries.length - 1]);
      return current ? preserveAchievements(restored, current) : restored;
    },
    reset() { entries = []; },
    get canRollback() { return entries.length > 1; },
    get length() { return entries.length; }
  };
}

function addClue(state, clue) {
  if (!state.clues.includes(clue)) state.clues.push(clue);
}

function canDeduce(state, deduction) {
  return deduction.requiredClues.every(id => state.clues.includes(id));
}

function canWalk(map, x, y) {
  return map?.tiles[y]?.[x] === '.';
}

// Integer coordinates remain tile centres, so old RPG saves need no migration.
function canStandRpg(map,x,y) {
  if(!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return [-.19,.19].every(dx=>[-.19,.19].every(dy=>canWalk(map,Math.floor(x+dx+.5),Math.floor(y+dy+.5))));
}
function moveRpg(map,position,dx,dy) {
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.1));
  for(let i=0;i<steps;i++) {
    if(canStandRpg(map,position.x+dx/steps,position.y))position.x+=dx/steps;
    if(canStandRpg(map,position.x,position.y+dy/steps))position.y+=dy/steps;
  }
}

// 存档只保存游戏数据；画布、音频、计时器都不存。
function validateSave(value, story, maps) {
  if (!value || value.version !== 1 || !(story.chapters || [story.id]).includes(value.chapter) ||
      !Object.hasOwn(story.nodes, value.node) || !Array.isArray(value.clues) ||
      !value.clues.every(id => typeof id === 'string') ||
      !value.flags || typeof value.flags !== 'object' || Array.isArray(value.flags) ||
      !value.maps || typeof value.maps !== 'object' || Array.isArray(value.maps)) {
    throw new Error('存档不兼容或已损坏。');
  }
  if (value.chapter !== (story.nodes[value.node].chapter || story.id)) throw new Error('存档章节与节点不一致。');
  if (value.flags.rpg !== undefined) {
    if (!value.flags.rpg || typeof value.flags.rpg !== 'object' || Array.isArray(value.flags.rpg)) throw new Error('探索进度无效。');
    for (const [task, progress] of Object.entries(value.flags.rpg)) {
      if (!['G1','G2','G3','G4','G5','CH2_G1','CH2_G2','CH2_G3','CH2_G4','CH2_G5','CH3_G2','CH3_G4'].includes(task) || !progress ||
          !Array.isArray(progress.collected) || !progress.collected.every(x=>typeof x==='string') ||
          !Array.isArray(progress.visited) || !progress.visited.every(x=>Object.hasOwn(maps,x)) ||
          !Number.isFinite(progress.elapsed) || progress.elapsed<0 || typeof progress.done!=='boolean' ||
          (progress.map && !Object.hasOwn(maps,progress.map))) throw new Error('探索进度无效。');
    }
  }
  for (const [id, position] of Object.entries(value.maps)) {
    if (!Object.hasOwn(maps, id) || !position || (/^ch[123]-/.test(id)
        ? !canStandRpg(maps[id],position.x,position.y)
        : (!Number.isInteger(position.x) || !Number.isInteger(position.y) || !canWalk(maps[id], position.x, position.y)))) {
      throw new Error('存档中的地图位置无效。');
    }
  }
  if (!Array.isArray(value.flags.achievements)) value.flags.achievements = [];
  ensureMemoryProgress(value);
  return value;
}

Object.assign(ILY, { createState, createRollbackHistory, preserveAchievements, ensureMemoryProgress, activateMemory, addClue, canDeduce, canWalk, canStandRpg, moveRpg, validateSave });
})();
