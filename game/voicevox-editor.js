import { parseImport, validateImport } from '/tools/voicevox/import-parser.mjs';
import { checkpoint, restore, snapshot, editMora } from '/tools/voicevox/tuning.mjs';
import { syncVoiceLines } from '/tools/voicevox/story-sync.mjs';
import { resolveStyle } from '/tools/voicevox/style-selection.mjs';
import { filterLines, lineStatus, pageLines } from '/tools/voicevox/worktable.mjs';

const $ = id => document.getElementById(id);
const defaults = { speedScale: 1, pitchScale: 0, intonationScale: 1, volumeScale: 1 };
const state = {
  lines: [], sourceRevision: null, projectRevision: null, selected: null, styles: [], engineIdentity: null,
  filters: { search: '', chapter: '', status: '', speaker: '' }, dirty: false, checked: [], queueState: null,
  rolePresets: {}, undo: null, page: 0, pageSize: 200
};
const statusText = { untranslated: '待翻译', draft: '翻译草稿', proofread: '已校对', ready: '已准备', stale: '需复核' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const toast = message => { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('show'), 3200); };

async function api(path, options) {
  const response = await fetch(path, options);
  const data = response.headers.get('content-type')?.includes('audio') ? await response.blob() : await response.json();
  if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
  return data;
}
const post = (path, value) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });

function tuningOf(line) {
  const source = line.audioQuery || line.tuning || {};
  return Object.fromEntries(Object.keys(defaults).map(key => [key, Number.isFinite(Number(source[key])) ? Number(source[key]) : defaults[key]]));
}
function filtered() {
  return filterLines(state.lines, state.filters);
}
function roleOf(line) { return line.voiceRole || line.speaker || '未分配角色'; }
function styleName(line) { return resolveStyle(state.styles, line).label; }

function renderFilters() {
  const chapters = [...new Set(state.lines.map(line => line.chapter).filter(Boolean))];
  $('chapterFilter').innerHTML = '<option value="">全部章节</option>' + chapters.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
  $('chapterFilter').value = state.filters.chapter;
  const voicedLines = state.lines.filter(line => line.voiceEnabled !== false);
  const speakers = [...new Set(voicedLines.map(roleOf).filter(Boolean))];
  $('speakerFilters').innerHTML = `<div class="speaker-item ${!state.filters.speaker ? 'active' : ''}" data-speaker=""><span>全</span>全部角色</div>` +
    speakers.map(value => `<div class="speaker-item ${state.filters.speaker === value ? 'active' : ''}" data-speaker="${esc(value)}"><span>${esc(value.slice(0, 1))}</span>${esc(value)} <em>${voicedLines.filter(line => roleOf(line) === value).length}</em></div>`).join('');
}
function render() {
  const rows = filtered(), pagination = pageLines(rows, state.page, state.pageSize);
  state.page = pagination.page;
  const pages = pagination.pages, visibleRows = pagination.visible;
  $('lineCount').textContent = `${state.lines.length} 句`;
  $('selectionText').textContent = `${rows.length} 条匹配 · ${state.checked.length} 条已勾选`;
  $('pageText').textContent = `${state.page + 1} / ${pages}`;
  $('pagePrev').disabled = state.page === 0; $('pageNext').disabled = state.page >= pages - 1;
  $('empty').classList.toggle('hidden', rows.length > 0);
  $('lineTable').innerHTML = visibleRows.map(line => `<tr data-id="${esc(line.lineId)}" class="${line.lineId === state.selected ? 'selected' : ''}"><td class="check"><input type="checkbox" data-check="${esc(line.lineId)}" ${state.checked.includes(line.lineId) ? 'checked' : ''}></td><td><span class="line-cn">${esc(line.displayText)}</span><span class="line-jp">${esc(line.speechText || '尚未填写日语')}</span><code class="id">${esc(line.lineId)}</code></td><td>${esc(roleOf(line))}</td><td>${esc(styleName(line))}</td><td><span class="status-pill status-${lineStatus(line)}">${statusText[lineStatus(line)] || lineStatus(line)}</span></td></tr>`).join('');
  $('lineTable').querySelectorAll('tr').forEach(row => row.addEventListener('click', event => { if (!event.target.matches('input')) select(row.dataset.id); }));
  $('lineTable').querySelectorAll('[data-check]').forEach(input => input.addEventListener('change', () => {
    state.checked = input.checked ? [...new Set([...state.checked, input.dataset.check])] : state.checked.filter(id => id !== input.dataset.check);
    render(); renderQueue();
  }));
}
function populateStyles(line) {
  const selection = resolveStyle(state.styles, line);
  const options = `<option value="" ${!selection.style ? 'selected' : ''}>${selection.missing ? '风格缺失，请重新选择' : '请选择原生声音风格'}</option>` + state.styles.map(style => `<option value="${style.styleId}" ${String(style.styleId) === String(line.styleId) ? 'selected' : ''}>${esc(style.speakerName)} · ${esc(style.styleName)}</option>`).join('');
  $('styleSelect').innerHTML = options;
  $('batchStyle').innerHTML = '<option value="">保持不变</option>' + options;
}
function setTune(line) {
  const tuning = tuningOf(line);
  for (const [id, key] of [['speed', 'speedScale'], ['pitch', 'pitchScale'], ['intonation', 'intonationScale'], ['volume', 'volumeScale']]) {
    $(id).value = tuning[key]; $(`${id}Out`).value = tuning[key].toFixed(2);
  }
}
function select(id) {
  previewAudio?.pause(); previewToken++;
  state.selected = id; const line = state.lines.find(item => item.lineId === id); if (!line) return;
  $('noSelection').classList.add('hidden'); $('editor').classList.remove('hidden');
  $('displayText').textContent = line.displayText; $('lineId').textContent = line.lineId;
  $('sourceMeta').textContent = `${line.chapter || '未知章节'} · ${roleOf(line)}${line.speaker && line.speaker !== roleOf(line) ? `（原标签：${line.speaker}）` : ''}`;
  $('speechText').value = line.speechText || ''; $('translationStatus').value = line.translationStatus || 'untranslated';
  $('voiceEnabled').checked = Boolean(line.voiceEnabled);
  $('voicePolicy').textContent = line.kind === 'dialogue' ? '台词默认纳入；可按制作需要排除。' : '旁白默认排除；勾选后才会进入正式发布。';
  setTune(line); populateStyles(line);
  $('queryState').textContent = line.audioQuery && !line.renderStale ? '已生成查询，可以试听。' : '需要生成或刷新 AudioQuery。';
  render(); renderAdvanced(line);
}
function markDirty(line, synthesisChanged = false) {
  previewToken++; previewAudio?.pause();
  state.dirty = true; $('dirtyDot').classList.remove('hidden');
  if (line && synthesisChanged) { line.renderStale = true; $('queryState').textContent = '合成输入已改变，旧查询不会用于批量生成。'; }
  render();
}
function updateLine(patch, synthesisChanged = false) {
  const line = state.lines.find(item => item.lineId === state.selected); if (!line) return;
  if (synthesisChanged) checkpoint(line, '文本或风格修改');
  Object.assign(line, patch); markDirty(line, synthesisChanged); renderAdvanced(line);
}

async function detectEngine() {
  const button = $('engineBtn'); button.disabled = true;
  try {
    const data = await api('/api/voicevox/status'); state.styles = data.styles; state.engineIdentity = { uuid: data.uuid, version: data.version, manifestVersion: data.manifestVersion };
    button.classList.add('online'); button.innerHTML = `<i></i>引擎在线 · ${esc(data.version)}`;
    if (state.selected) populateStyles(state.lines.find(line => line.lineId === state.selected)); else populateStyles({});
    toast(`已连接 VOICEVOX ${data.version}，发现 ${data.styles.length} 个风格`);
  } catch { button.classList.remove('online'); button.innerHTML = '<i></i>引擎离线'; toast('无法连接本机 VOICEVOX Engine，请先启动 127.0.0.1:50021'); }
  finally { button.disabled = false; }
}
async function loadSource() {
  try {
    const data = await api('/api/voicevox/source');
    const hadExisting = state.lines.length > 0;
    const sync = syncVoiceLines(state.lines, data.lines);
    const summary = sync.summary;
    if (hadExisting && sync.changes.length) {
      const detail = `新增 ${summary.added}，正文修改 ${summary.modified}，删除 ${summary.deleted}，角色变化 ${summary.roleChanged}，分类变化 ${summary.kindChanged}，其他元数据变化 ${summary.metadataChanged}`;
      if (!confirm(`发现 ${sync.changes.length} 项游戏剧本变化：\n${detail}\n\n应用后保留日语、声音和调音历史；受影响音频会标记过期。`)) return;
    }
    state.lines = sync.lines;
    state.sourceRevision = data.sourceRevision; applyRoleDefaults(); renderFilters(); render(); toast(`已载入 ${data.lines.length} 条有效台词`);
    if (hadExisting && sync.changes.length) markDirty();
  } catch (error) { toast(error.message); }
}
async function loadProject() {
  try {
    const project = await api('/api/voicevox/project'); state.projectRevision = project.projectRevision; state.rolePresets = project.rolePresets || {};
    state.sourceRevision = project.source?.storyRevision || null;
    if (project.lines?.length) state.lines = project.lines;
    renderFilters(); render(); $('revision').textContent = project.projectRevision ? project.projectRevision.slice(0, 8) : '未保存';
  } catch (error) { toast(error.message); }
}
async function save() {
  try {
    const project = { source: { storyRevision: state.sourceRevision }, engine: state.engineIdentity, rolePresets: state.rolePresets, lines: state.lines };
    const saved = await post('/api/voicevox/project', { project, revision: state.projectRevision });
    state.projectRevision = saved.projectRevision; state.dirty = false; $('dirtyDot').classList.add('hidden'); $('revision').textContent = saved.projectRevision.slice(0, 8); toast('工程已保存，并创建了 .bak 备份');
  } catch (error) { toast(error.message.includes('工程已') ? '工程版本冲突，请重新载入后合并。' : error.message); }
}

async function decodeFile(file, encoding) { return new TextDecoder(encoding, { fatal: true }).decode(await file.arrayBuffer()); }
async function importFiles(fileList) {
  const encoding = $('importEncoding').value, parsed = [];
  try { for (const file of fileList) parsed.push({ name: file.name, rows: parseImport(await decodeFile(file, encoding), file.name) }); }
  catch (error) { toast(`导入解码或格式错误：${error.message}`); return; }
  const result = validateImport(parsed, state.lines.map(line => line.lineId));
  if (result.errors.length) { alert(`导入未应用，发现 ${result.errors.length} 个错误：\n\n${result.errors.slice(0, 20).join('\n')}`); return; }
  if (!result.updates.length || !confirm(`已检查 ${fileList.length} 个文件，共 ${result.updates.length} 条有效更新。确认一次性应用？`)) return;
  const byId = new Map(state.lines.map(line => [line.lineId, line]));
  for (const update of result.updates) {
    const line = byId.get(update.lineId); checkpoint(line, '导入文本'); line.speechText = update.speechText; line.translationStatus = update.translationStatus;
    if (update.styleId !== undefined && update.styleId !== '') line.styleId = Number(update.styleId);
    line.renderStale = true;
  }
  markDirty(); toast(`已事务式导入 ${result.updates.length} 条日语稿`);
}

async function generateQuery() {
  const line = state.lines.find(item => item.lineId === state.selected); if (!line?.speechText?.trim()) return toast('请先填写日语配音文本');
  const styleId = Number($('styleSelect').value); if ($('styleSelect').value === '' || !Number.isInteger(styleId)) return toast('请先选择 VOICEVOX 风格');
  const before = JSON.stringify(snapshot(line));
  $('queryBtn').disabled = true;
  try {
    const data = await post('/api/voicevox/query', { text: line.speechText, styleId });
    if (before !== JSON.stringify(snapshot(line))) return toast('台词已改变，丢弃过期分析结果');
    checkpoint(line, '重新生成查询');
    line.audioQuery = Object.assign(data.query, tuningOf(line)); line.tuning = tuningOf(line); line.styleId = styleId; line.renderStale = false;
    markDirty(); if (state.selected === line.lineId) { renderAdvanced(line); $('queryState').textContent = '查询已生成，可以试听。'; } toast('AudioQuery 已生成');
  } catch (error) { toast(error.message); } finally { $('queryBtn').disabled = false; }
}
async function preview() {
  const line = state.lines.find(item => item.lineId === state.selected);
  if (!line?.audioQuery || line.renderStale) { await generateQuery(); if (!line?.audioQuery || line.renderStale) return; }
  if (line.lineId !== state.selected) return;
  try {
    await playQuery(line.audioQuery, line.styleId); $('queryState').textContent = '正在试听…';
  } catch (error) { toast(error.message); }
}

function applyRoleDefaults() {
  for (const line of state.lines) {
    const preset = state.rolePresets[roleOf(line)]; if (!preset || Number.isInteger(line.styleId)) continue;
    line.styleId = preset.styleId; line.tuning = { ...preset.tuning }; line.renderStale = true;
  }
}
function openBatch() {
  if (!state.checked.length) return toast('请先勾选要批量设置的台词');
  populateStyles(state.lines.find(line => line.lineId === state.selected) || {}); $('batchPanel').classList.remove('hidden');
}
function applyBatch() {
  const ids = new Set(state.checked), targets = state.lines.filter(line => ids.has(line.lineId));
  state.undo = targets.map(line => ({ lineId: line.lineId, value: structuredClone(line) }));
  const style = $('batchStyle').value, status = $('batchStatus').value;
  const tuneInputs = { speedScale: $('batchSpeed').value, pitchScale: $('batchPitch').value, intonationScale: $('batchIntonation').value, volumeScale: $('batchVolume').value };
  for (const line of targets) {
    checkpoint(line, '批量参数');
    if (style !== '') line.styleId = Number(style); if (status) line.translationStatus = status;
    const tuning = tuningOf(line); let changed = style !== '';
    for (const [key, value] of Object.entries(tuneInputs)) if (value !== '') { tuning[key] = Number(value); changed = true; }
    line.tuning = tuning; if (line.audioQuery) Object.assign(line.audioQuery, tuning); if (style !== '') line.renderStale = true;
    if ($('saveRolePreset').checked) state.rolePresets[roleOf(line)] = { styleId: line.styleId, tuning: { ...tuning } };
  }
  markDirty(); $('batchPanel').classList.add('hidden'); toast(`已批量更新 ${targets.length} 条台词，可在批量设置中撤销`);
}
function undoBatch() {
  if (!state.undo) return toast('没有可撤销的批量操作');
  const byId = new Map(state.undo.map(item => [item.lineId, item.value])); state.lines = state.lines.map(line => byId.get(line.lineId) || line); state.undo = null; markDirty(); toast('已撤销上次批量操作');
}

async function queueAction(action, taskIds) {
  try { state.queueState = await post('/api/voicevox/queue', { action, taskIds }); renderQueue(); }
  catch (error) { toast(error.message); }
}
async function enqueueChecked() {
  const ids = new Set(state.checked), lines = state.lines.filter(line => ids.has(line.lineId)); if (!lines.length) return toast('请先勾选台词');
  const invalid = lines.filter(line => !line.speechText?.trim() || !Number.isInteger(line.styleId) || line.translationStatus !== 'proofread');
  if (invalid.length) return toast(`${invalid.length} 条台词缺少日语、风格或“已校对”状态，未加入队列`);
  try {
    const payload = lines.map(line => ({ lineId: line.lineId, speechText: line.speechText, styleId: line.styleId, translationStatus: line.translationStatus, audioQuery: line.renderStale ? null : line.audioQuery, synthesisOptions: { tuning: tuningOf(line) } }));
    const result = await post('/api/voicevox/queue', { action: 'enqueue', lines: payload, engineIdentity: state.engineIdentity }); state.queueState = result.queue; renderQueue(); toast(`已加入 ${result.added.length} 个新任务`);
  } catch (error) { toast(error.message); }
}
function renderQueue() {
  const queue = state.queueState, counts = queue?.counts || {};
  $('queueText').textContent = state.checked.length ? `已选 ${state.checked.length} 句` : '未选择台词';
  $('queueProgress').textContent = queue ? `等待 ${counts.pending || 0} · 进行 ${counts.running || 0} · 完成 ${counts.completed || 0} · 失败 ${counts.failed || 0}` : '';
  $('queuePause').textContent = queue?.paused ? '继续' : '暂停';
}
async function refreshQueue() { try { state.queueState = await api('/api/voicevox/queue'); renderQueue(); } catch {} }
async function exportBatch() {
  if (!state.checked.length) return toast('请先勾选要导出的台词');
  try { const result = await post('/api/voicevox/batch-export', { lineIds: state.checked }); toast(`已导出 ${result.count} 个 WAV 与清单：${result.manifestFile}`); }
  catch (error) { toast(error.message); }
}
async function publishSelected() {
  if (!state.checked.length) return toast('请先勾选要发布的台词');
  if (state.dirty) return toast('发布前请先保存工程，确保源版本与调音已落盘');
  try {
    const result = await post('/api/voicevox/publish', { lineIds: state.checked, revision: state.projectRevision });
    toast(`已发布 ${result.count} 条稳定 ID 语音：${result.manifestFile}`);
  } catch (error) { toast(error.message); }
}
async function exportTranslation() {
  if (!state.lines.length) return toast('请先载入游戏台词');
  try { const result = await post('/api/voicevox/export', { lines: state.lines }); toast(`已导出 ${result.count} 条中日对照稿：${result.file}`); } catch (error) { toast(error.message); }
}

const advanced = document.createElement('details'); advanced.open = true; advanced.id = 'advanced';
$('editor').append(advanced);
function renderAdvanced(line) {
  const phrases = line.audioQuery?.accent_phrases || [];
  advanced.innerHTML = `<summary>精细调音 · 按音节编辑</summary><p class="hint">文本/风格改变后请重新分析。无声 mora 音高锁定；时长单位为秒。重音位置修改后点击“重算音高”使曲线生效；重算会覆盖对应人工值，均可撤销。</p><div class="fine-actions"><button data-history="undo">撤销</button><button data-history="redo">恢复</button><button id="compareTune">试听上一步</button></div><div class="fine-actions"><button data-recalc="accent_phrases">重新分析读音</button><button data-recalc="mora_pitch">重算音高</button><button data-recalc="mora_length">重算时长</button><button data-recalc="mora_data">重算全部音素</button></div>${line.renderStale ? '<p>查询已过期，请生成新查询；旧调音可通过撤销恢复。</p>' : phrases.map((p, pi) => `<fieldset><legend>短语 ${pi + 1} · ${esc(p.moras.map(m => m.text).join(''))}</legend><label>重音位置 <input type="number" min="1" max="${p.moras.length}" value="${p.accent}" data-phrase="${pi}" data-key="accent"></label>${p.moras.concat(p.pause_mora ? [p.pause_mora] : []).map((m, mi) => `<div class="mora-row"><b>${mi + 1} · ${esc(m.text)} <small>${esc(m.consonant || '')}/${esc(m.vowel)}</small></b>${['pitch', 'consonant_length', 'vowel_length'].map(key => `<label>${{pitch:'音高',consonant_length:'辅音秒',vowel_length:'元音/停顿秒'}[key]}<input type="number" step="0.01" min="${key === 'pitch' ? 3 : 0}" max="${key === 'pitch' ? 10 : 3}" value="${m[key] ?? ''}" data-phrase="${pi}" data-mora="${mi === p.moras.length ? -1 : mi}" data-key="${key}" ${(key === 'pitch' && (!m.pitch || /^[AIUEO]$|^pau$|^cl$/.test(m.vowel))) || (key === 'consonant_length' && m.consonant == null) ? 'disabled' : ''}></label>`).join('')}</div>`).join('')}</fieldset>`).join('')}`;
  advanced.querySelectorAll('[data-history]').forEach(button => button.onclick = () => { if (restore(line, button.dataset.history === 'redo')) { markDirty(); select(line.lineId); } });
  advanced.querySelectorAll('input').forEach(input => input.oninput = () => {
    const old = structuredClone(line.audioQuery);
    try {
      const pi = Number(input.dataset.phrase), value = Number(input.value);
      if (input.value === '') throw new Error('请输入数值');
      if (input.dataset.key === 'accent') {
        if (!Number.isInteger(value) || value < 1 || value > line.audioQuery.accent_phrases[pi].moras.length) throw new Error('重音位置超出短语范围');
        checkpoint(line, '重音位置'); line.audioQuery.accent_phrases[pi].accent = value;
      } else {
        const edited = structuredClone(old); editMora(edited, pi, Number(input.dataset.mora), input.dataset.key, input.value);
        checkpoint(line, '音节调音'); line.audioQuery = edited;
      }
      markDirty();
    } catch (error) { line.audioQuery = old; toast(error.message); }
  });
  advanced.querySelectorAll('[data-recalc]').forEach(button => button.onclick = async () => {
    if (!line.audioQuery || line.renderStale) return toast('请先生成当前文本的查询');
    if (!confirm('此次重算会覆盖对应音高、时长或读音结构；旧版本保留在撤销历史。继续？')) return;
    const before = JSON.stringify(snapshot(line)); button.disabled = true;
    try {
      const data = await post('/api/voicevox/accent-phrases', { text: line.speechText, styleId: line.styleId, mode: button.dataset.recalc, phrases: line.audioQuery.accent_phrases });
      if (before !== JSON.stringify(snapshot(line))) return toast('编辑已改变，丢弃过期重算');
      checkpoint(line, '引擎重算'); line.audioQuery.accent_phrases = data.phrases; markDirty(); if (state.selected === line.lineId) renderAdvanced(line);
    } catch (error) { toast(error.message); } finally { button.disabled = false; }
  });
  $('compareTune').onclick = async () => {
    const previous = line.tuningHistory?.at(-1)?.value;
    if (!previous?.audioQuery || previous.renderStale) return toast('上一步没有可用查询');
    try { await playQuery(previous.audioQuery, previous.styleId); } catch (error) { toast(error.message); }
  };
}
let previewAudio, previewUrl, previewToken = 0;
async function playQuery(query, styleId) {
  const token = ++previewToken, selected = state.selected;
  previewAudio?.pause(); if (previewUrl) URL.revokeObjectURL(previewUrl);
  const blob = await api('/api/voicevox/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, styleId }) });
  if (token !== previewToken || selected !== state.selected) return;
  previewUrl = URL.createObjectURL(blob); previewAudio = new Audio(previewUrl); await previewAudio.play();
}
for (const id of ['speed', 'pitch', 'intonation', 'volume']) $(id).addEventListener('change', () => {
  const line = state.lines.find(item => item.lineId === state.selected); if (!line) return;
  const key = { speed: 'speedScale', pitch: 'pitchScale', intonation: 'intonationScale', volume: 'volumeScale' }[id];
  checkpoint(line, '基础参数'); line.tuning = tuningOf(line); line.tuning[key] = Number($(id).value); if (line.audioQuery) line.audioQuery[key] = line.tuning[key];
  $(`${id}Out`).value = line.tuning[key].toFixed(2); markDirty(); renderAdvanced(line);
});
$('speechText').addEventListener('input', event => updateLine({ speechText: event.target.value }, true));
$('translationStatus').addEventListener('change', event => updateLine({ translationStatus: event.target.value }));
$('voiceEnabled').addEventListener('change', event => updateLine({ voiceEnabled: event.target.checked, voiceSelection: 'manual' }));
$('styleSelect').addEventListener('change', event => updateLine({ styleId: event.target.value === '' ? null : Number(event.target.value) }, true));
$('engineBtn').onclick = detectEngine; $('sourceBtn').onclick = loadSource; $('saveBtn').onclick = save; $('queryBtn').onclick = generateQuery; $('previewBtn').onclick = preview; $('exportBtn').onclick = exportTranslation;
$('importBtn').onclick = () => $('fileInput').click(); $('fileInput').onchange = event => event.target.files.length && importFiles([...event.target.files]);
$('search').oninput = event => { state.filters.search = event.target.value; state.page = 0; render(); }; $('chapterFilter').onchange = event => { state.filters.chapter = event.target.value; state.page = 0; render(); };
$('clearBtn').onclick = () => { state.filters = { search: '', chapter: '', status: '', speaker: '' }; state.page = 0; $('search').value = ''; document.querySelectorAll('#statusFilters button').forEach(button => button.classList.toggle('active', button.dataset.value === '')); renderFilters(); render(); };
$('statusFilters').onclick = event => { if (event.target.dataset.value === undefined) return; state.filters.status = event.target.dataset.value; state.page = 0; document.querySelectorAll('#statusFilters button').forEach(button => button.classList.toggle('active', button.dataset.value === state.filters.status)); render(); };
$('speakerFilters').onclick = event => { const item = event.target.closest('[data-speaker]'); if (!item) return; state.filters.speaker = item.dataset.speaker; state.page = 0; renderFilters(); render(); };
$('pagePrev').onclick = () => { state.page = Math.max(0, state.page - 1); render(); };
$('pageNext').onclick = () => { state.page += 1; render(); };
$('allCheck').onchange = event => { const ids = filtered().map(line => line.lineId); state.checked = event.target.checked ? [...new Set([...state.checked, ...ids])] : state.checked.filter(id => !ids.includes(id)); render(); renderQueue(); };
$('resetTune').onclick = () => { const line = state.lines.find(item => item.lineId === state.selected); if (line) { checkpoint(line, '重置基础参数'); line.tuning = { ...defaults }; if (line.audioQuery) Object.assign(line.audioQuery, defaults); setTune(line); markDirty(); renderAdvanced(line); } };
$('batchBtn').onclick = openBatch; $('batchClose').onclick = () => $('batchPanel').classList.add('hidden'); $('batchApply').onclick = applyBatch; $('undoBatch').onclick = undoBatch;
$('queueBtn').onclick = enqueueChecked; $('queueClear').onclick = () => { state.checked = []; render(); renderQueue(); };
$('queuePause').onclick = () => queueAction(state.queueState?.paused ? 'resume' : 'pause');
$('queueRetry').onclick = () => queueAction('retry', state.queueState?.tasks.filter(task => task.status === 'failed').map(task => task.taskId) || []);
$('queueCancel').onclick = () => queueAction('cancel', state.queueState?.tasks.filter(task => ['pending', 'running'].includes(task.status)).map(task => task.taskId) || []);
$('batchExport').onclick = exportBatch;
$('publishBtn').onclick = publishSelected;

await loadProject(); await loadSource(); await Promise.all([detectEngine(), refreshQueue()]);
setInterval(refreshQueue, 1200);
