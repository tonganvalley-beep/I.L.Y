/* Reusable Canvas patterns. No DOM/audio clock dependency; host supplies seconds.
 * UMD permits file:// <script> use and Node tests without build tools. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ILYPatterns = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const palette = ['#55caff', '#c69aff', '#6af0ce', '#ff87bd', '#8caaff', '#f6ce87'];
  function circleRect(p, r) {
    return Math.hypot(p.x - clamp(p.x, r.x, r.x + r.w), p.y - clamp(p.y, r.y, r.y + r.h)) <= p.r;
  }
  function inside(p, box) {
    return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h;
  }
  // Two ON intervals, separated by an OFF interval, then a final OFF interval.
  function areaState(event, now) {
    const age = now - event.t;
    const totalWarn = event.pulse * 2;
    if (age < 0) return { phase: 'pending', flash: false, count: 0, age };
    if (age < totalWarn) return { phase: 'warning', flash: age % event.pulse < event.pulse * .58,
      count: Math.min(2, Math.floor(age / event.pulse) + 1), age };
    const activeAge = age - totalWarn;
    if (activeAge < event.hold) return { phase: 'active', flash: false, count: 2, age, activeAge };
    if (activeAge < event.hold + event.fade) return { phase: 'fade', age, activeAge,
      alpha: 1 - (activeAge - event.hold) / event.fade };
    return { phase: 'done', age };
  }
  function flowerPoint(event, group, ray, age) {
    const dir = event.direction === 'alternating' ? (group % 2 ? -1 : 1) : event.direction === 'cw' ? 1 : -1;
    let radius;
    if (event.motion === 'return') {
      // Quadratic radial path: velocity starts positive, crosses zero at the
      // midpoint, then becomes negative. endRadius controls the resting radius.
      const u = clamp(age / event.returnDuration, 0, 1);
      radius = event.radius + (event.endRadius - event.radius) * u
        + event.speed * event.returnDuration * u * (1 - u);
    } else if (event.motion === 'collapse') {
      const activeAge = Math.max(0, age - event.collapseDelay);
      radius = Math.max(0, event.radius - event.speed * activeAge);
    } else radius = event.radius + event.speed * age;
    const angle = ray * TAU / event.count + group * event.offset + dir * event.omega * age;
    return { x: event.x + Math.cos(angle) * radius, y: event.y + Math.sin(angle) * radius, angle };
  }
  // Default placeholder skin: local coordinates, positive X runs along the long axis.
  // Host may replace this with a sprite animation; gameplay hitbox stays the full rectangle.
  function blueTendrils(ctx, local) {
    const { length, breadth, progress, activeAge, seed } = local;
    const reach = length * progress;
    ctx.fillStyle = 'rgba(32,112,220,.10)'; ctx.fillRect(0, 0, reach, breadth);
    for (let strand = 0; strand < 13; strand++) {
      const base = breadth * (.10 + strand / 12 * .80);
      ctx.beginPath();
      for (let step = 0; step <= 65; step++) {
        const x = reach * step / 65, u = x / length;
        const envelope = Math.sin(Math.PI * u) * breadth;
        const y = clamp(base + envelope * (.15 * Math.sin(u * 23 + strand * 1.73 + activeAge * 9 + seed)
          + .09 * Math.sin(u * 51 - strand * .91 - activeAge * 5)), 3, breadth - 3);
        if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = strand % 3 ? '#2999f5' : '#93eaff'; ctx.lineWidth = strand % 3 ? 1.7 : 2.5;
      ctx.stroke();
    }
    ctx.fillStyle = '#d1f6ff'; ctx.fillRect(Math.max(0, reach - 3), 3, 3, breadth - 6);
  }
  function captionSkin(ctx, { rect, text, activeAge }) {
    ctx.fillStyle = 'rgba(255,57,100,.13)'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let size = Math.min(36, rect.h * .55);
    ctx.font = `900 ${size}px "Microsoft YaHei",sans-serif`;
    size *= Math.min(1, (rect.w - 30) / Math.max(1, ctx.measureText(text).width));
    ctx.font = `900 ${size}px "Microsoft YaHei",sans-serif`;
    const y = rect.y + rect.h / 2;
    // Initial 90 ms is a one-shot registration offset, not repeated flicker.
    if (activeAge < .09) { ctx.fillStyle = '#ff4068'; ctx.fillText(text, rect.x + rect.w / 2 + 3, y - 2); }
    ctx.fillStyle = '#fff4f6'; ctx.fillText(text, rect.x + rect.w / 2, y);
  }
  class PatternSystem {
    constructor({ box, drawTentacles = blueTendrils, drawCaption = captionSkin, warningImage = null } = {}) {
      this.box = box || { x: 180, y: 120, w: 600, h: 300 };
      this.skins = { tentacle: drawTentacles, caption: drawCaption };
      this.warningImage = warningImage;
      this.events = []; this.time = 0; this.nextId = 1;
    }
    clear() { this.events.length = 0; this.time = 0; this.nextId = 1; }
    setSkin(kind, renderer) {
      if (!['tentacle', 'caption'].includes(kind) || typeof renderer !== 'function') throw Error('Invalid skin');
      this.skins[kind] = renderer;
    }
    spawnTentacle({ t = this.time, axis = 'horizontal', position = .5, thickness = 76,
      from = 'start', pulse = .48, hold = 1.15, extend = .25, seed = 0, damage = 8 } = {}) {
      const b = this.box, horizontal = axis === 'horizontal';
      const breadth = clamp(thickness, 20, Math.min(b.w, b.h) * .65);
      const rect = horizontal ? { x: b.x, y: b.y + (b.h - breadth) * clamp(position, 0, 1), w: b.w, h: breadth }
        : { x: b.x + (b.w - breadth) * clamp(position, 0, 1), y: b.y, w: breadth, h: b.h };
      return this.addArea({ kind: 'tentacle', t, rect, axis, from, pulse, hold, extend, seed, damage });
    }
    spawnCaption({ t = this.time, rect = { x: 360, y: 200, w: 280, h: 80 }, text = '你还在听吗？',
      pulse = .48, hold = 2.6, damage = 8 } = {}) {
      const b = this.box, w = clamp(rect.w, 40, b.w), h = clamp(rect.h, 30, b.h);
      const fitted = { x: clamp(rect.x, b.x, b.x + b.w - w), y: clamp(rect.y, b.y, b.y + b.h - h), w, h };
      return this.addArea({ kind: 'caption', t, rect: fitted, text: String(text), pulse, hold, damage });
    }
    addArea(e) {
      if (!(e.pulse > 0 && e.hold > 0)) throw Error('Positive warning/hold required');
      const event = { ...e, id: this.nextId++, fade: .24 }; this.events.push(event); return event;
    }
    spawnFlower({ t = this.time, x = this.box.x + this.box.w / 2, y = this.box.y + this.box.h / 2,
      center = null, groups = 6, count = 16, gap = .23, speed = 55, omega = .9, direction = 'alternating',
      motion = 'expand', returnDuration = 3.2, endRadius = null, collapseDelay = .35,
      offset = .16, radius = 10, bulletRadius = 3.3, life = 5.5, damage = 4 } = {}) {
      if (!['cw', 'ccw', 'alternating'].includes(direction)) throw Error('Invalid direction');
      if (!['expand', 'return', 'collapse'].includes(motion)) throw Error('Invalid flower motion');
      // center accepts a heart-like {x,y}; capture it at spawn so a collapse
      // attack remains deterministic even when the player moves afterwards.
      if (center && Number.isFinite(center.x) && Number.isFinite(center.y)) { x = center.x; y = center.y; }
      const event = { kind: 'flower', id: this.nextId++, t, x, y, motion,
        groups: clamp(Math.round(groups), 1, 12),
        count: clamp(Math.round(count), 4, 32), gap: Math.max(.05, gap), speed: Math.max(1, speed),
        omega, direction, offset, radius, endRadius: endRadius == null ? radius : Math.max(0, endRadius),
        returnDuration: Math.max(.05, returnDuration), collapseDelay: Math.max(0, collapseDelay),
        bulletRadius, life: Math.max(life, motion === 'return' ? returnDuration : collapseDelay + radius / Math.max(1, speed)), damage };
      this.events.push(event); return event;
    }
    update(now) {
      this.time = now;
      this.events = this.events.filter(e => e.kind === 'flower' ? now < e.t + (e.groups - 1) * e.gap + e.life
        : areaState(e, now).phase !== 'done');
    }
    *bullets(now = this.time) {
      for (const e of this.events) if (e.kind === 'flower') for (let group = 0; group < e.groups; group++) {
        const age = now - e.t - group * e.gap;
        if (age < 0 || age >= e.life) continue;
        for (let ray = 0; ray < e.count; ray++) {
          const p = flowerPoint(e, group, ray, age);
          if (inside(p, this.box)) yield { ...p, r: e.bulletRadius, color: palette[group % palette.length], e, group, ray, age };
        }
      }
    }
    collision(heart, now = this.time) {
      // The whole red area becomes hazardous at attack onset, including gaps between line strands/glyphs.
      for (const e of this.events) if (e.kind !== 'flower' && areaState(e, now).phase === 'active'
        && circleRect(heart, e.rect)) return { id: e.id, damage: e.damage, kind: e.kind };
      for (const p of this.bullets(now)) if (Math.hypot(p.x - heart.x, p.y - heart.y) <= p.r + heart.r)
        return { id: p.e.id, damage: p.e.damage, kind: 'flower' };
      return null;
    }
    draw(ctx, now = this.time, { hitboxes = false } = {}) {
      const b = this.box;
      ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
      for (const e of this.events) {
        if (e.kind === 'flower') continue;
        const s = areaState(e, now), r = e.rect;
        if (s.phase === 'pending' || s.phase === 'done') continue;
        ctx.save();
        if (s.phase === 'warning') {
          ctx.strokeStyle = s.flash ? '#ff3756' : '#572333'; ctx.lineWidth = s.flash ? 3 : 1;
          ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
          if (s.flash) {
            const image = this.warningImage;
            if (image && image.complete && image.naturalWidth) {
              const h = Math.min(42, r.h - 10), w = h * image.naturalWidth / image.naturalHeight;
              ctx.globalAlpha = .45 + .35 * Math.sin(s.age * 18) ** 2;
              ctx.drawImage(image, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
            }
            // The real Flowey ring is a secondary reference layer. Canvas authors the required warning glyph.
            ctx.globalAlpha = 1; ctx.fillStyle = '#ff3756'; ctx.font = '900 34px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('!', r.x + r.w / 2, r.y + r.h / 2);
          }
        } else {
          ctx.globalAlpha = s.phase === 'fade' ? s.alpha : 1;
          ctx.fillStyle = e.kind === 'tentacle' ? 'rgba(38,133,243,.12)' : 'rgba(255,58,105,.09)';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.strokeStyle = e.kind === 'tentacle' ? '#368cef' : '#ef4b78'; ctx.lineWidth = 2;
          ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
          ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
          if (e.kind === 'tentacle') {
            ctx.translate(r.x, r.y);
            if (e.axis === 'vertical') { ctx.translate(r.w, 0); ctx.rotate(Math.PI / 2); }
            const length = e.axis === 'horizontal' ? r.w : r.h, breadth = e.axis === 'horizontal' ? r.h : r.w;
            if (e.from === 'end') { ctx.translate(length, 0); ctx.scale(-1, 1); }
            this.skins.tentacle(ctx, { length, breadth, progress: clamp(s.activeAge / e.extend, 0, 1),
              activeAge: s.activeAge, seed: e.seed, event: e });
          } else this.skins.caption(ctx, { rect: r, text: e.text, activeAge: s.activeAge, event: e });
        }
        ctx.restore();
        if (hitboxes && s.phase === 'active') { ctx.save(); ctx.fillStyle = 'rgba(255,196,96,.17)';
          ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore(); }
      }
      for (const p of this.bullets(now)) {
        // Analytic trails are visual only; they never alter collisions or accumulate during pause.
        ctx.beginPath();
        for (let k = 0; k <= 5; k++) {
          const q = flowerPoint(p.e, p.group, p.ray, Math.max(0, p.age - .12 + k * .024));
          if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        ctx.strokeStyle = p.color; ctx.globalAlpha = .35; ctx.lineWidth = p.r * 1.2; ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#eaf8ff'; ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      ctx.restore();
    }
  }
  return { PatternSystem, areaState, flowerPoint, circleRect, blueTendrils, captionSkin };
});
