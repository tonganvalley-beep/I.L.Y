export function parseDelimited(text, separator) {
  const records = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i], next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === separator) { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell); records.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('存在未闭合的引号字段');
  row.push(cell); records.push(row);
  const useful = records.filter(record => record.some(value => value.trim()));
  const headers = (useful.shift() || []).map(value => value.replace(/^\ufeff/, '').trim());
  if (!headers.length) return [];
  if (headers.some(header => !header)) throw new Error('表头包含空字段名');
  if (new Set(headers).size !== headers.length) throw new Error('表头包含重复字段名');
  for (const [index, record] of useful.entries()) {
    if (record.length !== headers.length) throw new Error(`第 ${index + 2} 行字段数为 ${record.length}，应为 ${headers.length}`);
  }
  return useful.map((record, index) => ({
    __row: index + 2,
    ...Object.fromEntries(headers.map((header, column) => [header, record[column] ?? '']))
  }));
}

export function parseImport(text, filename = '') {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.json')) {
    const data = JSON.parse(text.replace(/^\ufeff/, ''));
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.lines)) return data.lines;
    return data.lines && typeof data.lines === 'object' ? Object.values(data.lines) : [];
  }
  const separator = lower.endsWith('.csv') ? ',' : '\t';
  return parseDelimited(text, separator);
}

export function validateImport(files, knownIds) {
  const known = new Set(knownIds); const seen = new Map(); const updates = []; const errors = [];
  for (const file of files) for (const row of file.rows) {
    const lineId = String(row.line_id ?? row.lineId ?? '').trim();
    const speechText = row.speech_text ?? row.speechText;
    const location = `${file.name}:${row.__row || '?'}行`;
    if (!lineId || speechText === undefined) { errors.push(`${location} 缺少 line_id 或 speech_text`); continue; }
    if (!known.has(lineId)) { errors.push(`${location} 未知 ID：${lineId}`); continue; }
    if (seen.has(lineId)) { errors.push(`${location} 与 ${seen.get(lineId)} 重复 ID：${lineId}`); continue; }
    seen.set(lineId, location);
    const translationStatus = row.translation_status || row.translationStatus || 'draft';
    const styleId = row.style_id ?? row.styleId;
    if (!['untranslated', 'draft', 'reviewed', 'proofread'].includes(translationStatus)) { errors.push(`${location} 翻译状态无效：${translationStatus}`); continue; }
    if (styleId !== undefined && styleId !== '' && !Number.isInteger(Number(styleId))) { errors.push(`${location} 风格 ID 必须是整数：${styleId}`); continue; }
    updates.push({ lineId, speechText: String(speechText), translationStatus, styleId });
  }
  return { updates, errors };
}
