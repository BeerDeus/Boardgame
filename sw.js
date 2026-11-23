// Service worker : jeu jouable hors-ligne (PWA). Incrémenter VERSION à chaque déploiement.
const VERSION = 'grimoire-1795469260';
const PRECACHE = [
"./",
"assets/bg/painting1.jpg",
"assets/bg/painting2.jpg",
"assets/bg/painting3.jpg",
"assets/bg/painting4.jpg",
"assets/fonts/Cinzel-500.woff2",
"assets/fonts/Cinzel-700.woff2",
"assets/fonts/EBGaramond-400.woff2",
"assets/fonts/EBGaramond-400i.woff2",
"assets/fonts/EBGaramond-600.woff2",
"assets/hdri/clarens_night_02.hdr",
"assets/hdri/dark_autumn_forest.hdr",
"assets/icons/icon-192.png",
"assets/icons/icon-512.png",
"assets/icons/maskable-512.png",
"assets/models/Fox.glb",
"assets/models/Horse.glb",
"assets/textures/brown_mud_leaves_01.jpg",
"assets/textures/burned_ground_01.jpg",
"assets/textures/dark_rock.jpg",
"assets/textures/dark_wooden_planks.jpg",
"assets/textures/grass_path_2.jpg",
"assets/textures/leaves_forest_ground.jpg",
"assets/textures/monastery_stone_floor.jpg",
"assets/textures/mossy_brick_floor.jpg",
"assets/textures/mossy_cobblestone.jpg",
"assets/textures/snow_02.jpg",
"css/fonts.css",
"css/hub.css",
"css/paper.css",
"css/play.css",
"index.html",
"js/core/art.js",
"js/core/dialogue.js",
"js/core/engines-meta.js",
"js/core/gestures.js",
"js/core/grid.js",
"js/core/mapgen.js",
"js/core/scenario.js",
"js/core/settings.js",
"js/core/sfx.js",
"js/core/story.js",
"js/core/terrains.js",
"js/core/tween.js",
"js/core/ui.js",
"js/engines/cards.js",
"js/engines/hex.js",
"js/engines/paper.js",
"js/engines/tabletop.js",
"js/main.js",
"js/three/board3d.js",
"js/three/figures.js",
"js/three/impostor.js",
"js/three/props.js",
"js/three/rig.js",
"js/three/stage.js",
"js/three/textures.js",
"manifest.webmanifest",
"play.html",
"vendor/three/LICENSE",
"vendor/three/build/three.core.js",
"vendor/three/build/three.module.js",
"vendor/three/examples/jsm/loaders/GLTFLoader.js",
"vendor/three/examples/jsm/loaders/HDRLoader.js",
"vendor/three/examples/jsm/postprocessing/EffectComposer.js",
"vendor/three/examples/jsm/postprocessing/MaskPass.js",
"vendor/three/examples/jsm/postprocessing/OutputPass.js",
"vendor/three/examples/jsm/postprocessing/Pass.js",
"vendor/three/examples/jsm/postprocessing/RenderPass.js",
"vendor/three/examples/jsm/postprocessing/ShaderPass.js",
"vendor/three/examples/jsm/shaders/CopyShader.js",
"vendor/three/examples/jsm/shaders/HorizontalTiltShiftShader.js",
"vendor/three/examples/jsm/shaders/OutputShader.js",
"vendor/three/examples/jsm/shaders/VerticalTiltShiftShader.js",
"vendor/three/examples/jsm/utils/BufferGeometryUtils.js",
"vendor/three/examples/jsm/utils/SkeletonUtils.js"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// stale-while-revalidate : réponse instantanée depuis le cache, mise à jour en arrière-plan
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
