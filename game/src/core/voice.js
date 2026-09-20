(() => {
'use strict';
const SETTINGS_KEY = 'ily-voice-settings-v1';
const allowedTypes = new Set(['dialogue', 'monologue', 'heroine-card']);
const volumeValue = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.8;

// One owner per game. Invalidated hashes and late play promises cannot revive an old line.
class VoicePlayer {
  constructor({ manifest, getSource, canPlay = () => true, storage = null,
    createAudio = path => new Audio(path), fingerprint = async values => {
      const bytes = new TextEncoder().encode(JSON.stringify(values));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    }, warn = message => console.warn(message) } = {}) {
    Object.assign(this, { manifest, getSource, canPlay, storage, createAudio, fingerprint, warn });
    this.enabled = true;
    this.volume = 0.8;
    this.masterVolume = (ILY.AudioSettings && ILY.AudioSettings.getMaster()) || 1;
    this.generation = 0;
    this.audio = null;
    this.warned = new Set();
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
    if (!entry || !/^assets\/audio\/voices\/published\/[a-f0-9]{20}\.wav$/.test(entry.file || '')) return false;
    try {
      const source = this.getSource(lineId);
      if (!source || await this.fingerprint(source.sourceValues) !== entry.sourceFingerprint) {
        if (!this.warned.has(lineId)) {
          this.warned.add(lineId);
          this.warn(`VOICEVOX: stale source for ${lineId}; skipped.`);
        }
        return false;
      }
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
