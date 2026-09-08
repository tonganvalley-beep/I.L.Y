(() => {
'use strict';

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const prompt = document.querySelector('#prompt');
const positionLabel = document.querySelector('#position');
const dialogue = document.querySelector('#dialogue');
const dialogueTitle = document.querySelector('#dialogue-title');
const dialogueText = document.querySelector('#dialogue-text');
const modeBadge = document.querySelector('#mode-badge');
const debugButton = document.querySelector('#toggle-debug');
const keys = new Set();
const images = new Map();

const photoScene = {
  name: '公寓走廊 · 背景贴图',
  background: '../assets/images/backgrounds/5.走廊·开灯.png',
  player: {
    spawn: {x: 208, y: 578}, speed: 235, width: 48, height: 48,
    images: {
      front: '../../sign&log/photo&video/cursor-hero-front.png',
      back: '../../sign&log/photo&video/cursor-hero-back.png',
      left: ['../../sign&log/photo&video/cursor-walk-left-1.png', '../../sign&log/photo&video/cursor-walk-left-2.png'],
      right: ['../../sign&log/photo&video/cursor-walk-right-1.png', '../../sign&log/photo&video/cursor-walk-right-2.png']
    }
  },
  // 坐标都对应 1280 × 720 的设计画布。红色矩形就是“空气墙”。
  blockers: [
    {name: '上方墙面', x: 0, y: 0, width: 1280, height: 432},
    {name: '左侧边界', x: 0, y: 0, width: 88, height: 720},
    {name: '右侧边界', x: 1190, y: 0, width: 90, height: 720},
    {name: '下方边界', x: 0, y: 688, width: 1280, height: 32},
    {name: '近景杂物', x: 500, y: 526, width: 155, height: 75},
    {name: '门框凸出', x: 1000, y: 430, width: 118, height: 85}
  ],
  hotspots: [
    {id: 'lamp', name: '声控灯', x: 358, y: 474, radius: 78, text: '灯管发出细小的电流声。它似乎刚被什么声音唤醒。'},
    {id: 'parcel', name: '错送的快递', x: 702, y: 555, radius: 82, text: '收件人写着“203室·马场先生”。这里明明没有203室。'},
    {id: 'door', name: '走廊尽头', x: 1115, y: 545, radius: 88, text: '门缝里没有光，只有一阵很轻的海浪声。'}
  ]
};

const schemes = {
  photo: {
    number: '01', title: '背景贴图 + 空气墙', summary: '一张完整场景图负责视觉，透明矩形负责碰撞，坐标点负责调查。', badge: '背景贴图模式',
    facts: [['画面', '1 张完整背景图'], ['碰撞', '6 个透明矩形'], ['交互', '3 个坐标热点'], ['适合', '固定镜头、氛围场景']]
  },
  json: {
    number: '02', title: 'JSON + 图块地图', summary: 'JSON 描述图层、图块、物件、碰撞和出生点，引擎按数据把地图拼出来。', badge: 'JSON 图块模式',
    facts: [['画面', '底图 + SVG 图块集'], ['碰撞', '墙图块 + solid 物件'], ['交互', 'JSON objects 数组'], ['适合', '多地图、关卡编辑器']]
  }
};

let mapData = null;
let mode = 'photo';
let debug = false;
let lastTime = performance.now();
let moving = false;
let facing = 'front';
let player = {x: 0, y: 0};
let collected = new Set();

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (images.has(src)) return images.get(src);
  const promise = new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
  images.set(src, promise);
  return promise;
}

function allPlayerImages(config) {
  return Object.values(config.images).flat();
}

async function preload(config) {
  const paths = allPlayerImages(config.player);
  if (config.background) paths.push(config.background);
  if (config.tileset) paths.push(config.tileset.image);
  for (const layer of config.imageLayers || []) paths.push(layer.image);
  for (const object of config.objects || []) if (object.image) paths.push(object.image);
  await Promise.all(paths.map(loadImage));
}

async function loadJsonMap() {
  try {
    const response = await fetch('map-demo.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    validateMap(data);
    return data;
  } catch (error) {
    const message = location.protocol === 'file:'
      ? 'JSON 地图需要本地服务器：请在仓库根目录运行 npm start，再访问 /game/rpg-demo/。'
      : `地图读取失败：${error.message}`;
    throw new Error(message);
  }
}

function validateMap(data) {
  if (!data || !Number.isInteger(data.width) || !Number.isInteger(data.height) || !data.player?.spawn) throw new Error('地图缺少尺寸或人物出生点');
  for (const layer of data.tileLayers || []) {
    if (!layer.data) continue;
    if (layer.data.length !== data.height || layer.data.some(row => row.length !== data.width)) throw new Error(`图层“${layer.name}”尺寸不是 ${data.width} × ${data.height}`);
  }
}

function configurePlayer() {
  const config = currentConfig();
  if (mode === 'json') {
    const size = mapData.tileSize;
    player.x = (config.player.spawn.x + .5) * size;
    player.y = (config.player.spawn.y + .5) * size;
  } else {
    player.x = config.player.spawn.x;
    player.y = config.player.spawn.y;
  }
  facing = 'front';
  collected = new Set();
  closeDialogue();
  canvas.focus();
}

function currentConfig() { return mode === 'photo' ? photoScene : mapData; }

function playerFoot(x = player.x, y = player.y) {
  return {x: x - 13, y: y + 10, width: 26, height: 16};
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function photoBlocked(x, y) {
  const foot = playerFoot(x, y);
  return photoScene.blockers.some(rect => overlaps(foot, rect));
}

function tileBlocked(x, y) {
  const size = mapData.tileSize;
  const foot = playerFoot(x, y);
  const corners = [
    [foot.x, foot.y], [foot.x + foot.width, foot.y],
    [foot.x, foot.y + foot.height], [foot.x + foot.width, foot.y + foot.height]
  ];
  for (const [px, py] of corners) {
    const tx = Math.floor(px / size), ty = Math.floor(py / size);
    if (tx < 0 || ty < 0 || tx >= mapData.width || ty >= mapData.height) return true;
    for (const layer of mapData.tileLayers || []) {
      const mark = layer.data?.[ty]?.[tx] || layer.fill;
      if (mark && mapData.legend[mark]?.solid) return true;
    }
  }
  return (mapData.objects || []).some(object => object.solid && overlaps(foot, {
    x: object.x * size, y: object.y * size, width: object.width * size, height: object.height * size
  }));
}

function movePlayer(dx, dy, dt) {
  if (!dx && !dy) { moving = false; return; }
  const length = Math.hypot(dx, dy) || 1;
  dx /= length; dy /= length;
  const speed = currentConfig().player.speed;
  const blocked = mode === 'photo' ? photoBlocked : tileBlocked;
  const nextX = player.x + dx * speed * dt;
  const nextY = player.y + dy * speed * dt;
  if (!blocked(nextX, player.y)) player.x = nextX;
  if (!blocked(player.x, nextY)) player.y = nextY;
  moving = true;
  if (Math.abs(dx) > Math.abs(dy)) facing = dx < 0 ? 'left' : 'right';
  else facing = dy < 0 ? 'back' : 'front';
}

function currentInteractions() {
  if (mode === 'photo') return photoScene.hotspots.map(spot => ({...spot, distance: Math.hypot(player.x - spot.x, player.y - spot.y)}));
  const size = mapData.tileSize;
  return mapData.objects.filter(object => object.interaction).map(object => {
    const x = (object.x + object.width / 2) * size;
    const y = (object.y + object.height / 2) * size;
    return {...object, text: object.interaction, distance: Math.hypot(player.x - x, player.y - y), radius: Math.max(74, size * 1.5)};
  });
}

function nearestInteraction() {
  return currentInteractions().filter(item => item.distance <= item.radius).sort((a, b) => a.distance - b.distance)[0] || null;
}

function interact() {
  if (!dialogue.hidden) { closeDialogue(); return; }
  const item = nearestInteraction();
  if (!item) return;
  collected.add(item.id);
  dialogueTitle.textContent = item.name;
  dialogueText.textContent = item.text;
  dialogue.hidden = false;
  prompt.textContent = '';
}

function closeDialogue() {
  dialogue.hidden = true;
  canvas.focus({preventScroll: true});
}

function drawCover(image, alpha = 1) {
  if (!image) return;
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const width = image.width * scale, height = image.height * scale;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  ctx.restore();
}

async function drawPhoto() {
  ctx.fillStyle = '#12231e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCover(await loadImage(photoScene.background));
  ctx.fillStyle = 'rgba(1,8,7,.17)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const spot of photoScene.hotspots) drawHotspot(spot.x, spot.y, collected.has(spot.id));
  if (debug) {
    ctx.save(); ctx.fillStyle = '#e75b5b46'; ctx.strokeStyle = '#ff7e73'; ctx.lineWidth = 2;
    for (const rect of photoScene.blockers) {ctx.fillRect(rect.x, rect.y, rect.width, rect.height);ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);}
    ctx.restore();
  }
}

async function drawJson() {
  ctx.fillStyle = '#101c19'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const layer of mapData.imageLayers || []) drawCover(await loadImage(layer.image), layer.opacity ?? 1);
  const tileset = await loadImage(mapData.tileset.image);
  const size = mapData.tileSize;
  for (const layer of mapData.tileLayers || []) {
    ctx.save(); ctx.globalAlpha = layer.opacity ?? 1;
    for (let y = 0; y < mapData.height; y++) for (let x = 0; x < mapData.width; x++) {
      const mark = layer.data?.[y]?.[x] || layer.fill;
      const tile = mapData.legend[mark]?.tile;
      if (tile === undefined || !tileset) continue;
      drawTile(tileset, tile, x * size, y * size, size, size);
    }
    ctx.restore();
  }
  for (const object of mapData.objects || []) {
    const x = object.x * size, y = object.y * size, width = object.width * size, height = object.height * size;
    if (object.image) {
      const image = await loadImage(object.image);
      if (image) ctx.drawImage(image, x + (width - size) / 2, y + (height - size) / 2, size, size);
    } else if (tileset) {
      for (let oy = 0; oy < object.height; oy++) for (let ox = 0; ox < object.width; ox++) drawTile(tileset, object.tile, x + ox * size, y + oy * size, size, size);
    }
    if (object.interaction) drawHotspot(x + width / 2, y + height / 2, collected.has(object.id));
    if (debug && object.solid) {ctx.fillStyle = '#e75b5b42';ctx.strokeStyle = '#ff7e73';ctx.fillRect(x,y,width,height);ctx.strokeRect(x,y,width,height);}
  }
  if (debug) {
    ctx.save(); ctx.strokeStyle = '#b7e3d329'; ctx.lineWidth = 1;
    for (let x = 0; x <= mapData.width; x++) {ctx.beginPath();ctx.moveTo(x*size,0);ctx.lineTo(x*size,canvas.height);ctx.stroke();}
    for (let y = 0; y <= mapData.height; y++) {ctx.beginPath();ctx.moveTo(0,y*size);ctx.lineTo(canvas.width,y*size);ctx.stroke();}
    ctx.restore();
  }
}

function drawTile(image, tile, x, y, width, height) {
  const sourceWidth = mapData.tileset.tileWidth;
  const sourceHeight = mapData.tileset.tileHeight;
  const sx = (tile % mapData.tileset.columns) * sourceWidth;
  const sy = Math.floor(tile / mapData.tileset.columns) * sourceHeight;
  ctx.drawImage(image, sx, sy, sourceWidth, sourceHeight, x, y, width, height);
}

function drawHotspot(x, y, done) {
  const pulse = 1 + Math.sin(performance.now() / 280) * .14;
  ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
  ctx.globalAlpha = done ? .5 : .92;
  ctx.fillStyle = done ? '#6fa58f' : '#efd179'; ctx.strokeStyle = '#fff1b7'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#132019'; ctx.font = '12px Zpix, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(done ? '✓' : '!', 0, 1);
  ctx.restore();
}

async function drawPlayer(now) {
  const config = currentConfig().player;
  const choices = config.images[facing];
  const frames = Array.isArray(choices) ? choices : [choices];
  const frame = moving ? Math.floor(now / 180) % frames.length : 0;
  const image = await loadImage(frames[frame]);
  const width = config.width, height = config.height;
  ctx.save();
  ctx.fillStyle = '#0005'; ctx.beginPath();ctx.ellipse(player.x, player.y + 23, 20, 8, 0, 0, Math.PI * 2);ctx.fill();
  if (image) ctx.drawImage(image, player.x - width / 2, player.y - height / 2, width, height);
  else {ctx.fillStyle='#b8e9d5';ctx.fillRect(player.x-12,player.y-25,24,45);}
  if (debug) {const foot=playerFoot();ctx.strokeStyle='#68e3bb';ctx.strokeRect(foot.x,foot.y,foot.width,foot.height);}
  ctx.restore();
}

async function frame(now) {
  const dt = Math.min(.04, (now - lastTime) / 1000); lastTime = now;
  let dx = 0, dy = 0;
  if (dialogue.hidden) {
    if (keys.has('arrowleft') || keys.has('a')) dx--;
    if (keys.has('arrowright') || keys.has('d')) dx++;
    if (keys.has('arrowup') || keys.has('w')) dy--;
    if (keys.has('arrowdown') || keys.has('s')) dy++;
  }
  movePlayer(dx, dy, dt);
  ctx.imageSmoothingEnabled = false;
  if (mode === 'photo') await drawPhoto(); else if (mapData) await drawJson();
  await drawPlayer(now);
  positionLabel.textContent = `X ${Math.round(player.x)} · Y ${Math.round(player.y)}`;
  const nearby = nearestInteraction();
  if (dialogue.hidden) prompt.textContent = nearby ? `〔${nearby.name}〕按 E / 空格调查` : '';
  requestAnimationFrame(frame);
}

function renderScheme() {
  const info = schemes[mode];
  document.querySelector('#scheme-number').textContent = info.number;
  document.querySelector('#scheme-title').textContent = info.title;
  document.querySelector('#scheme-summary').textContent = info.summary;
  modeBadge.textContent = info.badge;
  const list = document.querySelector('#scheme-facts'); list.replaceChildren();
  for (const [term, value] of info.facts) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = term; dd.textContent = value; list.append(dt, dd);
  }
  document.querySelectorAll('[data-mode]').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
}

async function switchMode(next) {
  if (next === 'json' && !mapData) {
    prompt.textContent = '正在读取 map-demo.json…';
    try {mapData = await loadJsonMap(); await preload(mapData);}
    catch (error) {prompt.textContent = error.message; return;}
  }
  mode = next; renderScheme(); configurePlayer();
}

document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
document.querySelector('#dialogue-close').addEventListener('click', closeDialogue);
document.querySelector('#interact').addEventListener('click', interact);
document.querySelector('#reset').addEventListener('click', configurePlayer);
debugButton.addEventListener('click', () => {
  debug = !debug; debugButton.setAttribute('aria-pressed', debug); debugButton.textContent = debug ? '隐藏碰撞区' : '显示碰撞区';
});

window.addEventListener('keydown', event => {
  if (event.target.closest('button, a')) return;
  const key = event.key.toLowerCase();
  if (['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(key)) {keys.add(key);event.preventDefault();}
  if ((key === 'e' || key === ' ' || key === 'enter') && !event.repeat) {interact();event.preventDefault();}
  if (key === 'escape' && !dialogue.hidden) closeDialogue();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

for (const button of document.querySelectorAll('[data-move]')) {
  const direction = {up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'}[button.dataset.move];
  const start = event => {event.preventDefault();keys.add(direction);canvas.focus();};
  const stop = event => {event.preventDefault();keys.delete(direction);};
  button.addEventListener('pointerdown', start);button.addEventListener('pointerup', stop);button.addEventListener('pointercancel', stop);button.addEventListener('pointerleave', stop);
}

preload(photoScene).then(() => {
  renderScheme(); configurePlayer(); requestAnimationFrame(frame);
});
})();
