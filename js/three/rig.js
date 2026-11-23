// Rig caméra "carte" : pan collé au doigt + inertie, pinch zoom/rotation,
// inclinaison automatique liée au zoom (loin = vue carte, près = vue figurine).
import * as THREE from 'three';
import { clamp, lerp, damp, dampAngle, nearestAngle, ease } from '../core/tween.js';

const tmp = new THREE.Vector3();

export class CameraRig {
  constructor(camera, el, o = {}) {
    this.camera = camera; this.el = el;
    this.o = Object.assign({ minDist: 3, maxDist: 14, pitchNear: 0.6, pitchFar: 1.2, yaw: 0, rotate: true, bounds: null, snapYaw: 0 }, o);
    this.goal = { x: 0, y: 0, z: 0, dist: (this.o.minDist + this.o.maxDist) / 2, yaw: this.o.yaw };
    this.cur = { ...this.goal, pitch: this.autoPitch(this.goal.dist) };
    this.vel = { x: 0, z: 0 }; this.k = 10; this.pitchOverride = null; this.pitchBias = 0;
    this.follow = null; this.dragging = false; this.shakeAmp = 0; this.onSettle = null; this.viewShift = 0; this.curShift = 0;
  }
  autoPitch(d) {
    const t = clamp((d - this.o.minDist) / (this.o.maxDist - this.o.minDist), 0, 1);
    return clamp(lerp(this.o.pitchNear, this.o.pitchFar, ease.inOutSine(t)) + this.pitchBias, 0.15, 1.5);
  }
  worldPerPx() { return (2 * this.cur.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)) / Math.max(1, this.el.clientHeight); }
  screenDelta(dx, dy) {
    const w = this.worldPerPx(), s = Math.max(0.45, Math.sin(this.cur.pitch)), y = this.cur.yaw;
    const a = -dx * w, b = (dy * w) / s;
    return { x: Math.cos(y) * a - Math.sin(y) * b, z: -Math.sin(y) * a - Math.cos(y) * b };
  }
  clampGoal() {
    const b = this.o.bounds; if (!b) return;
    for (const o of [this.goal, this.cur]) { o.x = clamp(o.x, b.minX, b.maxX); o.z = clamp(o.z, b.minZ, b.maxZ); }
  }
  // ---- entrées ----
  panStart() { this.dragging = true; this.vel.x = this.vel.z = 0; this.follow = null; this.k = 12; }
  pan(dx, dy) { const d = this.screenDelta(dx, dy); this.goal.x += d.x; this.goal.z += d.z; this.cur.x += d.x; this.cur.z += d.z; this.clampGoal(); }
  panEnd(vx, vy) {
    this.dragging = false; const d = this.screenDelta(vx, vy);
    const sp = Math.hypot(d.x, d.z), max = this.cur.dist * 2.5;
    const f = sp > max ? max / sp : 1; this.vel.x = d.x * f; this.vel.z = d.z * f;
    this.onRelease?.();
  }
  pinch({ scale, rotate, dx, dy }) {
    this.follow = null;
    this.goal.dist = clamp(this.goal.dist / scale, this.o.minDist, this.o.maxDist);
    if (this.o.rotate) this.goal.yaw += rotate;
    this.pan(dx, dy);
  }
  pinchEnd() {
    if (this.o.snapYaw) { const s = this.o.snapYaw; this.goal.yaw = Math.round(this.goal.yaw / s) * s; }
    this.onRelease?.();
  }
  wheel(delta) { this.goal.dist = clamp(this.goal.dist * Math.exp(delta * 0.0012), this.o.minDist, this.o.maxDist); }
  orbit(dx, dy) { if (this.o.rotate) this.goal.yaw -= dx * 0.006; this.pitchBias = clamp(this.pitchBias + dy * 0.003, -0.45, 0.35); }
  orbitEnd() { this.pinchEnd(); }
  flyTo({ x, y, z, dist, yaw }, k = 5) {
    if (x != null) this.goal.x = x; if (z != null) this.goal.z = z; if (y != null) this.goal.y = y;
    if (dist != null) this.goal.dist = clamp(dist, this.o.minDist * 0.5, this.o.maxDist);
    if (yaw != null) this.goal.yaw = nearestAngle(this.cur.yaw, yaw);
    this.vel.x = this.vel.z = 0; this.follow = null; this.k = k; this.clampGoal();
  }
  jump() { Object.assign(this.cur, this.goal); this.cur.pitch = this.pitchOverride ?? this.autoPitch(this.cur.dist); }
  shake(a = 0.06) { this.shakeAmp = Math.max(this.shakeAmp, a); }
  update(dt) {
    const c = this.cur, g = this.goal;
    if (!this.dragging && (this.vel.x || this.vel.z)) {
      g.x += this.vel.x * dt; g.z += this.vel.z * dt; c.x += this.vel.x * dt; c.z += this.vel.z * dt;
      const f = Math.exp(-4.5 * dt); this.vel.x *= f; this.vel.z *= f;
      if (Math.hypot(this.vel.x, this.vel.z) < 0.01) { this.vel.x = this.vel.z = 0; this.onSettle?.(); }
    }
    if (this.follow) { this.follow.getWorldPosition(tmp); g.x = tmp.x; g.z = tmp.z; }
    this.clampGoal();
    const k = this.k;
    c.x = damp(c.x, g.x, k, dt); c.z = damp(c.z, g.z, k, dt); c.y = damp(c.y, g.y, k, dt);
    c.dist = damp(c.dist, g.dist, k, dt); c.yaw = dampAngle(c.yaw, g.yaw, k, dt);
    c.pitch = damp(c.pitch, this.pitchOverride ?? this.autoPitch(c.dist), k * 0.8, dt);
    this.k = damp(this.k, 10, 0.8, dt);
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    this.camera.position.set(c.x + Math.sin(c.yaw) * cp * c.dist, c.y + sp * c.dist, c.z + Math.cos(c.yaw) * cp * c.dist);
    if (this.shakeAmp > 0.001) {
      const s = this.shakeAmp; this.camera.position.x += (Math.random() - 0.5) * s; this.camera.position.y += (Math.random() - 0.5) * s;
      this.shakeAmp *= Math.exp(-10 * dt);
    }
    this.camera.lookAt(c.x, c.y, c.z);
    // décalage de cadrage (ex : remonter le sujet au-dessus de la boîte de dialogue)
    this.curShift = damp(this.curShift, this.viewShift, 4, dt);
    const W = this.el.clientWidth, H = this.el.clientHeight;
    if (Math.abs(this.curShift) > 0.002) this.camera.setViewOffset(W, H, 0, this.curShift * H, W, H);
    else if (this.camera.view?.enabled) this.camera.clearViewOffset();
  }
}
