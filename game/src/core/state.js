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
  return map.tiles[y]?.[x] === '.';
}

// 存档只保存游戏数据；画布、音频、计时器都不存。
function validateSave(value, story, maps) {
  if (!value || value.version !== 1 || value.chapter !== story.id ||
      !Object.hasOwn(story.nodes, value.node) || !Array.isArray(value.clues) ||
      !value.clues.every(id => typeof id === 'string') ||
      !value.flags || typeof value.flags !== 'object' || Array.isArray(value.flags) ||
      !value.maps || typeof value.maps !== 'object' || Array.isArray(value.maps)) {
    throw new Error('存档不兼容或已损坏。');
  }
  for (const [id, position] of Object.entries(value.maps)) {
    if (!Object.hasOwn(maps, id) || !position || !Number.isInteger(position.x) ||
        !Number.isInteger(position.y) || !canWalk(maps[id], position.x, position.y)) {
      throw new Error('存档中的地图位置无效。');
    }
  }
  if (!Array.isArray(value.flags.achievements)) value.flags.achievements = [];
  return value;
}

Object.assign(ILY, { createState, addClue, canDeduce, canWalk, validateSave });
})();
