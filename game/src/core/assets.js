(() => {
'use strict';
class Assets {
  constructor(manifest) { this.manifest = manifest; this.enabled = false; this.current = null; }
  image(id) { return this.manifest.images[id] || ''; }
  setMusic(id) {
    const path = this.manifest.bgm[id];
    if (this.current === path) return;
    this.audio?.pause();
    this.current = path;
    this.audio = path ? new Audio(path) : null;
    if (this.audio) { this.audio.loop = true; this.audio.volume = 0.4; }
    this.play();
  }
  play() {
    if (this.enabled && this.audio) this.audio.play().catch(() => {});
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.play(); else this.audio?.pause();
    return this.enabled;
  }
}

Object.assign(ILY, { Assets });
})();
