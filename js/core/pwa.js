// Enregistrement du service worker + mise à jour automatique (sans réinstaller la PWA).
export function registerPWA({ onStatus } = {}) {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  let reloading = false;
  // une nouvelle version prend le contrôle → on recharge une seule fois
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !navigator.serviceWorker.controller) return;
    reloading = true;
    try { sessionStorage.setItem('grimoire.updated', '1'); } catch {}
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    const check = () => reg.update().catch(() => {});
    // vérifie à chaque retour sur l'app et toutes les 15 min
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 15 * 60 * 1000);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) w.postMessage('skipWaiting'); });
    });
    navigator.serviceWorker.ready.then(() => onStatus?.('ready'));
  }).catch(e => onStatus?.('error', e));
}
export function consumeUpdatedFlag() {
  try { const v = sessionStorage.getItem('grimoire.updated'); sessionStorage.removeItem('grimoire.updated'); return !!v; } catch { return false; }
}

/** Mise à jour forcée : re-télécharge chaque fichier en écrasant le cache HTTP du navigateur
 *  (cache: 'reload'), vide le cache de l'app, met à jour le service worker, puis recharge. */
export async function hardRefresh(onProgress = () => {}) {
  let files = [];
  try { files = await (await fetch('files.json', { cache: 'no-store' })).json(); } catch {}
  files = files.filter(f => f !== './');
  let done = 0;
  const queue = [...files];
  const worker = async () => { while (queue.length) { const f = queue.shift(); try { await fetch(f, { cache: 'reload' }); } catch {} onProgress(++done / Math.max(1, files.length)); } };
  await Promise.all(Array.from({ length: 6 }, worker));
  try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
  try { for (const r of await navigator.serviceWorker?.getRegistrations?.() || []) await r.update(); } catch {}
  const u = new URL(location.href); u.searchParams.set('maj', Date.now()); location.replace(u);
}
