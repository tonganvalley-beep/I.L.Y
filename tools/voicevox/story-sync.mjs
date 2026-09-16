const sourceKeys = ['sourceNodeId', 'runtimeNodeId', 'reviewId', 'identityKind', 'order', 'voiceOrder', 'voiceRole', 'chapter', 'chapterTitle', 'scene', 'route', 'kind', 'speaker', 'displayText', 'sourceFingerprint'];

export function isDefaultVoiceKind(kind) {
  return kind === 'dialogue';
}

function newLine(source) {
  return {
    ...source,
    voiceEnabled: isDefaultVoiceKind(source.kind),
    voiceSelection: 'default',
    speechText: source.speechText || '',
    translationStatus: source.translationStatus || (source.speechText ? 'draft' : 'untranslated'),
    renderStale: false
  };
}

function changeRecord(type, source, previous = null) {
  return {
    type,
    lineId: source?.lineId || previous?.lineId,
    chapter: source?.chapter || previous?.chapter || '',
    speaker: source?.speaker || previous?.speaker || '',
    beforeText: previous?.displayText || '',
    afterText: source?.displayText || ''
  };
}

export function syncVoiceLines(existingLines = [], sourceLines = []) {
  const existing = new Map(existingLines.map(line => [line.lineId, line]));
  const sourceIds = new Set(sourceLines.map(line => line.lineId));
  const changes = [];
  const lines = sourceLines.map(source => {
    const previous = existing.get(source.lineId);
    if (!previous) {
      changes.push(changeRecord('added', source));
      return newLine(source);
    }
    const textChanged = previous.displayText !== source.displayText;
    const roleChanged = previous.speaker !== source.speaker;
    const kindChanged = previous.kind !== source.kind;
    const metadataChanged = previous.sourceFingerprint !== source.sourceFingerprint;
    if (textChanged) changes.push(changeRecord('modified', source, previous));
    if (roleChanged) changes.push(changeRecord('roleChanged', source, previous));
    if (kindChanged) changes.push(changeRecord('kindChanged', source, previous));
    if (!textChanged && !roleChanged && !kindChanged && metadataChanged) changes.push(changeRecord('metadataChanged', source, previous));
    const merged = { ...previous };
    for (const key of sourceKeys) merged[key] = source[key];
    merged.lineId = source.lineId;
    merged.voiceEnabled = previous.voiceSelection === 'default' || typeof previous.voiceEnabled !== 'boolean'
      ? isDefaultVoiceKind(source.kind) : previous.voiceEnabled;
    merged.voiceSelection = previous.voiceSelection || (typeof previous.voiceEnabled === 'boolean' ? 'manual' : 'default');
    if (metadataChanged) {
      merged.renderStale = true;
      merged.sourceChanged = true;
    } else {
      delete merged.sourceChanged;
    }
    return merged;
  });
  for (const previous of existingLines) {
    if (!sourceIds.has(previous.lineId)) changes.push(changeRecord('deleted', null, previous));
  }
  const summary = changes.reduce((result, change) => {
    result[change.type] = (result[change.type] || 0) + 1;
    return result;
  }, { added: 0, modified: 0, deleted: 0, roleChanged: 0, kindChanged: 0, metadataChanged: 0 });
  return { lines, changes, summary };
}
