(() => {
  'use strict';
  const textTypes = ['dialogue', 'monologue', 'heroine-card', 'cue'];
  const kind = node => node.type === 'dialogue' ? (node.speaker === '旁白' ? '旁白' : '台词') : node.type === 'cue' ? '演出' : textTypes.includes(node.type) ? '旁白' : '玩法/结构';
  const canDelete = node => textTypes.includes(node.type) && typeof node.next === 'string' && !!node.next;
  // Keep additions anchored even when their parent paragraph is deleted.
  function ordered(nodes, records) {
    const result = [], seen = new Set(), children = new Map();
    for (const [id, record] of Object.entries(records)) {
      if (!record.added || !record.node) continue;
      if (!children.has(record.anchor)) children.set(record.anchor, []);
      children.get(record.anchor).push([id, record.node, record.position]);
    }
    function visit(id, node) {
      if (seen.has(id)) return;
      seen.add(id);
      const nested = children.get(id) || [];
      for (const [child, value, position] of nested) if (position === 'before') visit(child, value);
      result.push([id, node]);
      for (const [child, value, position] of nested) if (position !== 'before') visit(child, value);
    }
    for (const [id, node] of nodes) visit(id, node);
    return result;
  }
  function addition(node) {
    const result = { type: textTypes.includes(node.type) ? node.type : 'monologue', speaker: node.speaker || '', text: '', next: node.next };
    if (result.type === 'cue') result.type = 'monologue';
    for (const key of ['chapter', 'chapterTitle', 'scene', 'background', 'backgroundFit', 'textPosition', 'imageOnly', 'phoneNotice', 'portrait', 'bgm', 'route', 'when', 'sectionLabel', 'visualEffects']) {
      if (Object.hasOwn(node, key)) result[key] = node[key];
    }
    if (Array.isArray(node.characters)) result.characters = node.characters.map(character => ({ ...character }));
    return result;
  }
  function create(story) {
    const base = Object.fromEntries(Object.entries(story.nodes).map(([id, node]) => [id, { ...node }]));
    const generated = new Set();
    function apply(records) {
      // Preserve mounted references so their Next handlers use the new links.
      const previous = new Map([...generated].map(id => [id, story.nodes[id]]));
      for (const id of generated) delete story.nodes[id];
      generated.clear();
      for (const [id, original] of Object.entries(base)) {
        const target = story.nodes[id] || (story.nodes[id] = {});
        for (const key of Object.keys(target)) delete target[key];
        Object.assign(target, original);
      }
      for (const [rootId, original] of Object.entries(base)) {
        const sequence = ordered([[rootId, original]], records);
        const rootIndex = sequence.findIndex(([id]) => id === rootId);
        const bodyId = rootIndex > 0 ? `${rootId}__review_body` : rootId;
        const ids = sequence.map(([id]) => id === rootId ? bodyId : id);
        sequence.forEach(([id, source], index) => {
          const record = records[id] || {}, targetId = ids[index];
          const node = targetId === rootId ? story.nodes[rootId] : (previous.get(targetId) || {});
          Object.assign(node, source, { reviewId: id });
          if (record.text != null) {
            if (Object.hasOwn(source, 'text') || !Object.hasOwn(source, 'title')) node.text = record.text;
            else node.title = record.text;
          }
          if (record.speaker != null) node.speaker = record.speaker;
          // Explicit visual edits replace CG/character staging with editor selections.
          // 修订层也允许把节点升级成整屏 CG（scene.js 走 node.cg || node.background 铺图、不挂立绘，
          // memories.js 会把 node.cg 自动收进画廊）。与 background 互斥：写了 cg 就以 cg 为准。
          if (record.cg != null) node.cg = record.cg;
          if (record.background != null) {
            node.background = record.background;
            delete node.cg;
          }
          // 换图时可一并指定 object-fit（"contain" 用于竖构图，避免被裁）；不指定则沿用原节点设置。
          if (record.backgroundFit != null) node.backgroundFit = record.backgroundFit;
          // 文字排布：把这段文字排进画面自带的黑带（如 bg-room-white 顶部约 20% 高的纯黑横带）。
          // 与 background 是同一组视觉设定，所以和 backgroundFit 一起放在修订层里。
          if (record.textPosition != null) node.textPosition = record.textPosition;
          // 整图演出：不挂 .heroine-moment 面板（暗幕 + 扫描线 + 文字层），只铺图片原图。
          if (record.imageOnly != null) node.imageOnly = record.imageOnly === true;
          // 手机通知窗演出（modes/heroine.js:203）：把这一段的文字放进翻盖手机机模的屏幕里，
          // 用「红格电池」图标覆盖状态栏（styles/chapters.css 的 .phone-notice）。取值 "battery-low"。
          // 与 imageOnly 互斥：imageOnly 为 true 时不挂任何面板，phoneNotice 自然失效。
          if (record.phoneNotice != null) node.phoneNotice = record.phoneNotice;
          // 视觉特效（glitch / blue / desaturated / dark / flash / soft / dissolve）也可在修订层覆盖：
          // 设为 [] 即可清掉 base 的特效（如 her_0138 的 glitch），让 imageOnly 节点只显示干净的原图。
          if (record.visualEffects != null) node.visualEffects = record.visualEffects;
          if (Array.isArray(record.characters)) {
            node.characters = record.characters.map(character => ({ ...character }));
            delete node.portrait;
          } else if (record.portrait != null) {
            node.portrait = record.portrait;
            delete node.characters;
          }
          // Classification controls playback for existing paragraphs as well as additions.
          // Structural nodes (choices, phones, gameplay) keep their interaction type.
          if (textTypes.includes(source.type)) {
            if (record.kind === '台词') node.type = 'dialogue';
            else if (record.kind === '旁白') node.type = source.type === 'heroine-card' ? 'heroine-card' : 'monologue';
            else if (record.kind === '内心' || record.kind === '演出') node.type = 'cue';
            else if (source.type === 'dialogue' && node.speaker === '旁白') node.type = 'monologue';
          }
          node.next = index < sequence.length - 1 ? ids[index + 1] : original.next;
          if (record.deleted && (record.added || canDelete(source))) Object.assign(node, { type: 'cue', text: '', speaker: '' });
          story.nodes[targetId] = node;
          if (targetId !== rootId) generated.add(targetId);
        });
        if (bodyId !== rootId) {
          const proxy = story.nodes[rootId];
          for (const key of Object.keys(proxy)) delete proxy[key];
          Object.assign(proxy, { type: 'cue', next: ids[0], reviewId: rootId, chapter: original.chapter });
        }
      }
      for (const [id, node] of previous) {
        if (story.nodes[id]) continue;
        const seen = new Set();
        while (node.next && !story.nodes[node.next] && previous.has(node.next) && !seen.has(node.next)) {
          seen.add(node.next);
          node.next = previous.get(node.next).next;
        }
      }
    }
    return { base, apply };
  }
  function mergeRecords(published = {}, local = {}) {
    const result = { ...published };
    for (const [id, record] of Object.entries(local || {})) result[id] = { ...result[id], ...record };
    return result;
  }
  function serializeRecords(records) {
    return '// Published script-editor changes. Import future exports with tools/import-script-review.mjs.\nwindow.ILY_SCRIPT_EDITS = ' + JSON.stringify(records, null, 2) + ';\n';
  }
  window.ILYScriptReview = { kind, canDelete, ordered, addition, create, mergeRecords, serializeRecords };
})();
