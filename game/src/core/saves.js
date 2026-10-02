// 《I.L.Y.》多存档管理。
// 借鉴 Ren'Py：手动档使用“页-槽”命名，自动档/快速档独立并各自循环后移。
(() => {
'use strict';

const SAVE_FORMAT = 'ily-save';
const SAVE_FORMAT_VERSION = 2;
const MANUAL_PAGES = 2;
const SLOTS_PER_PAGE = 6;
const AUTOSAVE_SLOTS = 6;
const QUICKSAVE_SLOTS = 6;

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
    this.achievementsKey = `${this.prefix}_achievements`;
  }

  slotName(page, slot) {
    const normalizedPage = String(page);
    const number = Number(slot);
    const max = normalizedPage === 'auto' ? AUTOSAVE_SLOTS : normalizedPage === 'quick' ? QUICKSAVE_SLOTS : SLOTS_PER_PAGE;
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
        chapter: node.chapterTitle || this.story.title,
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
    const count = String(page) === 'auto' ? AUTOSAVE_SLOTS : String(page) === 'quick' ? QUICKSAVE_SLOTS : SLOTS_PER_PAGE;
    return Array.from({ length: count }, (_, index) => this.inspect(page, index + 1));
  }

  save(page, slot, state, options) {
    if (!this.storage) throw new Error('浏览器存储不可用。');
    this.persistAchievements(state);
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
    if (!this.storage) throw new Error('浏览器存储不可用。');
    this.persistAchievements(state);
    const record = this.createRecord('quick', 1, state);
    for (let slot = QUICKSAVE_SLOTS; slot >= 2; slot--) {
      const previous = this.storage.getItem(this.key('quick', slot - 1));
      if (previous) this.storage.setItem(this.key('quick', slot), previous);
      else this.storage.removeItem(this.key('quick', slot));
    }
    this.storage.setItem(this.key('quick', 1), JSON.stringify(record));
    return record;
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

  // 成就是账号进度。首次运行时先从现有槽位迁移，避免循环自动档覆盖旧结局。
  collectAchievements() {
    const ids = new Set();
    if (!this.storage) return ids;
    try {
      const stored = JSON.parse(this.storage.getItem(this.achievementsKey) || '[]');
      if (Array.isArray(stored)) stored.forEach(id => ids.add(id));
      for (const page of ['1', '2', 'auto', 'quick']) {
        for (const item of this.list(page)) {
          const list = item.status === 'ok' && item.record.state.flags?.achievements;
          if (Array.isArray(list)) list.forEach(id => ids.add(id));
        }
      }
      const legacy = JSON.parse(this.storage.getItem(this.legacyKey) || 'null');
      if (Array.isArray(legacy?.flags?.achievements)) legacy.flags.achievements.forEach(id => ids.add(id));
    } catch { /* 损坏或不可用的存储不影响游戏 */ }
    return ids;
  }

  persistAchievements(state, { migrate = false } = {}) {
    let stored = [];
    try { stored = JSON.parse(this.storage?.getItem(this.achievementsKey) || '[]'); } catch {}
    const ids = migrate ? this.collectAchievements() : new Set(Array.isArray(stored) ? stored : []);
    const current = state?.flags?.achievements;
    if (Array.isArray(current)) current.forEach(id => ids.add(id));
    if (state?.flags) state.flags.achievements = [...ids];
    try { this.storage?.setItem(this.achievementsKey, JSON.stringify([...ids])); } catch {}
    return ids;
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
  SAVE_LAYOUT: { manualPages: MANUAL_PAGES, slotsPerPage: SLOTS_PER_PAGE, autosaveSlots: AUTOSAVE_SLOTS, quicksaveSlots: QUICKSAVE_SLOTS }
});
})();
