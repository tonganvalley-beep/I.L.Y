/* Direction bits: north, east, south, west. Shared by browser and tests. */
(function (root) {
  const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  const rotate = (mask, turns = 1) => {
    for (let i = 0; i < ((turns % 4) + 4) % 4; i++) mask = ((mask << 1) & 15) | (mask >> 3);
    return mask;
  };
  const specs = [
    { name: '初次通水', size: 4, path: [0,1,5,6,10,11], filters: [], locked: [], text: '先认识直管与弯管。将左上方的水送往右侧出口。' },
    { name: '净水花园', size: 5, path: [5,6,1,2,3,8,13,12,17,18,19], filters: [3,17], locked: [8], text: '水要经过两座黄色过滤器。留意固定的管道，它是推理的起点。' },
    { name: '珊瑚迷径', size: 5, path: [0,1,6,11,10,15,20,21,22,17,12,13,8,9], filters: [20,12], locked: [11,13], text: '绕过岩石，找到穿过两座过滤器的路线。灰色管道无法旋转。', rocks: [3,4,24] },
    { name: '深海回路', size: 6, path: [6,7,1,2,3,9,15,14,20,26,27,28,22,16,17], filters: [2,26,22], locked: [9,20,16], text: '三座过滤器，一条完整回路。干扰管道更多，先从固定接口反推。', rocks: [0,5,11,24,30,35] }
  ];
  function createLevel(index) {
    const spec = specs[index], n = spec.size;
    const solution = Array.from({length: n*n}, (_, i) => [3,6,5,9,10,12][(i*7+index*3)%6]);
    spec.path.forEach((id, i) => {
      let mask = 0;
      const neighbors = [i ? spec.path[i-1] : -1, i < spec.path.length-1 ? spec.path[i+1] : -2];
      neighbors.forEach(other => {
        if (other === -1) mask |= 8;
        else if (other === -2) mask |= 2;
        else { const dr = Math.floor(other/n)-Math.floor(id/n), dc = other%n-id%n; const d = dirs.findIndex(([r,c]) => r===dr && c===dc); if(d<0) throw new Error('Invalid route'); mask |= 1<<d; }
      });
      solution[id] = mask;
    });
    (spec.rocks || []).forEach(id => solution[id] = 0);
    const initial = solution.map((mask, i) => spec.locked.includes(i) ? mask : rotate(mask, 1+(i*3+index)%3));
    const target = spec.path.reduce((sum,id) => {
      if (initial[id] === solution[id]) return sum;
      return sum + ([1,-1].some(t => rotate(initial[id],t) === solution[id]) ? 1 : 2);
    },0);
    return {...spec, initial, solution, target, start: spec.path[0], end: spec.path.at(-1)};
  }
  function evaluate(level, cells) {
    const visited = [], leaks = [], n = level.size;
    if (!(cells[level.start] & 8)) return {visited, leaks:[level.start], missing:[...level.filters], success:false};
    const queue = [level.start], seen = new Set(queue);
    let reached = false;
    while(queue.length) {
      const id = queue.shift(); visited.push(id);
      dirs.forEach(([dr,dc],d) => {
        if (!(cells[id] & (1<<d))) return;
        if(id===level.start && d===3) return;
        if(id===level.end && d===1) {reached=true;return;}
        const r = Math.floor(id/n)+dr, c = id%n+dc, other = r*n+c;
        if(r<0 || c<0 || r>=n || c>=n || !(cells[other] & (1<<((d+2)%4)))) { leaks.push(id); return; }
        if(!seen.has(other)) {seen.add(other); queue.push(other);}
      });
    }
    const missing = level.filters.filter(id => !seen.has(id));
    return {visited, leaks:[...new Set(leaks)], missing, success:reached && !leaks.length && !missing.length};
  }
  root.AquariumPuzzle = {rotate, createLevel, evaluate, count:specs.length};
})(globalThis);
