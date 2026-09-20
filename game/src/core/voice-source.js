(() => {
'use strict';
const spokenTypes = new Set(['dialogue', 'monologue', 'heroine-card']);
function orderedEffectiveNodes(story, base) {
  const result = [];
  const seen = new Set();
  for (const [rootId, original] of Object.entries(base)) {
    let id = rootId;
    const local = new Set();
    while (id && id !== original.next && story.nodes[id] && !local.has(id)) {
      local.add(id);
      if (!seen.has(id)) {
        seen.add(id);
        result.push([id, story.nodes[id], rootId]);
      }
      id = story.nodes[id].next;
    }
  }
  for (const [id, node] of Object.entries(story.nodes)) {
    if (!seen.has(id)) result.push([id, node, id]);
  }
  return result;
}

function inferScene(id, node, fallback) {
  if (node.scene) return node.scene;
  const match = id.match(/^s(\d{2})/i);
  return match ? `S${match[1]}` : fallback;
}

function collectVoiceSources(story, base, stories) {
  const owners = new Map();
  for (const [chapter, data] of Object.entries(stories)) {
    for (const id of Object.keys(data.nodes || {})) owners.set(id, chapter);
  }
  const ordered = orderedEffectiveNodes(story, base);
  const sceneByChapter = new Map();
  const lines = [];
  for (const [sourceNodeId, node, rootId] of ordered) {
    const lineId = node.reviewId || sourceNodeId;
    const chapter = node.chapter || base[rootId]?.chapter || owners.get(rootId) || 'unknown';
    const scene = inferScene(rootId, node, sceneByChapter.get(chapter) || '');
    if (scene) sceneByChapter.set(chapter, scene);
    const displayText = String(node.text || node.title || '').trim();
    if (!spokenTypes.has(node.type) || !displayText) continue;
    const speaker = node.speaker || (node.type === 'monologue' ? '旁白' : '');
    lines.push({
      lineId,
      sourceNodeId,
      runtimeNodeId: sourceNodeId,
      reviewId: node.reviewId || null,
      identityKind: sourceNodeId.endsWith('__review_body') ? 'review-body' : (node.reviewId ? 'review-line' : 'base-line'),
      order: lines.length + 1,
      chapter,
      chapterTitle: stories[chapter]?.title || '',
      scene,
      route: node.route || '',
      kind: node.type,
      speaker,
      displayText,
      sourceValues: [chapter, scene, node.route || '', node.type, speaker, displayText]
    });
  }
  return lines;
}
Object.assign(ILY, { collectVoiceSources, orderedVoiceNodes: orderedEffectiveNodes });
})();
