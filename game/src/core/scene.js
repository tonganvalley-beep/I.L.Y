(() => {
'use strict';
const { el } = ILY;
// All paths resolve relative to game/index.html. Missing artwork uses a typed placeholder.
function sceneImage(assets, id, className, kind, alt = '') {
  const img = el('img', className);
  img.alt = alt;
  img.draggable = false;
  const fallback = assets.manifest.fallbacks[kind];
  img.onerror = () => {
    if (img.src.endsWith(fallback)) { img.hidden = true; return; }
    img.src = fallback;
  };
  img.src = assets.image(id) || fallback;
  return img;
}
function mountScene(stage, node, assets) {
  const scene = el('div', 'scene');
  scene.setAttribute('aria-hidden', 'true');
  const background = sceneImage(assets, node.cg || node.background, 'scene-background', 'background');
  background.style.objectFit = node.backgroundFit === 'contain' ? 'contain' : 'cover';
  background.style.objectPosition = node.backgroundPosition || 'center';
  scene.append(background);
  if (!node.cg) {
    const characters = node.characters || (node.portrait ? [{ image: node.portrait, position: 'center' }] : []);
    for (const character of characters) {
      const img = sceneImage(assets, character.image, 'portrait', 'character');
      img.dataset.position = ['left', 'center', 'right'].includes(character.position) ? character.position : 'center';
      img.style.setProperty('--character-scale', Math.min(1.4, Math.max(.5, Number(character.scale) || 1)));
      if (character.speaking === false) img.classList.add('inactive');
      scene.append(img);
    }
    if (node.overlay) scene.append(sceneImage(assets, node.overlay, 'scene-prop', 'prop'));
  }
  stage.append(scene);
}
Object.assign(ILY, { sceneImage, mountScene });
})();
