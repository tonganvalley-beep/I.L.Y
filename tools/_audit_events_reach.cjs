'use strict';
// Read-only audit: for every map, check each event's tile is walkable ('.')
// and reachable from spawn via a 4-dir BFS over walkable tiles.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'game', 'data', 'maps');
const files = ['chapter1.json', 'chapters.json'];
let problems = 0, total = 0;
for (const f of files) {
  const maps = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const id of Object.keys(maps)) {
    const m = maps[id];
    const w = m.width, h = m.height;
    const walk = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m.tiles[y][x] === '.';
    // BFS from spawn
    const sx = m.spawn.x, sy = m.spawn.y;
    const seen = new Set();
    const q = [[sx, sy]];
    if (walk(sx, sy)) seen.add(sx + ',' + sy);
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (walk(nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); }
      }
    }
    for (const e of m.events || []) {
      total++;
      const onTile = m.tiles[e.y] && m.tiles[e.y][e.x];
      const walkable = onTile === '.';
      const reachable = seen.has(e.x + ',' + e.y);
      const touch = !!e.touch;
      let issue = null;
      if (!walkable) issue = `事件落在非行走格('${onTile}')`;
      else if (!reachable) issue = '从出生点不可达(被墙/水包围)';
      else if (touch && !seen.has(e.x + ',' + e.y)) issue = 'touch 事件但不可达';
      if (issue) {
        problems++;
        console.log(`[问题] ${id} 事件 "${e.id}"@(${e.x},${e.y}) ${issue}`);
      }
    }
  }
}
console.log(`\n地图事件总数: ${total}，问题事件: ${problems}`);
console.log(problems === 0 ? 'OK: 全部交互点均位于可行走格且从出生点可达' : '存在上述问题，需处理');
