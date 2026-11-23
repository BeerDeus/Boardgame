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
