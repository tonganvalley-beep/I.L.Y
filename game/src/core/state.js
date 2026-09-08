(() => {
'use strict';
function createState(node = 'arrival') {
  return { version: 1, chapter: 'prologue', node, clues: [], flags: { achievements: [] }, maps: {} };
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
      if (!['G1','G2','G3','G4','G5'].includes(task) || !progress ||
          !Array.isArray(progress.collected) || !progress.collected.every(x=>typeof x==='string') ||
          !Array.isArray(progress.visited) || !progress.visited.every(x=>Object.hasOwn(maps,x)) ||
          !Number.isFinite(progress.elapsed) || progress.elapsed<0 || typeof progress.done!=='boolean' ||
          (progress.map && !Object.hasOwn(maps,progress.map))) throw new Error('探索进度无效。');
    }
  }
  for (const [id, position] of Object.entries(value.maps)) {
    if (!Object.hasOwn(maps, id) || !position || (id.startsWith('ch1-')
        ? !canStandRpg(maps[id],position.x,position.y)
        : (!Number.isInteger(position.x) || !Number.isInteger(position.y) || !canWalk(maps[id], position.x, position.y)))) {
      throw new Error('存档中的地图位置无效。');
    }
  }
  if (!Array.isArray(value.flags.achievements)) value.flags.achievements = [];
  return value;
}

Object.assign(ILY, { createState, addClue, canDeduce, canWalk, canStandRpg, moveRpg, validateSave });
})();
