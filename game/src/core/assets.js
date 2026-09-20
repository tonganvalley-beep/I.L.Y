(() => {
'use strict';
const MUSIC_KEY = 'ily-music-settings-v1';
const clamp01 = v => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.4;
class Assets {
  constructor(manifest) {
    this.manifest = manifest;
    this.enabled = false;
    this.current = null;
    this.currentId = null;
    this.fadeToken = 0;
    this.musicVolume = 0.4;
    this.masterVolume = (ILY.AudioSettings && ILY.AudioSettings.getMaster()) || 1;
    try {
      const saved = JSON.parse(localStorage.getItem(MUSIC_KEY) || 'null');
      if (saved && typeof saved.enabled === 'boolean') this.enabled = saved.enabled;
      if (saved && Object.hasOwn(saved, 'musicVolume')) this.musicVolume = clamp01(saved.musicVolume);
    } catch { /* Settings must never prevent the story from loading. */ }
  }
  image(id) { return this.manifest.images[id] || ''; }
  targetVolume(id = this.currentId) {
    const cueVolume = clamp01(Number(ILY.musicVolumes?.[id] ?? 0.4));
    return clamp01(cueVolume * (this.musicVolume / 0.4) * this.masterVolume);
  }
  setMusic(id, { fadeMs = 900 } = {}) {
    const path = this.manifest.bgm[id];
    if (this.currentId === id && this.current === path) return;
    const previous = this.audio || null;
    const next = path ? new Audio(path) : null;
    const target = this.targetVolume(id);
    const token = ++this.fadeToken;
    this.currentId = id ?? null; this.current = path || null; this.audio = next;
    if (next) {
      next.loop = true; next.preload = 'auto'; next.volume = this.enabled && previous ? 0 : target;
      if (this.enabled) next.play().catch(() => {});
    }
    if (!previous) return;
    if (!this.enabled || fadeMs <= 0) { previous.pause(); return; }
    const started = performance.now(), from = previous.volume;
    const step = now => {
      if (token !== this.fadeToken) { previous.pause(); return; }
      const ratio = Math.min(1, (now - started) / fadeMs);
      previous.volume = from * (1 - ratio);
      if (next) next.volume = target * ratio;
      if (ratio < 1) requestAnimationFrame(step); else previous.pause();
    };
    requestAnimationFrame(step);
  }
  play() {
    if (this.enabled && this.audio) this.audio.play().catch(() => {});
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      if (this.audio) this.audio.volume = this.targetVolume();
      this.play();
    } else this.audio?.pause();
    this.saveSettings();
    return this.enabled;
  }
  setMusicVolume(value) {
    this.musicVolume = clamp01(value);
    if (this.audio) this.audio.volume = this.targetVolume();
    this.saveSettings();
  }
  setMasterVolume(value) {
    this.masterVolume = (ILY.AudioSettings && ILY.AudioSettings.setMaster(value)) || clamp01(value);
    if (this.audio) this.audio.volume = this.targetVolume();
  }
  saveSettings() {
    try { localStorage.setItem(MUSIC_KEY, JSON.stringify({ enabled: this.enabled, musicVolume: this.musicVolume })); } catch {}
  }
}

Object.assign(ILY, { Assets });
})();
