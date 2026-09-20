(() => {
'use strict';
class Assets {
  constructor(manifest) {
    this.manifest = manifest; this.enabled = false; this.current = null;
    this.currentId = null; this.fadeToken = 0;
  }
  image(id) { return this.manifest.images[id] || ''; }
  setMusic(id, { fadeMs = 900 } = {}) {
    const path = this.manifest.bgm[id];
    if (this.currentId === id && this.current === path) return;
    const previous = this.audio || null;
    const next = path ? new Audio(path) : null;
    const target = Math.max(0, Math.min(1, Number(ILY.musicVolumes?.[id] ?? 0.4)));
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
      if (this.audio) this.audio.volume = Math.max(0, Math.min(1, Number(ILY.musicVolumes?.[this.currentId] ?? 0.4)));
      this.play();
    } else this.audio?.pause();
    return this.enabled;
  }
}

Object.assign(ILY, { Assets });
})();
