// Service worker — mises à jour automatiques, jeu jouable hors-ligne.
//  • Code (HTML/JS/CSS/manifest) : RÉSEAU D'ABORD (revalidé à chaque chargement), cache seulement hors-ligne.
//  • Assets lourds (modèles, textures, HDRI, polices) : cache d'abord + rafraîchissement en arrière-plan.
//  • Le navigateur vérifie sw.js à chaque visite (updateViaCache: 'none') ; nouvelle version = activée
//    immédiatement et la page se recharge toute seule. Aucune réinstallation nécessaire.
const VERSION = 'grimoire-1795622120';
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
"assets/maps/prologue-v1.jpg",
"assets/models/Fox.glb",
"assets/models/Horse.glb",
"assets/models/kaykit/Barbarian.glb",
"assets/models/kaykit/Knight.glb",
"assets/models/kaykit/LICENSE.txt",
"assets/models/kaykit/Mage.glb",
"assets/models/kaykit/Rogue.glb",
"assets/models/kaykit/Rogue_Hooded.glb",
"assets/models/kaykit/Skeleton_Axe.glb",
"assets/models/kaykit/Skeleton_Blade.glb",
"assets/models/kaykit/Skeleton_Mage.glb",
"assets/models/kaykit/Skeleton_Minion.glb",
"assets/models/kaykit/Skeleton_Rogue.glb",
"assets/models/kaykit/Skeleton_Shield_Small_A.glb",
"assets/models/kaykit/Skeleton_Staff.glb",
"assets/models/kaykit/Skeleton_Warrior.glb",
"assets/poi/marqueur-elevation.svg",
"assets/poi/medaillon-place.svg",
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
"cards.html",
"css/editor.css",
"css/fonts.css",
"css/hub.css",
"css/play.css",
"editor.html",
"index.html",
"js/core/art.js",
"js/core/campaign.js",
"js/core/cards.js",
"js/core/dialogue.js",
"js/core/engines-meta.js",
"js/core/gestures.js",
"js/core/grid.js",
"js/core/heroes.js",
"js/core/icons.js",
"js/core/level-check.js",
"js/core/level.js",
"js/core/mapgen.js",
"js/core/monsters.js",
"js/core/poi-art.js",
"js/core/portraits.js",
"js/core/pwa.js",
"js/core/scenario.js",
"js/core/settings.js",
"js/core/sfx.js",
"js/core/stat-icons.js",
"js/core/stats.js",
"js/core/terrains.js",
"js/core/tween.js",
"js/core/ui.js",
"js/editor/campaign.js",
"js/editor/dialogue-tree.js",
"js/editor/fields.js",
"js/editor/github.js",
"js/editor/guide.js",
"js/editor/heroes-panel.js",
"js/editor/main.js",
"js/editor/map.js",
"js/engines/hex.js",
"js/main.js",
"js/three/board3d.js",
"js/three/figures.js",
"js/three/impostor.js",
"js/three/poi.js",
"js/three/props.js",
"js/three/rig.js",
"js/three/stage.js",
"js/three/textures.js",
"js/version.js",
"levels/campaign.json",
"levels/heroes.json",
"levels/prologue.json",
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

const CODE = /\.(html|js|mjs|css|webmanifest|json)$|\/$/;

self.addEventListener('install', e => {
  // pré-cache tolérant : un fichier manquant ne bloque plus l'installation
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isCode = req.mode === 'navigate' || CODE.test(url.pathname);
  e.respondWith(isCode ? networkFirst(req) : staleWhileRevalidate(req));
});

// Le CDN de l'hébergeur garde parfois d'anciennes copies d'une même URL : on ajoute la version
// du build dans l'URL (?v=) pour chaque fichier de code (imports imbriqués compris).
function bust(req) {
  if (req.mode === 'navigate') return req;
  const u = new URL(req.url);
  if (u.searchParams.has('t')) return req;
  u.searchParams.set('v', VERSION.replace('grimoire-', ''));
  return u.href;
}
async function networkFirst(req) {
  const c = await caches.open(VERSION);
  try {
    const r = await fetch(bust(req), { cache: 'no-cache' }); // revalidation serveur (ETag/304)
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch {
    return (await c.match(req, { ignoreSearch: true })) || Response.error();
  }
}
async function staleWhileRevalidate(req) {
  const c = await caches.open(VERSION);
  const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}
