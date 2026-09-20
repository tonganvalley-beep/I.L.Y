(() => {
'use strict';
const MUSIC_KEY = 'ily-music-settings-v1';
const clamp01 = v => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.4;
class Assets {
  constructor(manifest) {
    this.manifest = manifest;
    this.enabled = false;
    this.current = null;
    this.musicVolume = 0.4;
    this.masterVolume = (ILY.AudioSettings && ILY.AudioSettings.getMaster()) || 1;
    try {
      const saved = JSON.parse(localStorage.getItem(MUSIC_KEY) || 'null');
      if (saved && typeof saved.enabled === 'boolean') this.enabled = saved.enabled;
      if (saved && Object.hasOwn(saved, 'musicVolume')) this.musicVolume = clamp01(saved.musicVolume);
    } catch { /* Settings must never prevent the story from loading. */ }
  }
  image(id) { return this.manifest.images[id] || ''; }
  setMusic(id) {
    const path = this.manifest.bgm[id];
    if (this.current === path) return;
    this.audio?.pause();
    this.current = path;
    this.audio = path ? new Audio(path) : null;
    if (this.audio) { this.audio.loop = true; this.audio.volume = this.musicVolume * this.masterVolume; }
    this.play();
  }
  play() {
    if (this.enabled && this.audio) this.audio.play().catch(() => {});
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.play(); else this.audio?.pause();
    this.saveSettings();
    return this.enabled;
  }
  setMusicVolume(value) {
    this.musicVolume = clamp01(value);
    if (this.audio) this.audio.volume = this.musicVolume * this.masterVolume;
    this.saveSettings();
  }
  setMasterVolume(value) {
    this.masterVolume = (ILY.AudioSettings && ILY.AudioSettings.setMaster(value)) || clamp01(value);
    if (this.audio) this.audio.volume = this.musicVolume * this.masterVolume;
  }
  saveSettings() {
    try { localStorage.setItem(MUSIC_KEY, JSON.stringify({ enabled: this.enabled, musicVolume: this.musicVolume })); } catch {}
  }
}

Object.assign(ILY, { Assets });
})();
