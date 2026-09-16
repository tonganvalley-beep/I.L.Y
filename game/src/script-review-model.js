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
    for (const key of ['chapter', 'chapterTitle', 'scene', 'background', 'portrait', 'bgm', 'route', 'when', 'sectionLabel']) {
      if (Object.hasOwn(node, key)) result[key] = node[key];
    }
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
          // Explicit visual edits replace CG/multi-character staging so the selected
          // background and portrait are the assets the scene renderer actually uses.
          if (record.background != null) {
            node.background = record.background;
            delete node.cg;
          }
          if (record.portrait != null) {
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
