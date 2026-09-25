(() => {
'use strict';
const SETTINGS_KEY = 'ily-voice-settings-v1';
const allowedTypes = new Set(['dialogue', 'monologue', 'heroine-card']);
const volumeValue = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.8;

// One owner per game. Invalidated hashes and late play promises cannot revive an old line.
// 2026-09-21：移除了「源指纹校验」。原先每条语音都要拿 SHA-256(JSON.stringify(sourceValues))
// 与 manifest 的 sourceFingerprint 比对，不等就静默跳过播放（只在控制台留 warn）。问题在于
// 改动剧本里任何参与指纹的字段（speaker / text / scene / chapter / route / type）都会把配音
// 静默打掉，玩家和开发者都收不到任何界面提示——一次 speaker 归一就曾让 419 条配音消失。
// 现在语音只按 lineId 取 manifest 条目直接播放，不再做内容一致性拦截。
// 如需恢复护栏：voice-source.js 仍导出 ILY.collectVoiceSources，按原样重新接上 getSource 与
// fingerprint 两个注入项即可。
class VoicePlayer {
  constructor({ manifest, canPlay = () => true, storage = null,
    createAudio = path => new Audio(path) } = {}) {
    Object.assign(this, { manifest, canPlay, storage, createAudio });
    this.enabled = true;
    this.volume = 0.8;
    this.masterVolume = (ILY.AudioSettings && ILY.AudioSettings.getMaster()) || 1;
    this.generation = 0;
    this.audio = null;
    try {
      const saved = JSON.parse(storage?.getItem(SETTINGS_KEY) || 'null');
      if (typeof saved?.enabled === 'boolean') this.enabled = saved.enabled;
      if (saved && Object.hasOwn(saved, 'volume')) this.volume = volumeValue(saved.volume);
    } catch { /* Settings must never prevent the story from loading. */ }
  }
  saveSettings() {
    try { this.storage?.setItem(SETTINGS_KEY, JSON.stringify({ enabled: this.enabled, volume: this.volume })); } catch {}
  }
  setEnabled(value) {
    this.enabled = Boolean(value);
    if (!this.enabled) this.stop();
    this.saveSettings();
  }
  setVolume(value) {
    this.volume = volumeValue(value);
    if (this.audio) this.audio.volume = this.volume * this.masterVolume;
    if (!this.volume) this.stop();
    this.saveSettings();
  }
  setMasterVolume(value) {
    this.masterVolume = (ILY.AudioSettings && ILY.AudioSettings.setMaster(value)) || Math.max(0, Math.min(1, value));
    if (this.audio) this.audio.volume = this.volume * this.masterVolume;
  }
  stop() {
    ++this.generation;
    const audio = this.audio;
    this.audio = null;
    if (!audio) return;
    audio.onended = audio.onerror = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  async play(node) {
    this.stop();
    const generation = this.generation;
    if (!this.enabled || !this.volume || !this.canPlay() || !allowedTypes.has(node?.type)) return false;
    const lineId = node.reviewId || node.id;
    const entry = this.manifest?.schemaVersion === 1 && this.manifest.entries?.[lineId];
    if (!entry || !/^assets\/audio\/voices\/published\/v\d{2,5}\.(wav|mp3)$/.test(entry.file || '')) return false;
    try {
      if (generation !== this.generation || !this.canPlay()) return false;
      const audio = this.createAudio(`${entry.file}?v=${encodeURIComponent(entry.renderHash || entry.sourceFingerprint)}`);
      this.audio = audio;
      audio.volume = this.volume * this.masterVolume;
      audio.preload = 'auto';
      const finish = () => { if (this.audio === audio) this.stop(); };
      audio.onended = audio.onerror = finish;
      try { await audio.play(); }
      catch { finish(); return false; } // Missing WAV, codec errors and autoplay denial all degrade to silence.
      if (generation !== this.generation) { audio.pause(); return false; }
      return true;
    } catch {
      if (generation === this.generation) this.stop();
      return false;
    }
  }
}
Object.assign(ILY, { VoicePlayer });
})();
