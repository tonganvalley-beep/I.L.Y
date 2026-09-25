(() => {
'use strict';
const MUSIC_KEY = 'ily-music-settings-v1';
const clamp01 = v => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.4;
const clamp01With = (v, fallback) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
class Assets {
  constructor(manifest) {
    this.manifest = manifest;
    // 默认开启：与语音（VoicePlayer.enabled）一致，也与页面「背景音乐：开启」的初始标记一致。
    this.enabled = true;
    this.current = null;
    this.currentId = null;
    this.fadeToken = 0;
    this.musicVolume = 0.4;
    const storedMaster = ILY.AudioSettings ? ILY.AudioSettings.getMaster() : 1;
    this.masterVolume = clamp01With(storedMaster, 1);
    this.gestureArmed = false;
    this.onError = null;
    try {
      const saved = JSON.parse(localStorage.getItem(MUSIC_KEY) || 'null');
      if (saved && typeof saved.enabled === 'boolean') this.enabled = saved.enabled;
      if (saved && Object.hasOwn(saved, 'musicVolume')) this.musicVolume = clamp01(saved.musicVolume);
    } catch { /* Settings must never prevent the story from loading. */ }
    this.armGestureUnlock();
  }
  /* 浏览器自动播放策略：file:// 以及首次访问的站点没有媒体参与度，
     页面刚加载时的 BGM 会被直接拒绝（play() 抛 NotAllowedError）。
     这里挂一个常驻的手势监听，用户第一次点击 / 按键时补播一次。 */
  armGestureUnlock() {
    if (this.gestureArmed) return;
    if (typeof document === 'undefined' || !document.addEventListener) return;
    this.gestureArmed = true;
    const resume = () => this.play();
    for (const type of GESTURE_EVENTS) document.addEventListener(type, resume, { passive: true });
  }
  image(id) { return this.manifest.images[id] || ''; }
  targetVolume(id = this.currentId) {
    const cueVolume = clamp01(Number(ILY.musicVolumes?.[id] ?? 0.4));
    return clamp01(cueVolume * (this.musicVolume / 0.4) * this.masterVolume);
  }
  start(audio) {
    audio.play().catch(() => { this.armGestureUnlock(); });
  }
  reportFailure(id, path) {
    const message = `背景音乐加载失败：${id || path || '未知音轨'}`;
    if (typeof this.onError === 'function') { try { this.onError(message); } catch {} }
    else console.warn(message);
  }
  setMusic(id, { fadeMs = 900 } = {}) {
    const path = this.manifest.bgm[id];
    if (this.currentId === id && this.current === path) { this.play(); return; }
    const previous = this.audio || null;
    const next = path ? new Audio(path) : null;
    const target = this.targetVolume(id);
    const token = ++this.fadeToken;
    this.currentId = id ?? null; this.current = path || null; this.audio = next;
    if (next) {
      next.loop = true; next.preload = 'auto'; next.volume = this.enabled && previous ? 0 : target;
      next.onerror = () => this.reportFailure(id, path);
      if (this.enabled) this.start(next);
    }
    if (!previous) return;
    if (!this.enabled || fadeMs <= 0) { previous.pause(); return; }
    const started = performance.now(), from = previous.volume;
    let finished = false;
    const step = now => {
      if (finished) return;
      if (token !== this.fadeToken) { finished = true; previous.pause(); return; }
      /* 一定要两头夹住：requestAnimationFrame 回调收到的是「本帧开始的时间」，
         可能比排程那一刻的 performance.now() 还早几毫秒。不夹的话第一帧 ratio 会算出
         负数 → next.volume 被赋成负值 → HTMLMediaElement 直接抛 IndexSizeError，
         这个 rAF 回调当场中断、后面的帧再也不会排上 ——
         结果就是旧曲目一直不停、新曲目永远停在音量 0（等于"读档后音乐没切过来"）。
         上限同理：超过 1 会让音量 >1 报错。 */
      const ratio = Math.max(0, Math.min(1, (now - started) / fadeMs));
      previous.volume = Math.max(0, Math.min(1, from * (1 - ratio)));
      if (next) next.volume = Math.max(0, Math.min(1, target * ratio));
      if (ratio < 1) requestAnimationFrame(step); else { finished = true; previous.pause(); }
    };
    requestAnimationFrame(step);
    // 后台标签页里 requestAnimationFrame 会停摆，淡出可能永远收不了尾，
    // 导致新旧两首同时播放。用定时器兜底，保证旧曲目一定会被暂停。
    setTimeout(() => {
      if (finished || token !== this.fadeToken) return;
      finished = true;
      previous.pause();
      // 淡入没跑完时也要把新曲目补到目标音量：淡入的初始音量是 0，
      // 兜底只停旧曲、不补新曲的话，结果就是"旧的不响了、新的也没声"。
      if (next) next.volume = target;
    }, fadeMs + 1200);
  }
  play() {
    if (this.enabled && this.audio && this.audio.paused) this.audio.play().catch(() => {});
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
    const stored = ILY.AudioSettings ? ILY.AudioSettings.setMaster(value) : clamp01(value);
    this.masterVolume = clamp01With(stored, clamp01(value));
    if (this.audio) this.audio.volume = this.targetVolume();
  }
  saveSettings() {
    try { localStorage.setItem(MUSIC_KEY, JSON.stringify({ enabled: this.enabled, musicVolume: this.musicVolume })); } catch {}
  }
}

Object.assign(ILY, { Assets });
})();
