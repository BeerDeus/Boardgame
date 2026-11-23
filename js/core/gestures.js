// Reconnaissance de gestes unifiée souris / tactile.
// 1 doigt : pan (avec inertie) · 2 doigts : pinch zoom + rotation + pan · tap / double-tap / appui long
// Souris : clic gauche = pan, clic droit (ou Shift) = orbite, molette = zoom.
const TAP_DIST = 9, TAP_TIME = 380, LONG_TIME = 550, DOUBLE_TIME = 300;

export class Gestures {
  constructor(el, h) {
    this.el = el; this.h = h; this.ptrs = new Map(); this.mode = null; this.hist = []; this.lastTap = null;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this._down = e => this.down(e));
    el.addEventListener('pointermove', this._move = e => this.move(e));
    el.addEventListener('pointerup', this._up = e => this.up(e));
    el.addEventListener('pointercancel', this._up);
    el.addEventListener('wheel', this._wheel = e => { e.preventDefault(); h.onWheel?.(e.deltaY * (e.deltaMode === 1 ? 30 : 1), e.clientX, e.clientY); }, { passive: false });
    el.addEventListener('contextmenu', this._ctx = e => e.preventDefault());
  }
  dispose() {
    const el = this.el;
    el.removeEventListener('pointerdown', this._down); el.removeEventListener('pointermove', this._move);
    el.removeEventListener('pointerup', this._up); el.removeEventListener('pointercancel', this._up);
    el.removeEventListener('wheel', this._wheel); el.removeEventListener('contextmenu', this._ctx);
  }
  pinchState() {
    const [a, b] = [...this.ptrs.values()];
    return { d: Math.hypot(b.x - a.x, b.y - a.y) || 1, a: Math.atan2(b.y - a.y, b.x - a.x), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  down(e) {
    try { this.el.setPointerCapture(e.pointerId); } catch {}
    const now = performance.now();
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: now });
    if (this.ptrs.size === 1) {
      this.mode = 'maybeTap';
      this.alt = e.button === 2 || e.shiftKey;
      this.hist = [{ x: e.clientX, y: e.clientY, t: now }];
      this.h.onDown?.(e.clientX, e.clientY);
      clearTimeout(this.longT);
      this.longT = setTimeout(() => { if (this.mode === 'maybeTap') { this.mode = 'done'; this.h.onLongPress?.(e.clientX, e.clientY); } }, LONG_TIME);
    } else if (this.ptrs.size === 2) {
      clearTimeout(this.longT);
      if (this.mode === 'pan') this.h.onPanEnd?.(0, 0);
      this.mode = 'pinch'; this.pinch = this.pinchState();
    }
  }
  move(e) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    const now = performance.now();
    if (this.mode === 'maybeTap') {
      if (Math.hypot(p.x - p.sx, p.y - p.sy) < TAP_DIST) return;
      clearTimeout(this.longT);
      this.mode = this.alt ? 'orbit' : 'pan';
      if (this.mode === 'pan') { this.h.onPanStart?.(); this.h.onPan?.(p.x - p.sx, p.y - p.sy); }
      else this.h.onOrbit?.(p.x - p.sx, p.y - p.sy);
      return;
    }
    if (this.mode === 'pan') {
      this.h.onPan?.(dx, dy);
      this.hist.push({ x: p.x, y: p.y, t: now });
      while (this.hist.length > 2 && now - this.hist[0].t > 90) this.hist.shift();
    } else if (this.mode === 'orbit') this.h.onOrbit?.(dx, dy);
    else if (this.mode === 'pinch' && this.ptrs.size >= 2) {
      const s = this.pinchState();
      let rot = s.a - this.pinch.a; if (rot > Math.PI) rot -= Math.PI * 2; if (rot < -Math.PI) rot += Math.PI * 2;
      this.h.onPinch?.({ scale: s.d / this.pinch.d, rotate: rot, dx: s.cx - this.pinch.cx, dy: s.cy - this.pinch.cy, cx: s.cx, cy: s.cy });
      this.pinch = s;
    }
  }
  up(e) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    this.ptrs.delete(e.pointerId); clearTimeout(this.longT);
    const now = performance.now();
    if (this.mode === 'maybeTap' && this.ptrs.size === 0) {
      if (now - p.t < TAP_TIME) {
        if (this.lastTap && now - this.lastTap.t < DOUBLE_TIME && Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 30) {
          this.lastTap = null; this.h.onDoubleTap?.(p.x, p.y);
        } else { this.lastTap = { t: now, x: p.x, y: p.y }; this.h.onTap?.(p.x, p.y); }
      }
      this.mode = null;
    } else if (this.mode === 'pan') {
      const a = this.hist[0], b = this.hist[this.hist.length - 1];
      const dt = Math.max(1, b.t - a.t) / 1000;
      const fresh = now - b.t < 60;
      this.h.onPanEnd?.(fresh ? (b.x - a.x) / dt : 0, fresh ? (b.y - a.y) / dt : 0);
      this.mode = null;
    } else if (this.mode === 'orbit') { this.h.onOrbitEnd?.(); this.mode = null; }
    else if (this.mode === 'pinch') {
      this.h.onPinchEnd?.();
      if (this.ptrs.size === 1) { // reprise du pan avec le doigt restant
        const q = [...this.ptrs.values()][0];
        this.mode = 'pan'; this.hist = [{ x: q.x, y: q.y, t: now }]; this.h.onPanStart?.();
      } else this.mode = null;
    } else if (this.ptrs.size === 0) this.mode = null;
  }
}
