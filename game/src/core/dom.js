(() => {
'use strict';
// 文本统一通过 textContent 写入，剧情里不混入 HTML。
function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
function button(text, handler) {
  const node = el('button', '', text);
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
}

Object.assign(ILY, { el, button });
})();
