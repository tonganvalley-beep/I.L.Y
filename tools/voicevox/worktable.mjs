export function lineStatus(line) {
  if (line.renderStale) return 'stale';
  if (!line.speechText?.trim()) return 'untranslated';
  if (line.translationStatus === 'proofread' && line.audioQuery) return 'ready';
  return line.translationStatus || 'draft';
}

export function filterLines(lines, filters = {}) {
  const query = String(filters.search || '').trim().toLowerCase();
  return lines.filter(line => (!filters.chapter || line.chapter === filters.chapter) &&
    (!filters.status || lineStatus(line) === filters.status) &&
    (!filters.speaker || ((line.voiceRole || line.speaker) === filters.speaker && line.voiceEnabled !== false)) &&
    (!query || `${line.lineId} ${line.displayText} ${line.speechText || ''} ${line.voiceRole || ''} ${line.speaker || ''}`.toLowerCase().includes(query)))
    .sort((a, b) => (a.voiceOrder ?? a.order ?? 0) - (b.voiceOrder ?? b.order ?? 0));
}

export function pageLines(lines, page = 0, pageSize = 200) {
  const pages = Math.max(1, Math.ceil(lines.length / pageSize));
  const currentPage = Math.max(0, Math.min(Number.isInteger(page) ? page : 0, pages - 1));
  return { pages, page: currentPage, visible: lines.slice(currentPage * pageSize, (currentPage + 1) * pageSize) };
}
