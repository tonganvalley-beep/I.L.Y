(() => {
  'use strict';
  const KEY = 'ily-script-review-v2';
  const state = { current: null, records: {} };
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('ily-script-review') : null;
  let editorWindow = null, model = null, story = null, onChange = () => {}, version = 0;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const snapshot = node => {
    if (!node) return '';
    const { id, ...content } = node;
    return JSON.stringify(content);
  };
  function send() {
    if (!state.current || !model) return;
    const nodes = Object.entries(model.base).filter(([, node]) => node.chapter === state.current.chapter && node.scene === state.current.scene && (node.text || node.title));
    const payload = { type: 'ily-script-state', current: state.current, nodes, records: state.records, time: `${Date.now()}-${++version}` };
    // Story nodes may contain callbacks; the editor only needs serializable data.
    const plain = JSON.parse(JSON.stringify(payload));
    try { localStorage.setItem('ily-script-live-state', JSON.stringify(plain)); } catch {}
    try { if (editorWindow && !editorWindow.closed) editorWindow.postMessage(plain, '*'); } catch {}
    try { channel?.postMessage(plain); } catch {}
  }
  function receive(event) {
    if (event.data?.type === 'ily-script-editor-ready') { if (event.source) editorWindow = event.source; send(); return; }
    if (event.data?.type !== 'ily-script-save' || !model) return;
    const mounted = story.nodes[state.nodeId];
    const before = snapshot(mounted);
    const refreshable = ['dialogue', 'monologue', 'heroine-card', 'choice'].includes(mounted?.type);
    state.records = event.data.records || {};
    model.apply(state.records);
    localStorage.setItem(KEY, JSON.stringify(state.records));
    if (refreshable && before !== snapshot(story.nodes[state.nodeId])) onChange(state.nodeId, mounted.next);
    send();
  }
  window.addEventListener?.('message', receive);
  window.addEventListener?.('storage', event => {
    if (event.key === KEY && model) receive({ data: { type: 'ily-script-save', records: read() } });
  });
  if (channel) channel.onmessage = receive;
  ILY.initScriptEditor = (value, refresh = () => {}) => {
    story = value;
    onChange = refresh;
    model = ILYScriptReview.create(story);
    state.records = read();
    model.apply(state.records);
    document.getElementById('script-editor-toggle').onclick = () => {
      editorWindow = window.open('script-editor.html', 'ily-script-editor', 'width=960,height=800');
      send();
    };
  };
  ILY.updateScriptEditor = node => {
    if (!node) return;
    state.nodeId = node.id;
    state.current = { id: node.reviewId || node.id, chapter: node.chapter, chapterTitle: node.chapterTitle, scene: node.scene };
    send();
  };
})();
