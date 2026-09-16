(() => {
  'use strict';
  const KEY = 'ily-script-review-v2';
  const state = { current: null, records: {} };
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('ily-script-review') : null;
  let editorWindow = null, model = null, story = null, media = { images: {}, backgrounds: [], portraits: [] }, onChange = () => {}, version = 0;
  const withPublished = records => ILYScriptReview.mergeRecords(window.ILY_SCRIPT_EDITS, records);
  const read = () => { if (window.ILY_SCRIPT_EDITS_PROJECT_SAVED) return withPublished({}); try { return withPublished(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return withPublished({}); } };
  const snapshot = node => {
    if (!node) return '';
    const { id, ...content } = node;
    return JSON.stringify(content);
  };
  function mediaCatalog() {
    const images = window.ILY?.data?.assets?.images || {};
    const backgrounds = new Set(), portraits = new Set();
    for (const node of Object.values(model?.base || {})) {
      if (node.background) backgrounds.add(node.background);
      if (node.cg) backgrounds.add(node.cg);
      if (node.portrait) portraits.add(node.portrait);
      for (const character of node.characters || []) if (character.image) portraits.add(character.image);
    }
    for (const [id, path] of Object.entries(images)) {
      if (/backgrounds|background\.svg/i.test(path) || /(^|-)bg($|-)/i.test(id)) backgrounds.add(id);
      if (/characters|character\.svg/i.test(path) || /portrait|airi|heroine-(?!phone|photo|cafe)/i.test(id)) portraits.add(id);
    }
    const existing = id => Object.hasOwn(images, id);
    return { images, backgrounds: [...backgrounds].filter(existing).sort(), portraits: [...portraits].filter(existing).sort() };
  }
  function send() {
    if (!state.current || !model) return;
    const nodes = Object.entries(model.base).filter(([, node]) => node.chapter === state.current.chapter && node.scene === state.current.scene && (node.text || node.title));
    const payload = { type: 'ily-script-state', current: state.current, nodes, records: state.records, media, time: `${Date.now()}-${++version}` };
    // Story nodes may contain callbacks; the editor only needs serializable data.
    const plain = JSON.parse(JSON.stringify(payload));
    try { localStorage.setItem('ily-script-live-state', JSON.stringify(plain)); } catch {}
    try { if (editorWindow && !editorWindow.closed) editorWindow.postMessage(plain, '*'); } catch {}
    try { channel?.postMessage(plain); } catch {}
  }
  function receive(event) {
    if (event.data?.type === 'ily-script-editor-ready') { if (event.source) editorWindow = event.source; send(); return; }
    if (event.data?.type !== 'ily-script-save' || !model) return;
    if (event.data.projectSaved) {
      window.ILY_SCRIPT_EDITS = event.data.records;
      window.ILY_SCRIPT_EDITS_PROJECT_SAVED = true;
    }
    const mounted = story.nodes[state.nodeId];
    const before = snapshot(mounted);
    const refreshable = ['dialogue', 'monologue', 'heroine-card', 'choice'].includes(mounted?.type);
    state.records = withPublished(event.data.records);
    model.apply(state.records);
    try { localStorage.setItem(KEY, JSON.stringify(state.records)); } catch {}
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
    media = mediaCatalog();
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
