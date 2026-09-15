(() => {
'use strict';
const { el, button } = ILY;
const { addClue, canWalk, canDeduce } = ILY;

function mountExploration({stage, map, state, refreshClues, notify, go, node}) {
  const panel = el('section', 'mode-panel');
  const hintText = el('p', 'hint', ILY.t('expl.hint'));
  panel.append(el('h1', '', map.name), hintText);
  const canvas = el('canvas');
  canvas.tabIndex = 0;
  canvas.width = map.tiles[0].length * map.tileSize; canvas.height = map.tiles.length * map.tileSize;
  canvas.setAttribute('aria-label', ILY.t('expl.aria'));
  const ctx = canvas.getContext('2d');
  const position = state.maps[map.id] ||= {...map.spawn};
  const nearby = el('div', 'map-actions');
  const directions = el('div', 'dpad');
  const deduction = el('form', 'deduction');
  deduction.append(el('p', '', map.deduction.question));
  for (const choice of map.deduction.choices) {
    const label = el('label'); const radio = el('input');
    radio.type = 'radio'; radio.name = 'answer'; radio.value = choice.id; radio.required = true;
    label.append(radio, document.createTextNode(` ${choice.text}`)); deduction.append(label);
  }
  const submit = el('button', '', ILY.t('expl.submit')); submit.type = 'submit'; deduction.append(submit);
  deduction.addEventListener('submit', event => {
    event.preventDefault();
    if (!canDeduce(state, map.deduction)) { notify(ILY.t('expl.needAll')); return; }
    if (new FormData(deduction).get('answer') !== map.deduction.answer) { notify(ILY.t('expl.wrong')); return; }
    state.flags[map.deduction.flag] = true; go(node.next);
  });
  const close = spot => Math.abs(position.x - spot.x) + Math.abs(position.y - spot.y) <= 1;
  function investigate(spot) {
    if (!close(spot)) return;
    addClue(state, spot.clue); notify(spot.description); refreshClues(); draw(); canvas.focus();
  }
  function draw() {
    const size = map.tileSize;
    map.tiles.forEach((row, y) => [...row].forEach((tile, x) => {
      ctx.fillStyle = tile === '#' ? '#253449' : '#496171'; ctx.fillRect(x * size, y * size, size - 1, size - 1);
    }));
    for (const spot of map.hotspots) {
      ctx.fillStyle = state.clues.includes(spot.clue) ? '#81a293' : '#efcd82';
      ctx.fillRect(spot.x * size + 13, spot.y * size + 13, size - 26, size - 26);
    }
    ctx.fillStyle = '#a5e5f5'; ctx.beginPath(); ctx.arc((position.x + .5) * size, (position.y + .5) * size, 10, 0, Math.PI * 2); ctx.fill();
    nearby.replaceChildren();
    for (const spot of map.hotspots.filter(close)) nearby.append(button(ILY.t('expl.investigate', { label: spot.label }), () => investigate(spot)));
    if (!nearby.childNodes.length) nearby.append(el('span', 'hint', ILY.t('expl.searchHint')));
    submit.disabled = !canDeduce(state, map.deduction);
  }
  function move(dx, dy) {
    canvas.focus();
    if (canWalk(map, position.x + dx, position.y + dy)) { position.x += dx; position.y += dy; draw(); }
  }
  const moves = {ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  const keydown = event => {
    if (event.target.closest('input, button, a')) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (moves[key]) { event.preventDefault(); move(...moves[key]); }
    if (key === 'e') { const spot = map.hotspots.find(close); if (spot) investigate(spot); }
  };
  for (const [label, dx, dy] of [['↑',0,-1],['←',-1,0],['↓',0,1],['→',1,0]]) directions.append(button(label, () => move(dx,dy)));
  panel.append(canvas, directions, nearby, deduction); stage.append(panel); draw(); canvas.focus();
  window.addEventListener('keydown', keydown);
  /* 切换语言后更新界面文字（nearby 按钮在 draw() 里重建，自动跟随） */
  const onLang = () => {
    hintText.textContent = ILY.t('expl.hint');
    canvas.setAttribute('aria-label', ILY.t('expl.aria'));
    submit.textContent = ILY.t('expl.submit');
    draw();
  };
  window.addEventListener('ily:langchange', onLang);
  return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('ily:langchange', onLang); };
}

Object.assign(ILY, { mountExploration });
})();
