// « Impostors » : les vraies figurines 3D pré-rendues sous 8 angles dans une planche de sprites.
// Utilisé par le moteur papier (DOM) : rendu 3D crédible sans WebGL en continu.
import * as THREE from 'three';
import { makeFigure, preloadGLB, applyFinish } from './figures.js';

export async function createBaker(res = 128, N = 8) {
  await preloadGLB();
  const W = Math.round(res * 0.72), H = res;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xbfd0ff, 0x30241a, 1.3));
  const key = new THREE.DirectionalLight(0xffd2a0, 2.6); key.position.set(2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x90a0ff, 1.6); rim.position.set(-2, 2, -3); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(22, W / H, 0.1, 20), pitch = 0.32, d = 2.9;
  cam.position.set(0, 0.5 + Math.sin(pitch) * d, Math.cos(pitch) * d); cam.lookAt(0, 0.5, 0);
  const cache = new Map();
  async function bake(data, finish = 'painted') {
    const k = `${data.kind}|${data.color}|${data.base}|${finish}`;
    if (cache.has(k)) return cache.get(k);
    const p = (async () => {
      const f = await makeFigure(data);
      if (finish !== 'painted') applyFinish(f, finish);
      f.userData.anim?.mixer.update(0.6);
      scene.add(f);
      const c = document.createElement('canvas'); c.width = W * N; c.height = H;
      const ctx = c.getContext('2d');
      for (let i = 0; i < N; i++) { f.rotation.y = (i / N) * Math.PI * 2; r.render(scene, cam); ctx.drawImage(r.domElement, i * W, 0); }
      scene.remove(f);
      f.traverse(m => { if (m.isMesh) { m.geometry.dispose(); [].concat(m.material).forEach(x => x.dispose()); } });
      const blob = await new Promise(res2 => c.toBlob(res2));
      return { url: URL.createObjectURL(blob), N, W, H };
    })();
    cache.set(k, p); return p;
  }
  /** Portrait (gros plan visage) rendu depuis le modèle 3D */
  async function portrait(data, size = 160) {
    const f = await makeFigure({ ...data, name: '' });
    f.userData.anim?.mixer.update(0.3);
    const box = new THREE.Box3().setFromObject(f.userData.inner), h = box.max.y;
    const pc = new THREE.PerspectiveCamera(24, 1, 0.05, 20), ty = h * (data.kind === 'fox' || data.kind === 'horse' ? 0.6 : 0.74), d = h * 1.05;
    pc.position.set(d * 0.32, ty + d * 0.12, d); pc.lookAt(0, ty, 0);
    f.rotation.y = 0.15; scene.add(f);
    r.setSize(size, size); r.render(scene, pc);
    const url = r.domElement.toDataURL('image/png');
    scene.remove(f); r.setSize(W, H);
    return url;
  }
  return { bake, portrait, N, dispose: () => r.dispose() };
}
