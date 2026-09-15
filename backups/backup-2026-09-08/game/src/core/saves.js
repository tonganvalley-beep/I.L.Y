// 《I.L.Y.》多存档管理。
// 借鉴 Ren'Py：手动档使用“页-槽”命名，自动档/快速档独立；自动档按新到旧循环后移。
(() => {
'use strict';

const SAVE_FORMAT = 'ily-save';
const SAVE_FORMAT_VERSION = 2;
const MANUAL_PAGES = 2;
const SLOTS_PER_PAGE = 6;
const AUTOSAVE_SLOTS = 3;

const clone = value => JSON.parse(JSON.stringify(value));

class SaveManager {
  constructor({ storage, username, story, maps, validateSave, now = () => new Date() }) {
    this.storage = storage;
    this.story = story;
    this.maps = maps;
    this.validateSave = validateSave;
    this.now = now;
    this.player = encodeURIComponent(String(username || 'guest'));
    this.prefix = `ily-save-v2:${this.player}:`;
    this.legacyKey = `ily-save-v1:${username || 'guest'}`;
    this.migrationKey = `${this.prefix}_migration-v1`;
  }

  slotName(page, slot) {
    const normalizedPage = String(page);
    const number = Number(slot);
    const max = normalizedPage === 'auto' ? AUTOSAVE_SLOTS : normalizedPage === 'quick' ? 1 : SLOTS_PER_PAGE;
    if (!['1', '2', 'auto', 'quick'].includes(normalizedPage) || !Number.isInteger(number) || number < 1 || number > max) {
      throw new Error('存档槽位无效。');
    }
    return `${normalizedPage}-${number}`;
  }

  key(page, slot) {
    return this.prefix + this.slotName(page, slot);
  }

  createRecord(page, slot, state, options = {}) {
    const snapshot = clone(state);
    this.validateSave(snapshot, this.story, this.maps);
    const node = this.story.nodes[snapshot.node] || {};
    const text = typeof node.text === 'string' ? node.text.replace(/\s+/g, ' ').trim() : '';
    const sceneName = node.title || node.speaker || this.story.title;
    const preview = node.cg || node.background || node.walk?.bg || '';
    return {
      format: SAVE_FORMAT,
      version: SAVE_FORMAT_VERSION,
      slot: this.slotName(page, slot),
      savedAt: this.now().toISOString(),
      meta: {
        chapter: this.story.title,
        sceneName,
        summary: text.slice(0, 42),
        preview,
        importedFrom: options.importedFrom || null
      },
      state: snapshot
    };
  }

  parse(raw) {
    const record = JSON.parse(raw);
    if (!record || record.format !== SAVE_FORMAT || record.version !== SAVE_FORMAT_VERSION || !record.meta || !record.state) {
      throw new Error('存档不兼容或已损坏。');
    }
    const state = clone(record.state);
    this.validateSave(state, this.story, this.maps);
    return { ...record, state };
  }

  inspect(page, slot) {
    if (!this.storage) return { status: 'unavailable', page: String(page), slot };
    let raw;
    try { raw = this.storage.getItem(this.key(page, slot)); }
    catch { return { status: 'unavailable', page: String(page), slot }; }
    if (!raw) return { status: 'empty', page: String(page), slot };
    try { return { status: 'ok', page: String(page), slot, record: this.parse(raw) }; }
    catch (error) { return { status: 'corrupt', page: String(page), slot, error }; }
  }

  list(page) {
    const count = String(page) === 'auto' ? AUTOSAVE_SLOTS : String(page) === 'quick' ? 1 : SLOTS_PER_PAGE;
    return Array.from({ length: count }, (_, index) => this.inspect(page, index + 1));
  }

  save(page, slot, state, options) {
    if (!this.storage) throw new Error('浏览器存储不可用。');
    const record = this.createRecord(page, slot, state, options);
    this.storage.setItem(this.key(page, slot), JSON.stringify(record));
    return record;
  }

  load(page, slot) {
    const inspected = this.inspect(page, slot);
    if (inspected.status === 'empty') throw new Error('这个槽位还没有存档。');
    if (inspected.status === 'unavailable') throw new Error('浏览器存储不可用。');
    if (inspected.status !== 'ok') throw new Error('存档不兼容或已损坏。');
    return clone(inspected.record.state);
  }

  remove(page, slot) {
    if (!this.storage) throw new Error('浏览器存储不可用。');
    this.storage.removeItem(this.key(page, slot));
  }

  quicksave(state) {
    return this.save('quick', 1, state);
  }

  autosave(state) {
    if (!this.storage) throw new Error('浏览器存储不可用。');
    // 与 Ren'Py cycle_saves 一致：旧 auto-1 后移，新档始终位于 auto-1。
    for (let slot = AUTOSAVE_SLOTS; slot >= 2; slot--) {
      const previous = this.storage.getItem(this.key('auto', slot - 1));
      if (previous) this.storage.setItem(this.key('auto', slot), previous);
      else this.storage.removeItem(this.key('auto', slot));
    }
    return this.save('auto', 1, state);
  }

  migrateLegacy() {
    if (!this.storage) return false;
    let raw;
    try {
      if (this.storage.getItem(this.migrationKey)) return false;
      raw = this.storage.getItem(this.legacyKey);
      if (this.inspect('1', 1).status !== 'empty') {
        this.storage.setItem(this.migrationKey, 'existing-v2');
        return false;
      }
    } catch { return false; }
    if (!raw) return false;
    try {
      const state = JSON.parse(raw);
      this.validateSave(state, this.story, this.maps);
      this.save('1', 1, state, { importedFrom: 'v1' });
      this.storage.setItem(this.migrationKey, this.now().toISOString());
      return true;
    } catch {
      try { this.storage.setItem(this.migrationKey, 'invalid-v1'); } catch {}
      return false;
    }
  }

  hasAny() {
    for (const page of ['1', '2', 'auto', 'quick']) {
      if (this.list(page).some(item => item.status === 'ok')) return true;
    }
    return false;
  }
}

Object.assign(ILY, {
  SaveManager,
  SAVE_FORMAT_VERSION,
  SAVE_LAYOUT: { manualPages: MANUAL_PAGES, slotsPerPage: SLOTS_PER_PAGE, autosaveSlots: AUTOSAVE_SLOTS }
});
})();
