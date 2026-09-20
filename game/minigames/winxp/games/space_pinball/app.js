// ============================================================================
// 三维弹球（3D Pinball: Space Cadet）
// 基于开源项目 jmanuelcorral/pinball（MIT 许可，纯 HTML5 Canvas + 原生 JS）整合而来。
// 原作者保留 MIT 版权；本文件将其 8 个 ES 模块合并为单一脚本以适配 iframe / 离线运行，
// 并汉化了标题与提示文案、加入 iframe 尺寸自适应。玩法与原版一致：
//   左挡板 Z/←、右挡板 //→、发射器 ↓ / 点击画布（按住蓄力松开发射）；空格与回车用于开始/继续。
// ============================================================================
(function () {
  'use strict';

  // ───────────────────────── constants.js ─────────────────────────
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 700;

  const PHYSICS_STEP = 1 / 120;
  const GRAVITY = 900;
  const BALL_RADIUS = 7;
  const BALL_MAX_SPEED = 1400;
  // 边界墙完全弹性碰撞（e=1.0）：球碰到边界不损失能量、干净弹回，绝不会被“吸”住或漏出。
  const WALL_RESTITUTION = 1.0;
  const BUMPER_RESTITUTION = 1.5; // 保险杠仍作为加分助推器（故意 >1），非边界
  const SLINGSHOT_RESTITUTION = 1.0;
  const FLIPPER_RESTITUTION = 0.85;

  // 挡板长度：52→71。pivot 仍固定在两侧滑槽(112/268)，加长使两 tip 向中心多伸，
  // 静止时中间缺口由 66px 收窄到 ~33px（减半），边上守住、中间只留够不到的小缝。
  const FLIPPER_LENGTH = 71;
  const FLIPPER_THICKNESS = 4;
  const FLIPPER_REST_ANGLE_L = Math.PI / 6;
  const FLIPPER_ACTIVE_ANGLE_L = -Math.PI / 3.5;
  const FLIPPER_ANGULAR_SPEED = 18;

  const PLUNGER_MAX_PULL = 70;
  const PLUNGER_CHARGE_SPEED = 160;
  const PLUNGER_LAUNCH_FORCE = 1600;

  const STARTING_LIVES = 3;
  const DRAIN_Y = 670;
  const BALL_LOST_DELAY = 1.2;
  const GAME_OVER_DELAY = 2.5;

  const POINTS = {
    BUMPER: 100,
    TARGET: 500,
    ROLLOVER: 250,
    SLINGSHOT: 10,
  };

  const COLORS = {
    bg:             '#06061a',
    tableSurface:   '#0e0e30',
    wall:           '#3355cc',
    wallGlow:       '#5577ee',
    ball:           '#d8d8e8',
    ballShine:      '#ffffff',
    flipper:        '#ff8800',
    flipperPivot:   '#ffaa44',
    bumper:  ['#ff1166', '#00ee88', '#ffaa00'],
    bumperRing:     '#ffffff',
    bumperFlash:    '#ffffff',
    target:         '#ffee33',
    targetDim:      '#554400',
    rollover:       '#44ddff',
    rolloverDim:    '#113344',
    slingshot:      '#ff4488',
    plunger:        '#ee3300',
    plungerTrack:   '#1a1a2a',
    scoreText:      '#00ffcc',
    livesText:      '#ff8800',
    titlePrimary:   '#ff6600',
    titleSecondary: '#00ffcc',
    uiText:         '#aaaacc',
    star:           '#ffffff',
    drain:          '#000000',
  };

  // ───────────────────────── input.js ─────────────────────────
  class InputManager {
    constructor(canvas) {
      this._held = new Set();
      this._pressed = new Set();
      this._released = new Set();
      this._pointerHeld = false;
      this._pointerReleased = false;

      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        this._held.add(e.code);
        this._pressed.add(e.code);
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
      });

      window.addEventListener('keyup', (e) => {
        this._held.delete(e.code);
        this._released.add(e.code);
      });

      // 鼠标 / 触摸在画布上按住发射，松开发射（与 ↓ 等价；空格仅用于开始/继续）
      if (canvas && canvas.addEventListener) {
        const down = (e) => { e.preventDefault(); this._pointerHeld = true; };
        const up = () => { if (this._pointerHeld) { this._pointerHeld = false; this._pointerReleased = true; } };
        canvas.addEventListener('pointerdown', down);
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointerleave', up);
        canvas.addEventListener('pointercancel', up);
      }
    }

    isDown(code) { return this._held.has(code); }
    wasPressed(code) { return this._pressed.has(code); }
    wasReleased(code) { return this._released.has(code); }

    get leftFlipper() {
      return this.isDown('KeyZ') || this.isDown('ArrowLeft') || this.isDown('ShiftLeft');
    }
    get rightFlipper() {
      return this.isDown('Slash') || this.isDown('ArrowRight') || this.isDown('ShiftRight');
    }
    get plungerHeld() {
      return this.isDown('ArrowDown') || this._pointerHeld;
    }
    get plungerReleased() {
      return this.wasReleased('ArrowDown') || this._pointerReleased;
    }
    get startPressed() {
      return this.wasPressed('Space') || this.wasPressed('Enter');
    }

    update() {
      this._pressed.clear();
      this._released.clear();
      this._pointerReleased = false;
    }
  }

  // ───────────────────────── entities.js ─────────────────────────
  class Ball {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.radius = BALL_RADIUS;
      this.active = true;
      this.trail = [];
    }

    update(dt) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 6) this.trail.shift();

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > BALL_MAX_SPEED) {
        const scale = BALL_MAX_SPEED / speed;
        this.vx *= scale;
        this.vy *= scale;
      }
    }

    reset(x, y) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.active = true;
      this.trail = [];
    }
  }

  class Flipper {
    constructor(px, py, side) {
      this.px = px;
      this.py = py;
      this.side = side;
      this.length = FLIPPER_LENGTH;
      this.thickness = FLIPPER_THICKNESS;

      if (side === 'left') {
        this.restAngle = FLIPPER_REST_ANGLE_L;
        this.activeAngle = FLIPPER_ACTIVE_ANGLE_L;
      } else {
        this.restAngle = Math.PI - FLIPPER_REST_ANGLE_L;
        this.activeAngle = Math.PI - FLIPPER_ACTIVE_ANGLE_L;
      }

      this.angle = this.restAngle;
      this.angularVelocity = 0;
    }

    update(dt, activated) {
      const target = activated ? this.activeAngle : this.restAngle;
      const dir = Math.sign(target - this.angle);

      if (dir === 0) {
        this.angularVelocity = 0;
        return;
      }

      this.angularVelocity = dir * FLIPPER_ANGULAR_SPEED;
      this.angle += this.angularVelocity * dt;

      if (this.side === 'left') {
        this.angle = Math.max(this.activeAngle, Math.min(this.restAngle, this.angle));
      } else {
        this.angle = Math.min(this.activeAngle, Math.max(this.restAngle, this.angle));
      }

      if (this.angle === this.restAngle || this.angle === this.activeAngle) {
        this.angularVelocity = 0;
      }
    }

    get tip() {
      return {
        x: this.px + Math.cos(this.angle) * this.length,
        y: this.py + Math.sin(this.angle) * this.length,
      };
    }

    get segment() {
      const t = this.tip;
      return { x1: this.px, y1: this.py, x2: t.x, y2: t.y };
    }
  }

  class Bumper {
    constructor(x, y, radius, colorIndex = 0) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.colorIndex = colorIndex;
      this.hitTimer = 0;
    }
    onHit() { this.hitTimer = 0.15; }
    update(dt) { if (this.hitTimer > 0) this.hitTimer -= dt; }
  }

  class Wall {
    constructor(x1, y1, x2, y2, restitution = null, isSlingshot = false, oneWayNormal = null) {
      this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
      this.restitution = restitution;
      this.isSlingshot = isSlingshot;
      this.oneWayNormal = oneWayNormal;
      this.hitTimer = 0;
    }
    onHit() { if (this.isSlingshot) this.hitTimer = 0.1; }
    update(dt) { if (this.hitTimer > 0) this.hitTimer -= dt; }
  }

  class Target {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.isHit = false;
      this.hitTimer = 0;
    }
    onHit() { this.isHit = true; this.hitTimer = 0.2; }
    update(dt) { if (this.hitTimer > 0) this.hitTimer -= dt; }
    reset() { this.isHit = false; }
  }

  class Rollover {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.isLit = false;
      this.cooldown = 0;
    }
    onHit() { this.isLit = true; this.cooldown = 0.5; }
    update(dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      else this.isLit = false;
    }
  }

  class Plunger {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.compression = 0;
      this.maxCompression = PLUNGER_MAX_PULL;
      this.chargeSpeed = PLUNGER_CHARGE_SPEED;
      this.launchForce = PLUNGER_LAUNCH_FORCE;
      this.isCharging = false;
    }
    charge(dt) {
      this.isCharging = true;
      this.compression = Math.min(this.compression + this.chargeSpeed * dt, this.maxCompression);
    }
    release() {
      const power = this.compression / this.maxCompression;
      this.compression = 0;
      this.isCharging = false;
      return -this.launchForce * power;
    }
    reset() { this.compression = 0; this.isCharging = false; }
  }

  // ───────────────────────── table.js ─────────────────────────
  function generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * 400,
        y: Math.random() * 700,
        brightness: 0.3 + Math.random() * 0.7,
        size: Math.random() < 0.15 ? 2 : 1,
        twinkleSpeed: 1 + Math.random() * 3,
      });
    }
    return stars;
  }

  function createTable() {
    const walls = [
      new Wall(30, 100, 80, 35),
      new Wall(80, 35, 300, 35),
      new Wall(300, 35, 342, 50),
      new Wall(342, 50, 383, 62),
      new Wall(383, 62, 383, 660),
      // 发射道与盘面的分隔墙：实心（y=110 以下整段）。y=50~110 为开口，
      // 上升的球经顶部实心导板（342,50-383,62）被向左打进盘面。
      // 发射道底部（原 347,660-383,660）故意不封：回落/误入的球直接 drain，不会卡在发射道。
      new Wall(342, 110, 342, 660),
      new Wall(30, 100, 30, 555),
      new Wall(30, 555, 112, 628),
      new Wall(342, 555, 268, 628),
      new Wall(112, 628, 112, 660),
      new Wall(268, 628, 268, 660),
      new Wall(30, 660, 112, 660),
      new Wall(268, 660, 342, 660),
      new Wall(55, 460, 55, 538, SLINGSHOT_RESTITUTION, true),
      new Wall(55, 538, 112, 592, SLINGSHOT_RESTITUTION, true),
      new Wall(325, 460, 325, 538, SLINGSHOT_RESTITUTION, true),
      new Wall(325, 538, 268, 592, SLINGSHOT_RESTITUTION, true),
      new Wall(120, 55, 120, 110),
      new Wall(190, 55, 190, 110),
      new Wall(260, 55, 260, 110),
    ];

    const bumpers = [
      new Bumper(148, 240, 22, 0),
      new Bumper(232, 240, 22, 1),
      new Bumper(190, 175, 22, 2),
    ];

    const targets = [
      new Target(42, 195, 14, 28),
      new Target(42, 240, 14, 28),
      new Target(42, 285, 14, 28),
      new Target(324, 195, 14, 28),
      new Target(324, 240, 14, 28),
    ];

    const rollovers = [
      new Rollover(133, 60, 20, 45),
      new Rollover(203, 60, 20, 45),
      new Rollover(273, 60, 20, 45),
    ];

    // 挡板 pivot 贴两侧滑槽（112 / 268），向盘面内伸展：
    // 左挡板覆盖 x≈112~157，右挡板覆盖 x≈223~268，中间 x≈157~223 为挡板够不到的缺口（漏球区）。
    // 这样球从两侧滑槽下来会被挡板接住（边上不会掉），只有落在中间缺口才会漏下。
    const flippers = [
      new Flipper(112, 628, 'left'),
      new Flipper(268, 628, 'right'),
    ];

    const plunger = new Plunger(363, 630);
    const ballStart = { x: 363, y: 580 };
    const stars = generateStars(90);

    return { walls, bumpers, targets, rollovers, flippers, plunger, ballStart, stars };
  }

  // ───────────────────────── physics.js ─────────────────────────
  class PhysicsEngine {
    step(ball, table, scoring, dt) {
      const events = [];
      let drained = false;

      if (!ball.active) return { drained: false, scored: events };

      for (const b of table.bumpers) b.update(dt);
      for (const t of table.targets) t.update(dt);
      for (const r of table.rollovers) r.update(dt);
      for (const w of table.walls) w.update(dt);

      // 子步进：把一帧拆成若干子步，保证每步位移 ≤ ~3px，彻底杜绝高速穿墙（球再快也钻不出边界）。
      const sub = Math.max(1, Math.ceil((BALL_MAX_SPEED * dt) / 3));
      const sdt = dt / sub;
      for (let s = 0; s < sub; s++) {
        ball.vy += GRAVITY * sdt;
        ball.update(sdt);

        for (const wall of table.walls) {
          const rest = wall.restitution ?? WALL_RESTITUTION;
          if (this._ballVsSegment(ball, wall.x1, wall.y1, wall.x2, wall.y2, rest, wall.oneWayNormal)) {
            wall.onHit();
            if (wall.isSlingshot) events.push({ type: 'slingshot', points: POINTS.SLINGSHOT });
          }
        }

        for (const bumper of table.bumpers) {
          if (this._ballVsCircle(ball, bumper.x, bumper.y, bumper.radius, BUMPER_RESTITUTION)) {
            bumper.onHit();
            // 随机扰动：每次撞保险杠给一点随机切向速度，避免每局轨迹完全一样
            const a = Math.random() * Math.PI * 2;
            const kick = 15;
            ball.vx += Math.cos(a) * kick;
            ball.vy += Math.sin(a) * kick;
            events.push({ type: 'bumper', points: POINTS.BUMPER });
          }
        }

        for (const flipper of table.flippers) {
          this._ballVsFlipper(ball, flipper);
        }

        for (const target of table.targets) {
          if (!target.isHit) {
            if (this._ballVsRect(ball, target)) {
              target.onHit();
              events.push({ type: 'target', points: POINTS.TARGET });
            }
          }
        }

        for (const rollover of table.rollovers) {
          if (rollover.cooldown <= 0) {
            if (this._pointInRect(ball.x, ball.y, rollover)) {
              rollover.onHit();
              events.push({ type: 'rollover', points: POINTS.ROLLOVER });
            }
          }
        }

        // 画布边缘作为完全弹性兜底：万一球到达边缘，按 e=1.0 干净弹回（实际有实体边界墙，很少触发）。
        if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx); }
        if (ball.x + ball.radius > CANVAS_WIDTH) { ball.x = CANVAS_WIDTH - ball.radius; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy = Math.abs(ball.vy); }

        if (ball.y - ball.radius > DRAIN_Y) {
          ball.active = false;
          drained = true;
          break;
        }
      }

      if (table.targets.every(t => t.isHit)) {
        for (const t of table.targets) t.reset();
        events.push({ type: 'target_reset', points: 1000 });
      }

      return { drained, scored: events };
    }

    _closestPointOnSegment(px, py, ax, ay, bx, by) {
      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 0.0001) return { x: ax, y: ay, t: 0 };
      let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      return { x: ax + t * dx, y: ay + t * dy, t };
    }

    _ballVsSegment(ball, x1, y1, x2, y2, restitution, oneWayNormal = null) {
      const c = this._closestPointOnSegment(ball.x, ball.y, x1, y1, x2, y2);
      const dx = ball.x - c.x;
      const dy = ball.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ball.radius && dist > 0.0001) {
        if (oneWayNormal) {
          const dot = ball.vx * oneWayNormal.nx + ball.vy * oneWayNormal.ny;
          if (dot >= 0) return false;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = ball.radius - dist;
        ball.x += nx * (overlap + 0.5);
        ball.y += ny * (overlap + 0.5);

        const velDotN = ball.vx * nx + ball.vy * ny;
        if (velDotN < 0) {
          ball.vx -= (1 + restitution) * velDotN * nx;
          ball.vy -= (1 + restitution) * velDotN * ny;
        }
        return true;
      }
      return false;
    }

    _ballVsCircle(ball, cx, cy, cRadius, restitution) {
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = ball.radius + cRadius;

      if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        ball.x += nx * (overlap + 0.5);
        ball.y += ny * (overlap + 0.5);

        const velDotN = ball.vx * nx + ball.vy * ny;
        if (velDotN < 0) {
          ball.vx -= (1 + restitution) * velDotN * nx;
          ball.vy -= (1 + restitution) * velDotN * ny;
        }

        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < 300) {
          ball.vx += nx * 250;
          ball.vy += ny * 250;
        }
        return true;
      }
      return false;
    }

    _ballVsFlipper(ball, flipper) {
      const seg = flipper.segment;
      const c = this._closestPointOnSegment(ball.x, ball.y, seg.x1, seg.y1, seg.x2, seg.y2);
      const dx = ball.x - c.x;
      const dy = ball.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = ball.radius + FLIPPER_THICKNESS;

      if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        ball.x += nx * (overlap + 0.5);
        ball.y += ny * (overlap + 0.5);

        const contactDist = c.t * flipper.length;
        const flipperSpeed = flipper.angularVelocity * contactDist;
        const perpX = -Math.sin(flipper.angle);
        const perpY = Math.cos(flipper.angle);
        const fvx = flipperSpeed * perpX;
        const fvy = flipperSpeed * perpY;

        const relVx = ball.vx - fvx;
        const relVy = ball.vy - fvy;
        const relDotN = relVx * nx + relVy * ny;

        if (relDotN < 0) {
          ball.vx -= (1 + FLIPPER_RESTITUTION) * relDotN * nx;
          ball.vy -= (1 + FLIPPER_RESTITUTION) * relDotN * ny;
          ball.vx += fvx * 0.3;
          ball.vy += fvy * 0.3;
        }
        return true;
      }
      return false;
    }

    _ballVsRect(ball, rect) {
      const cx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
      const cy = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ball.radius) {
        if (dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = ball.radius - dist;
          ball.x += nx * (overlap + 0.5);
          ball.y += ny * (overlap + 0.5);
          const velDotN = ball.vx * nx + ball.vy * ny;
          if (velDotN < 0) {
            ball.vx -= (1 + WALL_RESTITUTION) * velDotN * nx;
            ball.vy -= (1 + WALL_RESTITUTION) * velDotN * ny;
          }
        }
        return true;
      }
      return false;
    }

    _pointInRect(px, py, rect) {
      return px >= rect.x && px <= rect.x + rect.w &&
             py >= rect.y && py <= rect.y + rect.h;
    }
  }

  // ───────────────────────── scoring.js ─────────────────────────
  class ScoringSystem {
    constructor() {
      this.score = 0;
      this.lives = STARTING_LIVES;
      this.multiplier = 1;
      this.highScore = this._loadHighScore();
      this._pendingPoints = [];
    }
    addPoints(points) {
      const earned = points * this.multiplier;
      this.score += earned;
      this._pendingPoints.push({ value: earned, timer: 1.0 });
      return earned;
    }
    loseLife() {
      this.lives = Math.max(0, this.lives - 1);
      this.multiplier = 1;
    }
    get isGameOver() { return this.lives <= 0; }
    bumpMultiplier() { this.multiplier = Math.min(this.multiplier + 1, 5); }
    reset() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this._saveHighScore();
      }
      this.score = 0;
      this.lives = STARTING_LIVES;
      this.multiplier = 1;
      this._pendingPoints = [];
    }
    update(dt) {
      for (const p of this._pendingPoints) p.timer -= dt;
      this._pendingPoints = this._pendingPoints.filter(p => p.timer > 0);
    }
    _loadHighScore() {
      try { return parseInt(localStorage.getItem('pinball_highscore') || '0', 10); }
      catch { return 0; }
    }
    _saveHighScore() {
      try { localStorage.setItem('pinball_highscore', String(this.highScore)); }
      catch { /* localStorage unavailable — ignore */ }
    }
  }

  // ───────────────────────── renderer.js ─────────────────────────
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      // 高分辨率背板（超采样），让霓虹/渐变更细腻
      this._ss = (typeof window !== 'undefined' && window.devicePixelRatio && window.devicePixelRatio > 1)
        ? Math.min(2, window.devicePixelRatio) : 2;
      canvas.width = Math.round(CANVAS_WIDTH * this._ss);
      canvas.height = Math.round(CANVAS_HEIGHT * this._ss);
      this.ctx.scale(this._ss, this._ss);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.lineJoin = 'round';
      this._time = 0;
    }

    render(state, table, ball, scoring, dt) {
      this._time += dt;
      const ctx = this.ctx;

      this._drawBackdrop(ctx);
      this._drawStars(ctx, table.stars);
      this._drawTableSurface(ctx);

      for (const wall of table.walls) this._drawWall(ctx, wall);
      this._drawSlingshots(ctx, table.walls);

      for (const r of table.rollovers) this._drawRollover(ctx, r);
      for (const bumper of table.bumpers) this._drawBumper(ctx, bumper);
      for (const target of table.targets) this._drawTarget(ctx, target);
      for (const flipper of table.flippers) this._drawFlipper(ctx, flipper);

      this._drawPlunger(ctx, table.plunger);

      if (ball.active) this._drawBall(ctx, ball);

      this._drawHUD(ctx, scoring, state);

      if (state === 'TITLE') this._drawTitleScreen(ctx);
      else if (state === 'GAME_OVER') this._drawGameOver(ctx, scoring);
      else if (state === 'BALL_LOST') this._drawBallLost(ctx, scoring);
    }

    _drawStars(ctx, stars) {
      for (const star of stars) {
        const flicker = Math.sin(this._time * star.twinkleSpeed) * 0.3 + 0.7;
        const alpha = Math.min(1, star.brightness * flicker);
        if (star.size >= 2) {
          ctx.save();
          ctx.shadowColor = 'rgba(180,200,255,0.9)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = `rgba(205,220,255,${alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
          ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
        }
      }
    }

    _drawTableSurface(ctx) {
      const g = ctx.createLinearGradient(30, 35, 342, 660);
      g.addColorStop(0, '#1b1b4e');
      g.addColorStop(0.5, '#0e0e30');
      g.addColorStop(1, '#171742');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(30, 100);
      ctx.lineTo(80, 35);
      ctx.lineTo(300, 35);
      ctx.lineTo(342, 50);
      ctx.lineTo(342, 125);
      ctx.lineTo(342, 660);
      ctx.lineTo(30, 660);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.28;
      const ig = ctx.createRadialGradient(190, 320, 20, 190, 320, 210);
      ig.addColorStop(0, 'rgba(92,122,255,0.55)');
      ig.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ig;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#0b0b22';
      ctx.fillRect(343, 50, 40, 612);
    }

    _drawWall(ctx, wall) {
      if (wall.isSlingshot) {
        ctx.strokeStyle = wall.hitTimer > 0 ? '#ff7ab0' : COLORS.wall;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();
        return;
      }

      ctx.save();
      ctx.shadowColor = COLORS.wallGlow;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = COLORS.wallGlow;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = COLORS.wall;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }

    _drawSlingshots(ctx, walls) {
      const leftSlings = walls.filter(w => w.isSlingshot && w.x1 < 190);
      const rightSlings = walls.filter(w => w.isSlingshot && w.x1 > 190);

      for (const group of [leftSlings, rightSlings]) {
        if (group.length < 2) continue;
        const isHit = group.some(w => w.hitTimer > 0);
        ctx.fillStyle = isHit ? 'rgba(255,68,136,0.35)' : 'rgba(51,85,204,0.15)';
        ctx.beginPath();
        ctx.moveTo(group[0].x1, group[0].y1);
        ctx.lineTo(group[0].x2, group[0].y2);
        ctx.lineTo(group[1].x2, group[1].y2);
        ctx.closePath();
        ctx.fill();
      }
    }

    _drawBumper(ctx, bumper) {
      const hit = bumper.hitTimer > 0;
      const color = COLORS.bumper[bumper.colorIndex] || COLORS.bumper[0];

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = hit ? 24 : 12;
      const g = ctx.createRadialGradient(
        bumper.x - bumper.radius * 0.3, bumper.y - bumper.radius * 0.3, bumper.radius * 0.2,
        bumper.x, bumper.y, bumper.radius
      );
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.28, color);
      g.addColorStop(1, this._darken(color));
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.globalAlpha = hit ? 1 : 0.92;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius + (hit ? 4 : 2.5), 0, Math.PI * 2);
      ctx.strokeStyle = hit ? '#ffffff' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = hit ? 3 : 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = hit ? '#fff' : 'rgba(255,255,255,0.85)';
      ctx.fill();

      if (hit) {
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, bumper.radius + 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
      }
    }

    _drawFlipper(ctx, flipper) {
      const seg = flipper.segment;
      const angle = flipper.angle;
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      const baseW = 7;
      const tipW = 3;

      ctx.save();
      ctx.shadowColor = 'rgba(255,140,0,0.8)';
      ctx.shadowBlur = 10;
      const g = ctx.createLinearGradient(seg.x1, seg.y1, seg.x2, seg.y2);
      g.addColorStop(0, '#ffd27a');
      g.addColorStop(1, '#ff7a00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(seg.x1 + perpX * baseW, seg.y1 + perpY * baseW);
      ctx.lineTo(seg.x1 - perpX * baseW, seg.y1 - perpY * baseW);
      ctx.lineTo(seg.x2 - perpX * tipW, seg.y2 - perpY * tipW);
      ctx.lineTo(seg.x2 + perpX * tipW, seg.y2 + perpY * tipW);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(flipper.px, flipper.py, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.flipperPivot;
      ctx.fill();
    }

    _drawTarget(ctx, target) {
      ctx.save();
      if (!target.isHit) {
        ctx.shadowColor = 'rgba(255,238,51,0.6)';
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = target.isHit ? COLORS.targetDim : COLORS.target;
      this._roundRect(ctx, target.x, target.y, target.w, target.h, 3);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = target.isHit ? '#332200' : '#ffcc00';
      ctx.lineWidth = 1;
      this._roundRect(ctx, target.x, target.y, target.w, target.h, 3);
      ctx.stroke();

      if (target.hitTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${(target.hitTimer * 5).toFixed(2)})`;
        this._roundRect(ctx, target.x, target.y, target.w, target.h, 3);
        ctx.fill();
      }
    }

    _drawRollover(ctx, rollover) {
      const lit = rollover.isLit;
      ctx.save();
      if (lit) {
        ctx.shadowColor = 'rgba(68,221,255,0.8)';
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = lit ? COLORS.rollover : COLORS.rolloverDim;
      ctx.globalAlpha = lit ? 0.75 : 0.32;

      const cx = rollover.x + rollover.w / 2;
      const cy = rollover.y + rollover.h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, rollover.y);
      ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx, rollover.y + rollover.h);
      ctx.lineTo(cx - 6, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (lit) {
        ctx.fillStyle = COLORS.rollover;
        ctx.beginPath();
        ctx.moveTo(cx - 3, rollover.y + rollover.h + 2);
        ctx.lineTo(cx + 3, rollover.y + rollover.h + 2);
        ctx.lineTo(cx, rollover.y + rollover.h + 7);
        ctx.closePath();
        ctx.fill();
      }
    }

    _drawPlunger(ctx, plunger) {
      const trackX = plunger.x - 8;
      const trackW = 16;
      const trackH = 60;
      const trackY = plunger.y - 15;

      ctx.fillStyle = '#15151f';
      this._roundRect(ctx, trackX, trackY, trackW, trackH, 6);
      ctx.fill();

      const headY = plunger.y + plunger.compression * 0.6;

      ctx.strokeStyle = '#7a7a8a';
      ctx.lineWidth = 1.5;
      const springTop = headY + 4;
      const springBottom = trackY + trackH - 2;
      const springSegments = 6;
      if (springBottom > springTop) {
        const segH = (springBottom - springTop) / springSegments;
        ctx.beginPath();
        for (let i = 0; i < springSegments; i++) {
          const sy = springTop + i * segH;
          const sx = (i % 2 === 0) ? trackX + 4 : trackX + trackW - 4;
          const ex = (i % 2 === 0) ? trackX + trackW - 4 : trackX + 4;
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          ctx.lineTo(ex, sy + segH);
        }
        ctx.stroke();
      }

      const g = ctx.createLinearGradient(trackX + 2, headY - 8, trackX + trackW - 2, headY + 4);
      g.addColorStop(0, '#ff6a4a');
      g.addColorStop(1, '#c01a00');
      ctx.fillStyle = g;
      this._roundRect(ctx, trackX + 2, headY - 8, trackW - 4, 12, 4);
      ctx.fill();
    }

    _drawBall(ctx, ball) {
      for (let i = 0; i < ball.trail.length; i++) {
        const t = ball.trail[i];
        const a = (i / ball.trail.length) * 0.22;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius * (0.5 + 0.4 * i / ball.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,200,255,${a.toFixed(2)})`;
        ctx.fill();
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      const g = ctx.createRadialGradient(
        ball.x - ball.radius * 0.4, ball.y - ball.radius * 0.4, ball.radius * 0.1,
        ball.x, ball.y, ball.radius
      );
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, '#dfe4f5');
      g.addColorStop(0.75, '#9aa3c4');
      g.addColorStop(1, '#5b6488');
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(ball.x - ball.radius * 0.35, ball.y - ball.radius * 0.35, ball.radius * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ball.x + ball.radius * 0.3, ball.y + ball.radius * 0.3, ball.radius * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,160,255,0.4)';
      ctx.fill();
    }

    _drawHUD(ctx, scoring, state) {
      if (state === 'TITLE') return;

      ctx.save();
      ctx.shadowColor = 'rgba(0,255,204,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = COLORS.scoreText;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(scoring.score.toLocaleString(), 190, 22);
      ctx.restore();

      ctx.fillStyle = COLORS.uiText;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`HI ${scoring.highScore.toLocaleString()}`, 34, 15);

      ctx.fillStyle = COLORS.livesText;
      ctx.textAlign = 'right';
      for (let i = 0; i < scoring.lives; i++) {
        ctx.beginPath();
        ctx.arc(335 - i * 16, 12, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (scoring.multiplier > 1) {
        ctx.fillStyle = COLORS.titlePrimary;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`×${scoring.multiplier}`, 190, 648);
      }
    }

    _drawTitleScreen(ctx) {
      ctx.fillStyle = 'rgba(6,6,26,0.85)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.textAlign = 'center';

      ctx.save();
      ctx.shadowColor = 'rgba(255,102,0,0.7)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = COLORS.titlePrimary;
      ctx.font = 'bold 34px monospace';
      ctx.fillText('3D', 200, 230);
      ctx.fillText('PINBALL', 200, 270);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(0,255,204,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = COLORS.titleSecondary;
      ctx.font = '14px monospace';
      ctx.fillText('SPACE CADET', 200, 312);
      ctx.restore();

      ctx.fillStyle = COLORS.uiText;
      ctx.font = '12px monospace';
      ctx.fillText('Z / ← ：左挡板', 200, 392);
      ctx.fillText('/ / → ：右挡板', 200, 414);
      ctx.fillText('↓ / 点击画布 ：发射小球', 200, 436);

      const blink = Math.sin(this._time * 4) > 0;
      if (blink) {
        ctx.fillStyle = COLORS.titlePrimary;
        ctx.font = 'bold 16px monospace';
        ctx.fillText('按 空格 开始', 200, 516);
      }
    }

    _drawGameOver(ctx, scoring) {
      ctx.fillStyle = 'rgba(6,6,26,0.8)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.titlePrimary;
      ctx.font = 'bold 30px monospace';
      ctx.fillText('游戏结束', 200, 290);

      ctx.fillStyle = COLORS.scoreText;
      ctx.font = '18px monospace';
      ctx.fillText(`得分: ${scoring.score.toLocaleString()}`, 200, 340);

      if (scoring.score >= scoring.highScore && scoring.score > 0) {
        ctx.fillStyle = COLORS.titlePrimary;
        ctx.font = 'bold 14px monospace';
        ctx.fillText('★ 新纪录 ★', 200, 370);
      }

      const blink = Math.sin(this._time * 4) > 0;
      if (blink) {
        ctx.fillStyle = COLORS.uiText;
        ctx.font = '14px monospace';
        ctx.fillText('按 空格 继续', 200, 440);
      }
    }

    _drawBallLost(ctx, scoring) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.titlePrimary;
      ctx.font = 'bold 20px monospace';
      ctx.globalAlpha = 0.8;
      ctx.fillText('失去小球', 190, 350);
      ctx.globalAlpha = 1;
    }

    _drawBackdrop(ctx) {
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bg.addColorStop(0, '#0a0a2e');
      bg.addColorStop(0.5, '#06061a');
      bg.addColorStop(1, '#0a0a24');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const neb = ctx.createRadialGradient(200, 320, 40, 200, 320, 380);
      neb.addColorStop(0, 'rgba(86,64,170,0.38)');
      neb.addColorStop(0.5, 'rgba(40,30,96,0.18)');
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    _darken(hex) {
      const m = /^#([0-9a-f]{6})$/i.exec(hex);
      if (!m) return hex;
      const n = parseInt(m[1], 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      r = Math.floor(r * 0.45); g = Math.floor(g * 0.45); b = Math.floor(b * 0.45);
      return `rgb(${r},${g},${b})`;
    }

    _roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    resize() {
      const ratio = CANVAS_WIDTH / CANVAS_HEIGHT;
      let w = window.innerWidth;
      let h = window.innerHeight;

      if (w / h > ratio) {
        w = Math.floor(h * ratio);
      } else {
        h = Math.floor(w / ratio);
      }

      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    }
  }

  // ───────────────────────── game.js ─────────────────────────
  class Game {
    constructor(canvas) {
      this.input = new InputManager(canvas);
      this.physics = new PhysicsEngine();
      this.renderer = new Renderer(canvas);
      this.scoring = new ScoringSystem();
      this.table = createTable();

      this.ball = new Ball(this.table.ballStart.x, this.table.ballStart.y);
      this.ball.active = false;
      this.state = 'TITLE';
      this._stateTimer = 0;
      this._lastTime = 0;
      this._accumulator = 0;
    }

    start() {
      this.renderer.resize();
      window.addEventListener('resize', () => this.renderer.resize());

      const loop = (timestamp) => {
        // 外壳最小化或外层剧情菜单打开时，ILY_HOST_PAUSED 置真 → 冻结循环（不推进物理、不渲染新帧）
        if (window.ILY_HOST_PAUSED) { this._lastTime = timestamp; this._accumulator = 0; requestAnimationFrame(loop); return; }
        const frameTime = Math.min((timestamp - this._lastTime) / 1000, 0.05);
        this._lastTime = timestamp;
        this._accumulator += frameTime;

        while (this._accumulator >= PHYSICS_STEP) {
          this._tick(PHYSICS_STEP);
          this._accumulator -= PHYSICS_STEP;
        }

        this.renderer.render(this.state, this.table, this.ball, this.scoring, frameTime);
        this.input.update();
        requestAnimationFrame(loop);
      };

      requestAnimationFrame((ts) => {
        this._lastTime = ts;
        requestAnimationFrame(loop);
      });
    }

    _tick(dt) {
      switch (this.state) {
        case 'TITLE':     this._tickTitle(dt);    break;
        case 'READY':     this._tickReady(dt);    break;
        case 'PLAYING':   this._tickPlaying(dt);  break;
        case 'BALL_LOST': this._tickBallLost(dt); break;
        case 'GAME_OVER': this._tickGameOver(dt); break;
      }
    }

    _tickTitle(dt) {
      if (this.input.startPressed) {
        this.scoring.reset();
        this._enterReady();
      }
    }

    _tickReady(dt) {
      const plunger = this.table.plunger;
      this.ball.x = plunger.x;
      this.ball.y = plunger.y - 20 + plunger.compression * 0.6;
      this.ball.vx = 0;
      this.ball.vy = 0;

      if (this.input.plungerHeld) plunger.charge(dt);

      if (this.input.plungerReleased) {
        if (plunger.compression > 2) {
          // 实心边界方案：球竖直上升，由顶部实心导板（342,50-383,62）向左打进盘面。
          // 随机扰动：发射力度 ±4%、纵向速度 ±20，使每次发射的轨迹都不一样。
          const power = Math.max(plunger.compression / plunger.maxCompression, 0.70) * (1 + (Math.random() * 2 - 1) * 0.04);
          plunger.release();
          this.ball.vy = -plunger.launchForce * power + (Math.random() * 2 - 1) * 20;
          this.ball.vx = 0; // 竖直上升，由顶部导板导入盘面
          this.ball.active = true;
          this.state = 'PLAYING';
        } else {
          plunger.reset();
        }
      }

      for (const f of this.table.flippers) {
        const active = f.side === 'left' ? this.input.leftFlipper : this.input.rightFlipper;
        f.update(dt, active);
      }
    }

    _tickPlaying(dt) {
      for (const f of this.table.flippers) {
        const active = f.side === 'left' ? this.input.leftFlipper : this.input.rightFlipper;
        f.update(dt, active);
      }

      const result = this.physics.step(this.ball, this.table, this.scoring, dt);

      for (const evt of result.scored) {
        this.scoring.addPoints(evt.points);
        if (evt.type === 'target_reset') this.scoring.bumpMultiplier();
      }

      this.scoring.update(dt);

      if (result.drained) {
        this.scoring.loseLife();
        this._stateTimer = BALL_LOST_DELAY;
        this.state = 'BALL_LOST';
      }
    }

    _tickBallLost(dt) {
      this._stateTimer -= dt;
      for (const f of this.table.flippers) f.update(dt, false);

      if (this._stateTimer <= 0) {
        if (this.scoring.isGameOver) {
          this._stateTimer = GAME_OVER_DELAY;
          this.state = 'GAME_OVER';
        } else {
          this._enterReady();
        }
      }
    }

    _tickGameOver(dt) {
      this._stateTimer -= dt;
      if (this._stateTimer <= 0 && this.input.startPressed) {
        if (this.scoring.score > this.scoring.highScore) {
          this.scoring.highScore = this.scoring.score;
          this.scoring._saveHighScore();
        }
        this.state = 'TITLE';
      }
    }

    _enterReady() {
      const start = this.table.ballStart;
      this.ball.reset(start.x, start.y);
      this.table.plunger.reset();
      for (const t of this.table.targets) t.reset();
      this.state = 'READY';
    }
  }

  // ───────────────────────── bootstrap ─────────────────────────
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  game.start();

  // iframe 尺寸变化时让画布自适应铺满
  if (typeof window.ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => game.renderer.resize());
    ro.observe(document.documentElement);
  }
})();
