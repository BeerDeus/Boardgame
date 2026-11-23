// Scène Three.js commune : renderer, éclairage, HDRI, brouillard, particules, boucle, picking.
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { updateTweens, tween, ease } from '../core/tween.js';
import { Gestures } from '../core/gestures.js';
import { CameraRig } from './rig.js';
import { radialTexture } from './textures.js';

export const TOD = {
  dusk: { env: 'dark_autumn_forest', envInt: 0.55, bgInt: 0.5, blur: 0.4, exposure: 1.05, sun: 0xffb27a, sunInt: 2.6, sunPos: [-6, 7, 4], sky: 0x8090b0, ground: 0x2a2018, hemi: 0.45, fog: 0x2a2622, fogD: 0.035, part: 0xffa040, torch: 1.0 },
  night: { env: 'clarens_night_02', envInt: 0.28, bgInt: 0.9, blur: 0.3, exposure: 1.15, sun: 0x8fa4ff, sunInt: 1.0, sunPos: [5, 9, -3], sky: 0x2a3a5c, ground: 0x0c0c12, hemi: 0.35, fog: 0x0a0e16, fogD: 0.045, part: 0xb8ff6a, torch: 1.8 },
};

export async function createStage(container, o = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov || 40, 1, 0.1, 300);
  const rig = new CameraRig(camera, renderer.domElement, o.rig);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.5);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.FogExp2(0x222222, 0.03);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envCache = {};
  const loadEnv = async name => envCache[name] ||= new HDRLoader().loadAsync(`assets/hdri/${name}.hdr`).then(t => { const e = pmrem.fromEquirectangular(t).texture; t.dispose(); return e; });

  const stage = {
    THREE, renderer, scene, camera, rig, sun, hemi, updates: new Set(), torches: [], composer: null, res: 1, tod: 'dusk',
    onTap: null, onLongPress: null, onFps: null,
    fitShadow(b, pad = 1.5) {
      const s = sun.shadow.camera, w = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2 + pad;
      s.left = -w; s.right = w; s.top = w; s.bottom = -w; s.near = 0.5; s.far = 60; s.updateProjectionMatrix();
    },
    async setTimeOfDay(name, instant = false) {
      const p = TOD[name]; stage.tod = name;
      const env = await loadEnv(p.env);
      const from = { e: renderer.toneMappingExposure, s: sun.intensity, h: hemi.intensity, ei: scene.environmentIntensity ?? 1, f: scene.fog.density, bi: scene.backgroundIntensity };
      const cs = sun.color.clone(), ch = hemi.color.clone(), cg = hemi.groundColor.clone(), cf = scene.fog.color.clone();
      const ts = new THREE.Color(p.sun), th = new THREE.Color(p.sky), tg = new THREE.Color(p.ground), tf = new THREE.Color(p.fog);
      const sp0 = sun.position.clone(), sp1 = new THREE.Vector3(...p.sunPos);
      scene.environment = env;
      const swapBg = () => { scene.background = o.background === false ? null : env; scene.backgroundBlurriness = p.blur; };
      if (instant || !scene.background) swapBg();
      if (stage.particles) stage.particles.material.color.set(p.part);
      await tween({ duration: instant ? 0.0001 : 1.2, ease: ease.inOutSine, update: k => {
        if (k > 0.5 && !instant) swapBg();
        renderer.toneMappingExposure = from.e + (p.exposure - from.e) * k;
        sun.intensity = from.s + (p.sunInt - from.s) * k; hemi.intensity = from.h + (p.hemi - from.h) * k;
        scene.environmentIntensity = from.ei + (p.envInt - from.ei) * k; scene.backgroundIntensity = (from.bi ?? p.bgInt) + (p.bgInt - (from.bi ?? p.bgInt)) * k;
        scene.fog.density = from.f + (p.fogD - from.f) * k;
        sun.color.lerpColors(cs, ts, k); hemi.color.lerpColors(ch, th, k); hemi.groundColor.lerpColors(cg, tg, k); scene.fog.color.lerpColors(cf, tf, k);
        sun.position.lerpVectors(sp0, sp1, k);
        stage.torchBoost = 1 + (p.torch - 1) * k;
      } });
    },
    addTorch(pos, color = 0xff8a3a, power = 2.2) {
      const light = new THREE.PointLight(color, power, 3.2, 1.8);
      light.position.copy(pos); light.userData.base = power; scene.add(light); stage.torches.push(light);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('#ffcf7a', '#ff6a1a'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      fl.position.copy(pos); fl.scale.setScalar(0.22); scene.add(fl);
      light.userData.flame = fl; return light;
    },
    setParticles(v) { if (stage.particles) stage.particles.visible = v; },
    setShadows(v) { sun.castShadow = v; renderer.shadowMap.enabled = v; scene.traverse(m => { if (m.material) [].concat(m.material).forEach(x => (x.needsUpdate = true)); }); },
    setResolution(r) { stage.res = r; resize(); },
    pick(x, y, objects) {
      const r = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
      return ray.intersectObjects(objects, true)[0] || null;
    },
    groundAt(x, y, h = 0) {
      const r = renderer.domElement.getBoundingClientRect(); const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
      return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), new THREE.Vector3());
    },
    createParticles(b, count = 180) {
      const g = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), ph = new Float32Array(count);
      const W = b.maxX - b.minX + 2, D = b.maxZ - b.minZ + 2;
      for (let i = 0; i < count; i++) { pos[i * 3] = b.minX - 1 + Math.random() * W; pos[i * 3 + 1] = Math.random() * 2.5; pos[i * 3 + 2] = b.minZ - 1 + Math.random() * D; ph[i] = Math.random() * 10; }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({ size: 0.05, map: radialTexture('#ffffff', '#ffffff'), color: TOD[stage.tod].part, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
      const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); stage.particles = p;
      stage.updates.add((dt, t) => {
        if (!p.visible) return;
        for (let i = 0; i < count; i++) {
          pos[i * 3 + 1] += dt * (0.12 + (ph[i] % 1) * 0.15);
          pos[i * 3] += Math.sin(t * 0.7 + ph[i]) * dt * 0.08;
          if (pos[i * 3 + 1] > 2.6) pos[i * 3 + 1] = 0;
        }
        g.attributes.position.needsUpdate = true;
        m.opacity = 0.65 + Math.sin(t * 3) * 0.15;
      });
    },
  };
  stage.torchBoost = 1;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * stage.res);
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    stage.composer?.setPixelRatio(renderer.getPixelRatio()); stage.composer?.setSize(w, h);
    stage.onResize?.(w, h);
  }
  new ResizeObserver(resize).observe(container); resize();

  // Gestes -> caméra / picking
  stage.gestures = new Gestures(renderer.domElement, {
    onPanStart: () => rig.panStart(), onPan: (dx, dy) => rig.pan(dx, dy), onPanEnd: (vx, vy) => rig.panEnd(vx, vy),
    onPinch: p => rig.pinch(p), onPinchEnd: () => rig.pinchEnd(), onWheel: d => rig.wheel(d),
    onOrbit: (dx, dy) => rig.orbit(dx, dy), onOrbitEnd: () => rig.orbitEnd(),
    onTap: (x, y) => stage.onTap?.(x, y), onLongPress: (x, y) => stage.onLongPress?.(x, y),
    onDoubleTap: (x, y) => { const p = stage.groundAt(x, y); if (p) rig.flyTo({ x: p.x, z: p.z, dist: rig.goal.dist * 0.55 }, 6); },
  });

  // Boucle
  const timer = new THREE.Timer(); let frames = 0, acc = 0;
  renderer.setAnimationLoop(time => {
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.05), t = timer.getElapsed();
    updateTweens(dt);
    for (const f of stage.updates) f(dt, t);
    for (const l of stage.torches) {
      const f = 0.82 + Math.sin(t * 11 + l.id) * 0.08 + Math.sin(t * 23 + l.id * 3) * 0.06 + Math.random() * 0.06;
      l.intensity = l.userData.base * f * stage.torchBoost; l.userData.flame.scale.setScalar(0.2 * f);
    }
    rig.update(dt);
    if (stage.composer) stage.composer.render(dt); else renderer.render(scene, camera);
    frames++; acc += dt; if (acc > 0.5) { stage.onFps?.(Math.round(frames / acc)); frames = 0; acc = 0; }
  });
  return stage;
}
