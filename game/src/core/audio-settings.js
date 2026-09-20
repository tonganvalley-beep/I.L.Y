(() => {
'use strict';
/* 总音量（主音量）单一真相来源：音乐与语音共享，持久化到 localStorage，
   使三个音量滑块（音乐 / 语音 / 总）的乘积即为实际播放音量。 */
const KEY = 'ily-audio-master-v1';
const clamp = v => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
let master = 1;
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (typeof saved === 'number') master = clamp(saved);
} catch {}

function getMaster() { return master; }
function setMaster(value) {
  master = clamp(value);
  try { localStorage.setItem(KEY, JSON.stringify(master)); } catch {}
  return master;
}

Object.assign(ILY, { AudioSettings: { getMaster, setMaster } });
})();
